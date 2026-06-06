"use strict";

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { createCommandRunner } = require("../utils/command-runner");
const {
  REQUIRED_ANDROID_BUILD_TOOLS,
  REQUIRED_ANDROID_PLATFORM,
  getRuntimeEnvironment
} = require("./index");

async function pathExists(targetPath) {
  if (!targetPath) {
    return false;
  }

  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function checkWritableDirectory(targetPath) {
  try {
    await fs.mkdir(targetPath, { recursive: true });
    const probe = path.join(targetPath, `.html2apk-doctor-${Date.now()}.tmp`);
    await fs.writeFile(probe, "ok");
    await fs.rm(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function checkCommand(name, args, env) {
  const logs = [];
  const runner = createCommandRunner({ logs, env });
  try {
    const result = await runner.run(name, args);
    return {
      name,
      ok: true,
      details: (result.stdout || result.stderr || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] || "found"
    };
  } catch (error) {
    const output = [error.stderr, error.stdout]
      .filter(Boolean)
      .join("\n")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0];

    return {
      name,
      ok: false,
      details: output || error.message
    };
  }
}

async function runDoctor(options = {}) {
  const runtime = getRuntimeEnvironment();
  const checks = [];
  const env = runtime.env;
  const projectRoot = options.projectRoot || process.cwd();

  checks.push(await checkCommand("java", ["-version"], env));
  checks.push(await checkCommand("javac", ["-version"], env));
  checks.push(await checkCommand("gradle", ["-v"], env));
  checks.push(await checkCommand("cordova", ["--version"], env));

  const androidSdk = runtime.androidSdk;
  const sdkManager = runtime.cmdlineTools
    ? path.join(runtime.cmdlineTools, process.platform === "win32" ? "sdkmanager.bat" : "sdkmanager")
    : null;

  checks.push({
    name: "ANDROID_HOME or ANDROID_SDK_ROOT",
    ok: Boolean(androidSdk),
    details: androidSdk || "set ANDROID_HOME to your Android SDK directory"
  });

  checks.push({
    name: "Android platform-tools",
    ok: await pathExists(runtime.platformTools),
    details: runtime.platformTools || "install Android SDK platform-tools"
  });

  checks.push({
    name: "Android cmdline-tools",
    ok: await pathExists(runtime.cmdlineTools),
    details: runtime.cmdlineTools || "install Android command line tools"
  });

  checks.push({
    name: "Android sdkmanager",
    ok: await pathExists(sdkManager),
    details: sdkManager || "install Android command line tools"
  });

  checks.push({
    name: `Android build-tools ${REQUIRED_ANDROID_BUILD_TOOLS}`,
    ok: await pathExists(runtime.requiredBuildTools),
    details: runtime.requiredBuildTools || `install build-tools;${REQUIRED_ANDROID_BUILD_TOOLS} with sdkmanager`
  });

  checks.push({
    name: `Android platform ${REQUIRED_ANDROID_PLATFORM}`,
    ok: await pathExists(runtime.requiredPlatform),
    details: runtime.requiredPlatform || `install platforms;${REQUIRED_ANDROID_PLATFORM} with sdkmanager`
  });

  checks.push({
    name: "Project directory writable",
    ok: await checkWritableDirectory(projectRoot),
    details: projectRoot
  });

  checks.push({
    name: "Temporary directory writable",
    ok: await checkWritableDirectory(os.tmpdir()),
    details: os.tmpdir()
  });

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    checks,
    runtime,
    suggestions: [
      "Install a supported JDK and set JAVA_HOME.",
      "Install Android Studio or Android command line tools.",
      "Set ANDROID_HOME or ANDROID_SDK_ROOT, or install the SDK in the platform default path.",
      "Install Cordova globally with: npm install -g cordova.",
      `Install Android platform/build packages with: sdkmanager "platform-tools" "platforms;${REQUIRED_ANDROID_PLATFORM}" "build-tools;${REQUIRED_ANDROID_BUILD_TOOLS}".`
    ]
  };
}

function formatDoctorReport(report) {
  const lines = ["html2apk doctor", ""];
  for (const check of report.checks) {
    lines.push(`${check.ok ? "OK " : "ERR"} ${check.name}`);
    lines.push(`    ${check.details}`);
  }

  lines.push("");
  lines.push(report.ok ? "Environment looks ready." : "Missing requirements:");
  if (!report.ok) {
    for (const suggestion of report.suggestions) {
      lines.push(`- ${suggestion}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  runDoctor,
  formatDoctorReport
};
