"use strict";

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { resolveBuildOptions } = require("./config");
const { validateEntryFile, validateRequiredOptions } = require("./validation");
const { createCordovaProject, addAndroidPlatform, buildAndroid, runAndroidDevice, addCordovaPlugin } = require("../cordova/project");
const { writeConfigXml } = require("../cordova/config-xml");
const { artifactFormat, findAndroidArtifact, findApk } = require("../cordova/apk-finder");
const { copyWebAssets, ensureDir, removePath, copyFile, copyDirectory } = require("../utils/fs-extra");
const { createCommandRunner } = require("../utils/command-runner");
const { installBridgePlugin } = require("../bridge/install-bridge");
const { getRuntimeEnvironment } = require("../runtime-manager");

const AUTO_THEME_SCRIPT_NAME = "html2apk-auto-theme.js";
const EARLY_BRIDGE_SCRIPT_NAME = "html2apk-early-bridge.js";
const RUNTIME_CONSOLE_SCRIPT_NAME = "html2apk-runtime-console.js";
const RUNTIME_CONSOLE_ICON_NAME = "html2apk-console.png";
const ONESIGNAL_SCRIPT_NAME = "html2apk-onesignal.js";
const ONESIGNAL_PLUGIN_PACKAGE = "onesignal-cordova-plugin";
const DEFAULT_APP_ICON_NAME = "html2apk.png";
const DEFAULT_CONSOLE_ICON_NAME = "console.png";

function defaultAppIconPath() {
  return path.resolve(__dirname, "..", "..", DEFAULT_APP_ICON_NAME);
}

function withDefaultAppIcon(assetPath) {
  return String(assetPath || "").trim() || defaultAppIconPath();
}

function isRemoteAsset(assetPath) {
  return /^https?:\/\//i.test(String(assetPath || ""));
}

function toBuildAssetPath(buildDir, assetPath) {
  if (!assetPath || isRemoteAsset(assetPath)) {
    return null;
  }

  return path.resolve(buildDir, assetPath);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toCordovaPath(value) {
  return String(value).replace(/\\/g, "/");
}

function isAutoTheme(options) {
  return String(options.themeMode || options.theme || "").toLowerCase() === "auto";
}

function oneSignalAppId(options) {
  return String(options.oneSignalAppId || options.onesignalAppId || options.oneSignal?.appId || options.onesignal?.appId || "").trim();
}

function hasOneSignal(options) {
  return oneSignalAppId(options).length > 0;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function scriptTag(scriptPath) {
  return `<script src="${scriptPath}"></script>`;
}

async function findHtmlFiles(dirPath, results = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await findHtmlFiles(fullPath, results);
    } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

async function injectCordovaRuntimeIntoHtml(htmlPath, scriptPath = "cordova.js", earlyBridgePath = EARLY_BRIDGE_SCRIPT_NAME, runtimeConsolePath = null) {
  let html = await fs.readFile(htmlPath, "utf8");
  const hasCordova = /<script\b[^>]*\bsrc=["'][^"']*cordova\.js["'][^>]*>/i.test(html);
  const hasEarlyBridge = /<script\b[^>]*\bsrc=["'][^"']*html2apk-early-bridge\.js["'][^>]*>/i.test(html);
  const hasRuntimeConsole = /<script\b[^>]*\bsrc=["'][^"']*html2apk-runtime-console\.js["'][^>]*>/i.test(html);
  if (hasCordova && hasEarlyBridge && (!runtimeConsolePath || hasRuntimeConsole)) {
    return false;
  }

  const tags = [
    hasEarlyBridge ? null : scriptTag(earlyBridgePath),
    runtimeConsolePath && !hasRuntimeConsole ? scriptTag(runtimeConsolePath) : null,
    hasCordova ? null : scriptTag(scriptPath)
  ].filter(Boolean).join("\n  ");

  if (!tags) {
    return false;
  }

  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, (match) => `${match}\n  ${tags}`);
  } else if (/<html\b[^>]*>/i.test(html)) {
    html = html.replace(/<html\b[^>]*>/i, (match) => `${match}\n  ${tags}`);
  } else {
    html = `${tags}\n${html}`;
  }

  await fs.writeFile(htmlPath, html, "utf8");
  return true;
}

