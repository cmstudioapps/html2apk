"use strict";

const DEFAULT_ANDROID_PLATFORM = "android@15.0.0";

async function createCordovaProject(buildDir, options, runner) {
  await runner.run("cordova", [
    "create",
    buildDir,
    options.packageId,
    options.appName,
    "--no-telemetry"
  ]);
}

async function addCordovaPlugin(buildDir, plugin, runner) {
  await runner.run("cordova", ["plugin", "add", plugin, "--no-telemetry"], {
    cwd: buildDir
  });
}

function androidPlatformSpec(options = {}) {
  return options.androidPlatform || DEFAULT_ANDROID_PLATFORM;
}

async function addAndroidPlatform(buildDir, options, runner) {
  await runner.run("cordova", ["platform", "add", androidPlatformSpec(options), "--no-telemetry"], {
    cwd: buildDir
  });
}

async function buildAndroid(buildDir, options, buildJsonPath, runner) {
  const args = ["build", "android", "--no-telemetry"];
  const wantsBundle = String(options.buildFormat || options.outputFormat || options.packageType || "").toLowerCase() === "aab";

  if (options.release) {
    args.push("--release");
  } else {
    args.push("--debug");
  }

  if (buildJsonPath) {
    args.push("--buildConfig", buildJsonPath);
  }

  if (wantsBundle) {
    args.push("--", "--packageType=bundle");
  }

  await runner.run("cordova", args, {
    cwd: buildDir,
    pipeOutput: options.debug
  });
}

async function runAndroidDevice(buildDir, options, buildJsonPath, runner, deviceId) {
  const args = ["run", "android", "--device", "--debug", "--no-telemetry"];

  if (deviceId) {
    args.push(`--target=${deviceId}`);
  }

  if (buildJsonPath) {
    args.push("--buildConfig", buildJsonPath);
  }

  await runner.run("cordova", args, {
    cwd: buildDir,
    pipeOutput: options.debug
  });
}

module.exports = {
  DEFAULT_ANDROID_PLATFORM,
  createCordovaProject,
  addCordovaPlugin,
  addAndroidPlatform,
  buildAndroid,
  runAndroidDevice
};
