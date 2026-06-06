"use strict";

const fs = require("fs/promises");
const path = require("path");

const DEFAULT_IGNORES = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  "platforms",
  "plugins",
  "hooks",
  "dist",
  "build",
  ".gradle",
  "app.json",
  "config.json"
]);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function removePath(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function copyFile(source, destination) {
  await ensureDir(path.dirname(destination));
  await fs.copyFile(source, destination);
}

async function copyDirectory(source, destination, shouldIgnore) {
  await ensureDir(destination);
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (shouldIgnore(sourcePath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath, shouldIgnore);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destinationPath);
    }
  }
}

function normalizeFileMapping(item) {
  if (typeof item === "string") {
    return { from: item, to: item };
  }

  if (item && typeof item === "object" && item.from) {
    return {
      from: item.from,
      to: item.to || item.from
    };
  }

  throw new Error(`Invalid files entry: ${JSON.stringify(item)}`);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function copyWebAssets(webRoot, destination, options, projectRoot) {
  await removePath(destination);
  await ensureDir(destination);

  if (Array.isArray(options.files) && options.files.length > 0) {
    for (const item of options.files) {
      const mapping = normalizeFileMapping(item);
      const source = path.resolve(webRoot, mapping.from);
      if (!isInside(projectRoot, source)) {
        throw new Error(`File mapping leaves project root: ${mapping.from}`);
      }

      const target = path.resolve(destination, mapping.to);
      if (!isInside(destination, target)) {
        throw new Error(`File mapping leaves Cordova www folder: ${mapping.to}`);
      }

      const stat = await fs.stat(source);
      if (stat.isDirectory()) {
        await copyDirectory(source, target, () => false);
      } else {
        await copyFile(source, target);
      }
    }
    return;
  }

  await copyDirectory(webRoot, destination, (_sourcePath, entry) => {
    return DEFAULT_IGNORES.has(entry.name);
  });
}

module.exports = {
  ensureDir,
  removePath,
  copyFile,
  copyDirectory,
  copyWebAssets
};