async function installCordovaRuntimeScript(buildDir, options) {
  const wwwDir = path.join(buildDir, "www");
  const entryHtmlPath = path.resolve(wwwDir, options.entryFile || "index.html");
  const earlyBridgeSource = path.resolve(__dirname, "..", "templates", EARLY_BRIDGE_SCRIPT_NAME);
  const earlyBridgeTarget = path.join(wwwDir, EARLY_BRIDGE_SCRIPT_NAME);
  const runtimeConsoleSource = path.resolve(__dirname, "..", "templates", RUNTIME_CONSOLE_SCRIPT_NAME);
  const runtimeConsoleTarget = path.join(wwwDir, RUNTIME_CONSOLE_SCRIPT_NAME);
  const runtimeConsoleIconSource = path.resolve(__dirname, "..", "..", DEFAULT_CONSOLE_ICON_NAME);
  const runtimeConsoleIconTarget = path.join(wwwDir, RUNTIME_CONSOLE_ICON_NAME);
  const htmlFiles = await findHtmlFiles(wwwDir);
  let injectedCount = 0;

  if (!isInside(wwwDir, entryHtmlPath)) {
    throw new Error(`Entry file must stay inside the Cordova www folder: ${options.entryFile}`);
  }

  await copyFile(earlyBridgeSource, earlyBridgeTarget);
  if (options.showRuntimeLogs) {
    await copyFile(runtimeConsoleSource, runtimeConsoleTarget);
    if (await pathExists(runtimeConsoleIconSource)) {
      await copyFile(runtimeConsoleIconSource, runtimeConsoleIconTarget);
    }
  }

  for (const htmlPath of htmlFiles) {
    const scriptPath = toCordovaPath(path.relative(path.dirname(htmlPath), path.join(wwwDir, "cordova.js"))) || "cordova.js";
    const earlyBridgePath = toCordovaPath(path.relative(path.dirname(htmlPath), earlyBridgeTarget)) || EARLY_BRIDGE_SCRIPT_NAME;
    const runtimeConsolePath = options.showRuntimeLogs
      ? (toCordovaPath(path.relative(path.dirname(htmlPath), runtimeConsoleTarget)) || RUNTIME_CONSOLE_SCRIPT_NAME)
      : null;
    if (await injectCordovaRuntimeIntoHtml(htmlPath, scriptPath, earlyBridgePath, runtimeConsolePath)) {
      injectedCount += 1;
    }
  }

  return injectedCount;
}

async function injectScriptIntoHtml(htmlPath, scriptPath) {
  let html = await fs.readFile(htmlPath, "utf8");
  if (html.includes(scriptPath)) {
    return;
  }

  const tag = scriptTag(scriptPath);
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `  ${tag}\n</body>`);
  } else {
    html = `${html}\n${tag}\n`;
  }

  await fs.writeFile(htmlPath, html, "utf8");
}

async function installAutoThemeScript(buildDir, options) {
  if (!isAutoTheme(options)) {
    return false;
  }

  const wwwDir = path.join(buildDir, "www");
  const source = path.resolve(__dirname, "..", "templates", AUTO_THEME_SCRIPT_NAME);
  const target = path.join(wwwDir, AUTO_THEME_SCRIPT_NAME);
  const entryHtmlPath = path.resolve(wwwDir, options.entryFile || "index.html");
  const scriptPath = toCordovaPath(path.relative(path.dirname(entryHtmlPath), target));

  if (!isInside(wwwDir, entryHtmlPath)) {
    throw new Error(`Entry file must stay inside the Cordova www folder: ${options.entryFile}`);
  }

  await copyFile(source, target);
  await injectScriptIntoHtml(entryHtmlPath, scriptPath || AUTO_THEME_SCRIPT_NAME);
  return true;
}

