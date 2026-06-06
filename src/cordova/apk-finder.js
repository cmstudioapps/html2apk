"use strict";

const fs = require("fs/promises");
const path = require("path");

async function walk(dirPath, extension, results = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, extension, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
      const stat = await fs.stat(fullPath);
      results.push({ path: fullPath, mtimeMs: stat.mtimeMs });
    }
  }

  return results;
}

function artifactFormat(options = {}) {
  return String(options.buildFormat || options.outputFormat || options.packageType || "").toLowerCase() === "aab" ? "aab" : "apk";
}

async function findAndroidArtifact(buildDir, options) {
  const format = artifactFormat(options);
  const outputRoot = path.join(buildDir, "platforms", "android", "app", "build", "outputs", format === "aab" ? "bundle" : "apk");
  const extension = `.${format}`;
  const artifacts = await walk(outputRoot, extension);

  if (artifacts.length === 0) {
    throw new Error(`Cordova build finished, but no ${format.toUpperCase()} was found.`);
  }

  const expectedFlavor = options.release ? "release" : "debug";
  const preferred = artifacts
    .filter((item) => item.path.toLowerCase().includes(expectedFlavor))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];

  return (preferred || artifacts.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]).path;
}

async function findApk(buildDir, options) {
  return findAndroidArtifact(buildDir, { ...options, buildFormat: "apk" });
}

module.exports = {
  artifactFormat,
  findAndroidArtifact,
  findApk
};
