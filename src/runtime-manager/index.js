"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const REQUIRED_ANDROID_PLATFORM = "android-36";
const REQUIRED_ANDROID_BUILD_TOOLS = "36.0.0";

function pathExists(targetPath) {
  try {
    return Boolean(targetPath) && fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function pathDelimiter() {
  return process.platform === "win32" ? ";" : ":";
}

function defaultAndroidSdkCandidates(env = process.env) {
  const home = os.homedir();
  const candidates = [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT
  ];

  if (process.platform === "win32") {
    candidates.push(
      env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Android", "Sdk") : null,
      home ? path.join(home, "AppData", "Local", "Android", "Sdk") : null
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      home ? path.join(home, "Library", "Android", "sdk") : null,
      "/Library/Android/sdk"
    );
  } else {
    candidates.push(
      home ? path.join(home, "Android", "Sdk") : null,
      "/opt/android-sdk",
      "/usr/local/share/android-sdk"
    );
  }

  return unique(candidates);
}

function getAndroidSdkPath(env = process.env) {
  return defaultAndroidSdkCandidates(env).find(pathExists) || env.ANDROID_HOME || env.ANDROID_SDK_ROOT || null;
}

function getJavaHome(env = process.env) {
  if (env.JAVA_HOME && pathExists(env.JAVA_HOME)) {
    return env.JAVA_HOME;
  }

  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      latestSubdir(path.join(process.env.ProgramFiles || "C:\\Program Files", "Eclipse Adoptium")),
      latestSubdir(path.join(process.env.ProgramFiles || "C:\\Program Files", "Java"))
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      latestSubdir("/Library/Java/JavaVirtualMachines")
    );
  } else {
    candidates.push(
      latestSubdir("/usr/lib/jvm"),
      latestSubdir("/usr/java")
    );
  }

  return candidates.find(pathExists) || env.JAVA_HOME || null;
}

function latestSubdir(parent) {
  if (!pathExists(parent)) {
    return null;
  }

  const entries = fs.readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return entries.length ? path.join(parent, entries[0]) : null;
}

function androidSdkPaths(androidSdk) {
  if (!androidSdk) {
    return [];
  }

  return unique([
    path.join(androidSdk, "platform-tools"),
    path.join(androidSdk, "emulator"),
    path.join(androidSdk, "cmdline-tools", "latest", "bin"),
    path.join(androidSdk, "tools", "bin"),
    latestSubdir(path.join(androidSdk, "build-tools"))
  ]);
}

function getGradleHome(env = process.env) {
  if (env.GRADLE_HOME && pathExists(env.GRADLE_HOME)) {
    return env.GRADLE_HOME;
  }

  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      latestSubdir(path.join(env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "html2apk", "gradle")),
      latestSubdir(path.join(process.env.ProgramFiles || "C:\\Program Files", "Gradle"))
    );
  } else {
    candidates.push(
      latestSubdir(path.join(os.homedir(), ".html2apk", "gradle")),
      latestSubdir("/opt/gradle")
    );
  }

  return candidates.find(pathExists) || env.GRADLE_HOME || null;
}

function prependToPath(env, entries) {
  const key = Object.prototype.hasOwnProperty.call(env, "Path") ? "Path" : "PATH";
  const current = env[key] || "";
  env[key] = unique([...entries, ...current.split(pathDelimiter())]).join(pathDelimiter());
}

function getRuntimeEnvironment(env = process.env) {
  const androidSdk = getAndroidSdkPath(env);
  const javaHome = getJavaHome(env);
  const gradleHome = getGradleHome(env);
  const nextEnv = { ...env };
  const pathEntries = [];

  if (androidSdk) {
    nextEnv.ANDROID_HOME = androidSdk;
    nextEnv.ANDROID_SDK_ROOT = androidSdk;
    pathEntries.push(...androidSdkPaths(androidSdk));
  }

  if (javaHome) {
    nextEnv.JAVA_HOME = javaHome;
    pathEntries.push(path.join(javaHome, "bin"));
  }

  if (gradleHome) {
    nextEnv.GRADLE_HOME = gradleHome;
    pathEntries.push(path.join(gradleHome, "bin"));
  }

  prependToPath(nextEnv, pathEntries);

  return {
    env: nextEnv,
    javaHome,
    gradleHome,
    androidSdk,
    platformTools: androidSdk ? path.join(androidSdk, "platform-tools") : null,
    cmdlineTools: androidSdk ? path.join(androidSdk, "cmdline-tools", "latest", "bin") : null,
    buildTools: androidSdk ? latestSubdir(path.join(androidSdk, "build-tools")) : null,
    requiredBuildTools: androidSdk ? path.join(androidSdk, "build-tools", REQUIRED_ANDROID_BUILD_TOOLS) : null,
    platforms: androidSdk ? path.join(androidSdk, "platforms") : null,
    requiredPlatform: androidSdk ? path.join(androidSdk, "platforms", REQUIRED_ANDROID_PLATFORM) : null,
    pathEntries
  };
}

function prepareBuildEnvironment(env = process.env) {
  return getRuntimeEnvironment(env).env;
}

module.exports = {
  REQUIRED_ANDROID_BUILD_TOOLS,
  REQUIRED_ANDROID_PLATFORM,
  defaultAndroidSdkCandidates,
  getAndroidSdkPath,
  getGradleHome,
  getJavaHome,
  getRuntimeEnvironment,
  prepareBuildEnvironment
};