function jsString(value) {
  return JSON.stringify(String(value || ""));
}

async function installOneSignalScript(buildDir, options) {
  const appId = oneSignalAppId(options);
  if (!appId) {
    return false;
  }

  const wwwDir = path.join(buildDir, "www");
  const source = path.resolve(__dirname, "..", "templates", ONESIGNAL_SCRIPT_NAME);
  const target = path.join(wwwDir, ONESIGNAL_SCRIPT_NAME);
  const entryHtmlPath = path.resolve(wwwDir, options.entryFile || "index.html");
  const scriptPath = toCordovaPath(path.relative(path.dirname(entryHtmlPath), target));
  const template = await fs.readFile(source, "utf8");

  if (!isInside(wwwDir, entryHtmlPath)) {
    throw new Error(`Entry file must stay inside the Cordova www folder: ${options.entryFile}`);
  }

  await fs.writeFile(
    target,
    template.replace("__HTML2APK_ONESIGNAL_APP_ID__", jsString(appId)),
    "utf8"
  );
  await injectScriptIntoHtml(entryHtmlPath, scriptPath || ONESIGNAL_SCRIPT_NAME);
  return true;
}

function removePluginPlatform(pluginXml, platformName) {
  const pattern = new RegExp(`\\n?\\s*<platform name="${platformName}">[\\s\\S]*?\\n\\s*</platform>`, "i");
  return pluginXml.replace(pattern, "");
}

async function prepareBundledPlugin(buildDir, packageName) {
  const localPath = path.resolve(__dirname, "..", "..", "node_modules", packageName);
  try {
    await fs.access(path.join(localPath, "plugin.xml"));
  } catch {
    return packageName;
  }

  const destination = path.join(buildDir, `${packageName}-android`);
  await removePath(destination);
  await copyDirectory(localPath, destination, () => false);

  const packageJsonPath = path.join(destination, "package.json");
  const sourcePackage = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const pluginPackage = {
    name: sourcePackage.name,
    version: sourcePackage.version,
    description: sourcePackage.description,
    license: sourcePackage.license,
    main: sourcePackage.main || "dist/index.cjs",
    types: sourcePackage.types,
    cordova: {
      id: sourcePackage.cordova?.id || packageName,
      platforms: ["android"]
    }
  };
  Object.keys(pluginPackage).forEach((key) => {
    if (pluginPackage[key] === undefined) {
      delete pluginPackage[key];
    }
  });
  await fs.writeFile(packageJsonPath, `${JSON.stringify(pluginPackage, null, 2)}\n`, "utf8");

  const pluginXmlPath = path.join(destination, "plugin.xml");
  let pluginXml = await fs.readFile(pluginXmlPath, "utf8");
  pluginXml = removePluginPlatform(pluginXml, "ios");
  await fs.writeFile(pluginXmlPath, pluginXml, "utf8");

  return destination;
}

function hasPlugin(plugins, packageName) {
  return (plugins || []).some((plugin) => {
    const text = String(plugin || "").replace(/\\/g, "/").toLowerCase();
    return text === packageName || text.endsWith(`/node_modules/${packageName}`) || text.endsWith(`/${packageName}`);
  });
}

async function copyCordovaAsset(projectRoot, buildDir, assetPath, assetName) {
  if (!assetPath || isRemoteAsset(assetPath)) {
    return assetPath;
  }

  const assetText = String(assetPath);
  let source;
  let destination;
  let cordovaPath;

  if (path.isAbsolute(assetText)) {
    source = assetText;
    const extension = path.extname(source) || ".png";
    cordovaPath = path.join("res", "html2apk", `${assetName}${extension}`);
    destination = path.join(buildDir, cordovaPath);
  } else {
    source = path.resolve(projectRoot, assetText);
    if (!isInside(projectRoot, source)) {
      throw new Error(`Asset path must stay inside the project root: ${assetPath}`);
    }

    destination = path.resolve(buildDir, assetText);
    cordovaPath = assetText;
  }

  if (!isInside(buildDir, destination)) {
    throw new Error(`Asset path must stay inside the Cordova project: ${assetPath}`);
  }

  await copyFile(source, destination);
  return toCordovaPath(cordovaPath);
}

