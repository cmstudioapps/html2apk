"use strict";

const fs = require("fs/promises");
const path = require("path");
const {
  DEFAULT_ANDROID_MIN_SDK_VERSION,
  MAX_ANDROID_MIN_SDK_VERSION,
  createDefaultOptions
} = require("./defaults");

const CONFIG_FILES = ["app.json", "config.json"];

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadProjectConfig(projectRoot = process.cwd()) {
  for (const fileName of CONFIG_FILES) {
    const configPath = path.join(projectRoot, fileName);
    if (await pathExists(configPath)) {
      const raw = await fs.readFile(configPath, "utf8");
      try {
        return {
          config: JSON.parse(raw),
          configPath
        };
      } catch (error) {
        throw new Error(`Invalid JSON in ${fileName}: ${error.message}`);
      }
    }
  }

  return {
    config: {},
    configPath: null
  };
}

function mergeDeep(base, next) {
  const output = { ...base };

  for (const [key, value] of Object.entries(next || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      output[key] = mergeDeep(base[key], value);
    } else if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

function normalizeMinSdkVersion(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed)
    && parsed >= DEFAULT_ANDROID_MIN_SDK_VERSION
    && parsed <= MAX_ANDROID_MIN_SDK_VERSION
    ? parsed
    : DEFAULT_ANDROID_MIN_SDK_VERSION;
}

function normalizeThemeMode(value) {
  return String(value || "").trim().toLowerCase() === "auto" ? "auto" : "fixed";
}

function normalizeThemeColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#126fff";
}

function normalizeOptions(options) {
  const normalized = { ...options };

  normalized.mode = ["fullscreen", "floating"].includes(normalized.mode) ? normalized.mode : "standalone";
  if (normalized.orientation === "vertical") {
    normalized.orientation = "portrait";
  } else if (normalized.orientation === "horizontal") {
    normalized.orientation = "landscape";
  }
  normalized.orientation = ["portrait", "landscape"].includes(normalized.orientation)
    ? normalized.orientation
    : "default";
  normalized.debug = Boolean(normalized.debug);
  normalized.release = Boolean(normalized.release);
  normalized.buildFormat = normalizeBuildFormat(normalized.buildFormat || normalized.outputFormat || normalized.artifactType || normalized.packageType);
  if (normalized.buildFormat === "aab") {
    normalized.release = true;
  }
  const themeColorText = String(normalized.themeColor || "").trim().toLowerCase();
  const themeModeText = String(normalized.themeMode || "").trim().toLowerCase();
  const themeText = String(normalized.theme || "").trim().toLowerCase();
  normalized.themeMode = themeModeText === "auto" || themeText === "auto" || themeColorText === "auto" ? "auto" : "fixed";
  normalized.theme = normalized.themeMode;
  normalized.themeColor = normalizeThemeColor(themeColorText === "auto" ? normalized.backgroundColor : normalized.themeColor);
  normalized.showRuntimeLogs = Boolean(
    normalized.showRuntimeLogs ||
    normalized.mostrarLogs ||
    normalized.runtimeLogs ||
    normalized.debugConsole ||
    normalized.console
  );
  normalized.oneSignalAppId = normalizeOneSignalAppId(normalized.oneSignalAppId || normalized.onesignalAppId || normalized.oneSignal?.appId || normalized.onesignal?.appId);
  normalized.minSdkVersion = normalizeMinSdkVersion(normalized.minSdkVersion || normalized.androidMinSdkVersion);
  normalized.permissions = Array.isArray(normalized.permissions)
    ? normalized.permissions.map((permission) => String(permission).trim()).filter(Boolean)
    : [];
  normalized.plugins = Array.isArray(normalized.plugins)
    ? normalized.plugins.map((plugin) => String(plugin).trim()).filter(Boolean)
    : [];
  normalized.deepLinks = normalizeDeepLinks(normalized.deepLinks);
  normalized.entryFile = normalized.entryFile || "index.html";
  normalized.webRoot = normalized.webRoot || ".";

  return normalized;
}

function normalizeOneSignalAppId(value) {
  return String(value || "").trim();
}

function normalizeBuildFormat(value) {
  return String(value || "").trim().toLowerCase() === "aab" ? "aab" : "apk";
}

function normalizeDeepLinks(value) {
  const input = value && typeof value === "object" ? value : {};
  const schemes = Array.isArray(input.schemes)
    ? input.schemes.map((scheme) => String(scheme).trim()).filter(Boolean)
    : [];
  const appLinks = Array.isArray(input.appLinks)
    ? input.appLinks
      .filter((item) => item && typeof item === "object" && item.host)
      .map((item) => ({
        scheme: item.scheme || "https",
        host: String(item.host).trim(),
        paths: Array.isArray(item.paths) ? item.paths.map((pathItem) => String(pathItem).trim()).filter(Boolean) : [],
        autoVerify: Boolean(item.autoVerify)
      }))
    : [];

  return {
    schemes,
    appLinks
  };
}

async function resolveBuildOptions(overrides = {}) {
  const projectRoot = path.resolve(overrides.projectRoot || process.cwd());
  const { config, configPath } = await loadProjectConfig(projectRoot);
  const defaults = createDefaultOptions(projectRoot);
  const merged = mergeDeep(mergeDeep(defaults, config), overrides);
  delete merged.projectRoot;

  return {
    projectRoot,
    configPath,
    options: normalizeOptions(merged)
  };
}

module.exports = {
  CONFIG_FILES,
  loadProjectConfig,
  resolveBuildOptions,
  mergeDeep,
  normalizeOptions,
  normalizeMinSdkVersion,
  normalizeThemeMode,
  normalizeOneSignalAppId,
  normalizeBuildFormat,
  normalizeDeepLinks
};
