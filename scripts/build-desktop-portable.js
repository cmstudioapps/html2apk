"use strict";

const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, "dist-desktop");
const portableName = /^[a-z0-9._-]+$/i.test(process.env.HTML2APK_PORTABLE_NAME || "")
  ? process.env.HTML2APK_PORTABLE_NAME
  : "html2apk-portable";
const portableDir = path.join(outputRoot, portableName);
const appDir = path.join(portableDir, "resources", "app");
const electronDist = path.join(root, "node_modules", "electron", "dist");
const executablePath = path.join(portableDir, "html2apk.exe");
const sourceIconPng = path.join(root, "html2apk.png");
const iconOutputDir = path.join(outputRoot, ".icon-ico");
const windowsIconPath = path.join(iconOutputDir, "html2apk.ico");
const rceditPath = path.join(root, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");
const legacyDesktopDirs = [
  path.join(outputRoot, "win-unpacked"),
  path.join(outputRoot, ".icon-ico")
];
const legacyExeFiles = [
  path.join(root, "dist", "html2apk.exe"),
  path.join(outputRoot, "html2apk.exe")
];

const appEntries = [
  "bin",
  "src",
  "node_modules",
  "index.js",
  "package-lock.json",
  "README.md",
  "html2apk.png"
];

const POWERSHELL_ICON_SCRIPT = `
param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Destination
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$sourceImage = [System.Drawing.Image]::FromFile($Source)

try {
  $frames = @()

  foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = New-Object System.IO.MemoryStream

    try {
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
      $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      $frames += [PSCustomObject]@{
        Size = $size
        Bytes = $stream.ToArray()
      }
    } finally {
      $stream.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }

  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($Destination)) | Out-Null
  $file = [System.IO.File]::Create($Destination)
  $writer = New-Object System.IO.BinaryWriter($file)

  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$frames.Count)

    $offset = 6 + (16 * $frames.Count)

    foreach ($frame in $frames) {
      $sizeByte = if ($frame.Size -ge 256) { 0 } else { $frame.Size }
      $writer.Write([Byte]$sizeByte)
      $writer.Write([Byte]$sizeByte)
      $writer.Write([Byte]0)
      $writer.Write([Byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$frame.Bytes.Length)
      $writer.Write([UInt32]$offset)
      $offset += $frame.Bytes.Length
    }

    foreach ($frame in $frames) {
      $writer.Write([Byte[]]$frame.Bytes)
    }
  } finally {
    $writer.Dispose()
    $file.Dispose()
  }
} finally {
  $sourceImage.Dispose()
}
`;

const skippedNodeModules = new Set([
  ".cache",
  "electron",
  "electron-builder",
  "pkg"
]);

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function removeInsideWorkspace(target) {
  const resolved = path.resolve(target);
  if (!isInside(root, resolved)) {
    throw new Error(`Refusing to remove path outside project: ${resolved}`);
  }
  await fs.rm(resolved, { recursive: true, force: true });
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function runFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...options
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      reject(new Error(`${command} failed with exit code ${code}${output ? `:\n${output}` : ""}`));
    });
  });
}

async function copyFiltered(source, destination) {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      if (path.basename(source) === "node_modules" && skippedNodeModules.has(entry.name)) {
        continue;
      }
      await copyFiltered(path.join(source, entry.name), path.join(destination, entry.name));
    }
    return;
  }

  if (stat.isFile()) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }
}

function normalizeWindowsVersion(version) {
  const parts = String(version)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10))
    .filter(Number.isFinite)
    .slice(0, 4);

  while (parts.length < 4) {
    parts.push(0);
  }

  return parts.join(".");
}

function relativeToRoot(target) {
  return path.relative(root, target) || ".";
}

async function createWindowsIcon() {
  await removeInsideWorkspace(iconOutputDir);
  await fs.mkdir(iconOutputDir, { recursive: true });
  const iconScriptPath = path.join(iconOutputDir, "create-icon.ps1");
  await fs.writeFile(iconScriptPath, POWERSHELL_ICON_SCRIPT, "utf8");

  try {
    await runFile("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      iconScriptPath,
      "-Source",
      sourceIconPng,
      "-Destination",
      windowsIconPath
    ]);
  } finally {
    await fs.rm(iconScriptPath, { force: true }).catch(() => {});
  }
}

async function editExecutableResources(sourcePackage) {
  if (process.platform !== "win32") {
    return;
  }

  if (!(await pathExists(sourceIconPng))) {
    throw new Error(`Desktop icon not found: ${sourceIconPng}`);
  }

  if (!(await pathExists(rceditPath))) {
    throw new Error("rcedit was not found. Run npm install before building the Windows desktop app.");
  }

  await createWindowsIcon();

  const buildConfig = sourcePackage.build || {};
  const productName = buildConfig.productName || sourcePackage.productName || sourcePackage.name || "html2apk";
  const version = normalizeWindowsVersion(sourcePackage.version || "0.0.0");
  const copyright = buildConfig.copyright || "";

  const args = [
    relativeToRoot(executablePath),
    "--set-version-string",
    "FileDescription",
    productName,
    "--set-version-string",
    "ProductName",
    productName,
    "--set-version-string",
    "CompanyName",
    "Dev Caio Multiversando",
    "--set-version-string",
    "LegalCopyright",
    copyright,
    "--set-version-string",
    "InternalName",
    "html2apk.exe",
    "--set-version-string",
    "OriginalFilename",
    "html2apk.exe",
    "--set-file-version",
    version,
    "--set-product-version",
    version,
    "--set-icon",
    relativeToRoot(windowsIconPath)
  ];

  await runFile(rceditPath, args);
}

async function writeDesktopPackageJson() {
  const sourcePackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const desktopPackage = {
    name: sourcePackage.name,
    productName: sourcePackage.build?.productName || sourcePackage.productName || sourcePackage.name,
    version: sourcePackage.version,
    description: sourcePackage.description,
    main: "src/desktop/main.js",
    type: sourcePackage.type,
    license: sourcePackage.license,
    dependencies: sourcePackage.dependencies || {}
  };

  await fs.writeFile(
    path.join(appDir, "package.json"),
    `${JSON.stringify(desktopPackage, null, 2)}\n`,
    "utf8"
  );
}

async function build() {
  const sourcePackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));

  if (!(await pathExists(electronDist))) {
    throw new Error("Electron runtime not found. Run npm install first.");
  }

  for (const legacyDir of legacyDesktopDirs) {
    await removeInsideWorkspace(legacyDir);
  }
  for (const legacyExe of legacyExeFiles) {
    await removeInsideWorkspace(legacyExe);
  }

  await removeInsideWorkspace(portableDir);
  await fs.mkdir(outputRoot, { recursive: true });
  await copyFiltered(electronDist, portableDir);
  await fs.rename(path.join(portableDir, "electron.exe"), executablePath);
  await editExecutableResources(sourcePackage);

  await fs.rm(appDir, { recursive: true, force: true });
  await fs.mkdir(appDir, { recursive: true });

  for (const entry of appEntries) {
    const source = path.join(root, entry);
    if (await pathExists(source)) {
      await copyFiltered(source, path.join(appDir, entry));
    }
  }

  await writeDesktopPackageJson();

  console.log(`Desktop portable generated: ${path.join(portableDir, "html2apk.exe")}`);
  console.log("Bundled app dependencies are in resources/app/node_modules.");
}

build().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