async function createBuildJson(buildDir, options, projectRoot) {
  if (!options.release || !options.keystore || !options.keystore.path) {
    return null;
  }

  const storeFile = path.resolve(projectRoot, options.keystore.path);
  const buildJsonPath = path.join(buildDir, "build.json");
  const release = {
    packageType: artifactFormat(options) === "aab" ? "bundle" : "apk",
    keystore: storeFile,
    storePassword: options.keystore.storePassword || options.keystore.password,
    alias: options.keystore.alias,
    password: options.keystore.keyPassword || options.keystore.password,
    keystoreType: options.keystore.type
  };

  Object.keys(release).forEach((key) => {
    if (release[key] === undefined || release[key] === null) {
      delete release[key];
    }
  });

  await fs.writeFile(buildJsonPath, JSON.stringify({ android: { release } }, null, 2));
  return buildJsonPath;
}

function outputAndroidName(options) {
  const safeName = String(options.appName || "app").replace(/[^a-zA-Z0-9._-]+/g, "-");
  const flavor = options.release ? "release" : "debug";
  const extension = artifactFormat(options);
  return `${safeName}-${options.version}-${flavor}.${extension}`;
}

function parseAdbDevices(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line
      && !/^list of devices/i.test(line)
      && !/^\*/.test(line)
      && !/^adb server/i.test(line))
    .map((line) => {
      const parts = line.split(/\s+/);
      return {
        id: parts[0],
        status: parts[1] || "unknown"
      };
    })
    .filter((device) => device.id);
}

function deviceTargetId(device) {
  return device && device.id ? String(device.id) : "";
}

async function ensureUsbDebugDevice(runner) {
  let result;
  try {
    result = await runner.run("adb", ["devices"]);
  } catch (error) {
    throw new Error("ADB nao foi encontrado. Instale Android platform-tools pelo ambiente do html2apk e tente novamente.");
  }

  const devices = parseAdbDevices(result.stdout);
  const physicalDevices = devices.filter((device) => !/^emulator-/i.test(device.id));
  const ready = physicalDevices.find((device) => device.status === "device");
  if (ready) {
    return ready;
  }

  if (physicalDevices.some((device) => device.status === "unauthorized")) {
    throw new Error("Celular encontrado, mas a depuracao USB ainda nao foi autorizada. Desbloqueie o celular e aceite a chave RSA de depuracao USB.");
  }

  if (physicalDevices.some((device) => device.status === "offline")) {
    throw new Error("Celular USB encontrado, mas esta offline. Reconecte o cabo USB, desbloqueie o celular e confirme a depuracao USB.");
  }

  throw new Error("Nenhum celular USB autorizado foi encontrado. Ative Opcoes do desenvolvedor > Depuracao USB, conecte o celular e aceite a permissao RSA.");
}

