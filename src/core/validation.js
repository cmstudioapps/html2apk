"use strict";

const fs = require("fs/promises");
const path = require("path");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent, child, label) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the project root.`);
  }
}

async function validateEntryFile(projectRoot, options) {
  const webRoot = path.resolve(projectRoot, options.webRoot || ".");
  assertInside(projectRoot, webRoot, "webRoot");

  const entryFile = options.entryFile || "index.html";
  const entryPath = path.resolve(webRoot, entryFile);
  assertInside(webRoot, entryPath, "entryFile");

  if (!options.url) {
    if (!(await exists(entryPath))) {
      throw new Error(`Entry file not found: ${path.relative(projectRoot, entryPath)}`);
    }
  }

  return {
    webRoot,
    entryPath
  };
}

function validatePackageId(packageId) {
  const pattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
  if (!pattern.test(packageId)) {
    throw new Error(`Invalid packageId "${packageId}". Example: com.company.app`);
  }
}

function validateRequiredOptions(options) {
  if (!options.appName) {
    throw new Error("appName is required.");
  }
  validatePackageId(options.packageId);
}

module.exports = {
  validateEntryFile,
  validateRequiredOptions,
  assertInside
};
