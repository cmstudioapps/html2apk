"use strict";

const path = require("path");

const DEFAULT_ANDROID_MIN_SDK_VERSION = 24;
const MAX_ANDROID_MIN_SDK_VERSION = 36;

function toPackageSegment(value) {
  return String(value || "app")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^[^a-z]+/, "") || "app";
}

function createDefaultOptions(projectRoot) {
  const appName = path.basename(projectRoot || process.cwd()) || "Html2ApkApp";

  return {
    appName,
    packageId: `com.html2apk.${toPackageSegment(appName)}`,
    version: "1.0.0",
    mode: "standalone",
    orientation: "default",
    debug: false,
    icon: null,
    splash: null,
    permissions: ["INTERNET", "POST_NOTIFICATIONS", "VIBRATE"],
    plugins: [],
    release: false,
    buildFormat: "apk",
    keystore: null,
    androidPlatform: "android@15.0.0",
    minSdkVersion: DEFAULT_ANDROID_MIN_SDK_VERSION,
    themeColor: "#126fff",
    themeMode: "fixed",
    showRuntimeLogs: false,
    oneSignalAppId: "",
    deepLinks: {
      schemes: [],
      appLinks: []
    },
    files: null,
    entryFile: "index.html",
    webRoot: ".",
    outputDir: "dist"
  };
}

module.exports = {
  DEFAULT_ANDROID_MIN_SDK_VERSION,
  MAX_ANDROID_MIN_SDK_VERSION,
  createDefaultOptions
};