async function prepareCordovaProject(projectRoot, buildDir, options, runner, log) {
  await createCordovaProject(buildDir, options, runner);
  const cordovaOptions = { ...options };
  const effectiveIcon = withDefaultAppIcon(options.icon);
  const effectiveSplash = options.splash || effectiveIcon;
  if (!String(options.icon || "").trim()) {
    log("Icon: using the default html2apk icon.");
  }
  cordovaOptions.icon = await copyCordovaAsset(projectRoot, buildDir, effectiveIcon, "icon");
  cordovaOptions.splash = await copyCordovaAsset(projectRoot, buildDir, effectiveSplash, "splash");
  cordovaOptions.androidSplashScreenAnimatedIcon = toBuildAssetPath(buildDir, cordovaOptions.splash);
  await writeConfigXml(path.join(buildDir, "config.xml"), cordovaOptions);
  await copyWebAssets(path.resolve(projectRoot, options.webRoot || "."), path.join(buildDir, "www"), options, projectRoot);
  const injectedRuntimePages = await installCordovaRuntimeScript(buildDir, options);
  if (injectedRuntimePages) {
    log(`Cordova runtime: injected scripts into ${injectedRuntimePages} HTML page(s).`);
  }
  if (options.showRuntimeLogs) {
    log("Runtime console: enabled inside the generated APK.");
  }
  if (await installAutoThemeScript(buildDir, options)) {
    log("Theme mode: auto (system bars follow the visible screen color).");
  }
  if (await installOneSignalScript(buildDir, options)) {
    log("OneSignal: enabled for remote push notifications.");
  }

  const bridgePluginPath = await installBridgePlugin(buildDir);
  await addCordovaPlugin(buildDir, bridgePluginPath, runner);

  if (hasOneSignal(options) && !hasPlugin(options.plugins, ONESIGNAL_PLUGIN_PACKAGE)) {
    await addCordovaPlugin(buildDir, await prepareBundledPlugin(buildDir, ONESIGNAL_PLUGIN_PACKAGE), runner);
  }

  for (const plugin of options.plugins) {
    await addCordovaPlugin(buildDir, plugin, runner);
  }

  await addAndroidPlatform(buildDir, options, runner);
}

async function copyBuiltArtifact(projectRoot, buildDir, options) {
  const artifactPathInBuild = await findAndroidArtifact(buildDir, options);
  const outputDir = path.resolve(projectRoot, options.outputDir || "dist");
  await ensureDir(outputDir);

  const artifactPath = path.join(outputDir, outputAndroidName(options));
  await copyFile(artifactPathInBuild, artifactPath);
  return artifactPath;
}

async function ensureBuiltDebugApk(buildDir, options, runner, log) {
  try {
    return await findApk(buildDir, options);
  } catch {
    log("USB debug: building debug APK for direct ADB install.");
    await buildAndroid(buildDir, options, null, runner);
    return findApk(buildDir, options);
  }
}

async function installDebugApkWithAdb(buildDir, options, runner, device, log) {
  const deviceId = deviceTargetId(device);
  const apkPath = await ensureBuiltDebugApk(buildDir, options, runner, log);
  log(`USB debug fallback: installing APK with ADB on ${deviceId}.`);

  try {
    await runner.run("adb", ["-s", deviceId, "install", "-r", "-d", apkPath]);
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}\n${error.message || ""}`;
    if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE/i.test(output)) {
      throw new Error("O app ja esta instalado nesse celular com outra assinatura. Desinstale a versao antiga no Android e clique em Testar no USB novamente.");
    }
    throw error;
  }

  log(`USB debug fallback: opening ${options.packageId}.`);
  await runner.run("adb", [
    "-s",
    deviceId,
    "shell",
    "monkey",
    "-p",
    options.packageId,
    "-c",
    "android.intent.category.LAUNCHER",
    "1"
  ]);

  return apkPath;
}

async function buildApk(overrides = {}) {
  const onLog = typeof overrides.onLog === "function" ? overrides.onLog : null;
  const { projectRoot, configPath, options } = await resolveBuildOptions(overrides);
  validateRequiredOptions(options);
  await validateEntryFile(projectRoot, options);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-"));
  const buildDir = path.join(tempRoot, "cordova-project");
  const logs = [];
  const runtime = getRuntimeEnvironment();
  const runner = createCommandRunner({ logs, env: runtime.env, onLog });
  let tempCleaned = false;

  function log(line) {
    logs.push(line);
    if (onLog) {
      onLog(line);
    }
  }

  try {
    log(`Project root: ${projectRoot}`);
    log(configPath ? `Config: ${configPath}` : "Config: defaults only");
    if (runtime.androidSdk) {
      log(`Android SDK: ${runtime.androidSdk}`);
    }
    if (runtime.javaHome) {
      log(`JAVA_HOME: ${runtime.javaHome}`);
    }

    await prepareCordovaProject(projectRoot, buildDir, options, runner, log);
    const buildJsonPath = await createBuildJson(buildDir, options, projectRoot);
    await buildAndroid(buildDir, options, buildJsonPath, runner);

    const artifactPath = await copyBuiltArtifact(projectRoot, buildDir, options);
    const artifactType = artifactFormat(options);

    if (!options.debug) {
      await removePath(tempRoot);
      tempCleaned = true;
    }

    return {
      apkPath: artifactPath,
      artifactPath,
      artifactType,
      buildDir: options.debug ? buildDir : null,
      logs,
      status: "success",
      tempCleaned
    };
  } catch (error) {
    log(`Error: ${error.message}`);
    if (!options.debug) {
      await removePath(tempRoot).catch(() => {});
      tempCleaned = true;
    } else {
      log(`Debug mode enabled. Temporary build kept at: ${buildDir}`);
    }

    error.logs = logs;
    error.buildDir = options.debug ? buildDir : null;
    error.tempCleaned = tempCleaned;
    error.status = "error";
    throw error;
  }
}

async function runDebugUsb(overrides = {}) {
  const onLog = typeof overrides.onLog === "function" ? overrides.onLog : null;
  const resolved = await resolveBuildOptions(overrides);
  const projectRoot = resolved.projectRoot;
  const configPath = resolved.configPath;
  const options = {
    ...resolved.options,
    release: false
  };
  validateRequiredOptions(options);
  await validateEntryFile(projectRoot, options);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-"));
  const buildDir = path.join(tempRoot, "cordova-project");
  const logs = [];
  const runtime = getRuntimeEnvironment();
  const runner = createCommandRunner({ logs, env: runtime.env, onLog });
  let tempCleaned = false;

  function log(line) {
    logs.push(line);
    if (onLog) {
      onLog(line);
    }
  }

  try {
    log(`Project root: ${projectRoot}`);
    log(configPath ? `Config: ${configPath}` : "Config: defaults only");
    log("USB debug: checking connected Android device.");
    const device = await ensureUsbDebugDevice(runner);
    log(`USB debug device: ${device.id}`);

    await prepareCordovaProject(projectRoot, buildDir, options, runner, log);
    try {
      await runAndroidDevice(buildDir, options, null, runner, deviceTargetId(device));
    } catch (error) {
      log("USB debug: Cordova run failed. Trying direct ADB install fallback.");
      if (error.stdout || error.stderr) {
        log([error.stdout, error.stderr].filter(Boolean).join("\n").trim().slice(-4000));
      }
      await installDebugApkWithAdb(buildDir, options, runner, device, log);
    }

    const apkPath = await copyBuiltArtifact(projectRoot, buildDir, { ...options, buildFormat: "apk" });

    if (!options.debug) {
      await removePath(tempRoot);
      tempCleaned = true;
    }

    return {
      apkPath,
      buildDir: options.debug ? buildDir : null,
      device,
      logs,
      status: "success",
      usbDebug: true,
      tempCleaned
    };
  } catch (error) {
    log(`Error: ${error.message}`);
    if (!options.debug) {
      await removePath(tempRoot).catch(() => {});
      tempCleaned = true;
    } else {
      log(`Debug mode enabled. Temporary build kept at: ${buildDir}`);
    }

    error.logs = logs;
    error.buildDir = options.debug ? buildDir : null;
    error.tempCleaned = tempCleaned;
    error.status = "error";
    throw error;
  }
}

module.exports = {
  buildApk,
  defaultAppIconPath,
  injectCordovaRuntimeIntoHtml,
  installCordovaRuntimeScript,
  parseAdbDevices,
  runDebugUsb
};
