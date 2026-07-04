"use strict";

const fs = require("fs/promises");
const path = require("path");
const { buildApk } = require("../core/build-apk");
const { runDoctor, formatDoctorReport } = require("../runtime-manager/doctor");

function printHelp() {
  console.log(`html2apk 0.1.0

Usage:
  html2apk init
  html2apk build [--release] [--debug] [--apk|--aab] [--show-runtime-logs] [--mode fullscreen|standalone|floating] [--theme fixed|auto] [--orientation vertical|horizontal] [--min-sdk 24] [--android-platform android@15.0.0]
  html2apk doctor

The current working directory is always treated as the user app root.`);
}

function parseBuildArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--release") {
      options.release = true;
    } else if (arg === "--debug") {
      options.debug = true;
    } else if (arg === "--aab") {
      options.buildFormat = "aab";
    } else if (arg === "--apk") {
      options.buildFormat = "apk";
    } else if (arg === "--show-runtime-logs" || arg === "--runtime-logs" || arg === "--mostrar-logs") {
      options.showRuntimeLogs = true;
    } else if (arg === "--build-format" || arg === "--output-format" || arg === "--format") {
      options.buildFormat = args[index + 1];
      index += 1;
    } else if (arg === "--mode") {
      options.mode = args[index + 1];
      index += 1;
    } else if (arg === "--orientation") {
      options.orientation = args[index + 1];
      index += 1;
    } else if (arg === "--theme-color") {
      options.themeColor = args[index + 1];
      index += 1;
    } else if (arg === "--theme" || arg === "--theme-mode") {
      options.themeMode = args[index + 1];
      index += 1;
    } else if (arg === "--min-sdk" || arg === "--min-sdk-version" || arg === "--minSdkVersion") {
      options.minSdkVersion = args[index + 1];
      index += 1;
    } else if (arg === "--entry-file") {
      options.entryFile = args[index + 1];
      index += 1;
    } else if (arg === "--web-root") {
      options.webRoot = args[index + 1];
      index += 1;
    } else if (arg === "--app-name") {
      options.appName = args[index + 1];
      index += 1;
    } else if (arg === "--package-id") {
      options.packageId = args[index + 1];
      index += 1;
    } else if (arg === "--android-platform") {
      options.androidPlatform = args[index + 1];
      index += 1;
    } else if (arg === "--url") {
      options.url = args[index + 1];
      index += 1;
    }
  }

  return options;
}

function packageSegment(value) {
  return String(value || "meuapp")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^[^a-z]+/, "") || "meuapp";
}

function createPlaceholderConfig(projectName = "MeuApp") {
  const appName = projectName || "MeuApp";
  return {
    _editMe: "Edite os campos abaixo e rode: html2apk doctor && html2apk build",
    appName,
    url: "",
    packageId: `com.seuapp.${packageSegment(appName)}`,
    version: "1.0.0",
    mode: "fullscreen",
    orientation: "default",
    minSdkVersion: 24,
    themeColor: "#126fff",
    themeMode: "fixed",
    oneSignalAppId: "",
    deepLinks: {
      schemes: [],
      appLinks: []
    },
    icon: "",
    splash: "",
    permissions: [
      "INTERNET",
      "POST_NOTIFICATIONS",
      "VIBRATE"
    ],
    plugins: [],
    release: false,
    buildFormat: "apk",
    showRuntimeLogs: false,
    androidPlatform: "android@15.0.0",
    keystore: {
      path: "",
      alias: "",
      storePassword: "",
      keyPassword: ""
    },
    debug: false,
    entryFile: "index.html",
    webRoot: ".",
    files: []
  };
}

async function initProject() {
  const appJsonPath = path.resolve(process.cwd(), "app.json");
  const indexPath = path.resolve(process.cwd(), "index.html");

  try {
    await fs.access(appJsonPath);
  } catch {
    const appName = path.basename(process.cwd()) || "MeuApp";
    const config = createPlaceholderConfig(appName);
    await fs.writeFile(appJsonPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }

  try {
    await fs.access(indexPath);
  } catch {
    await fs.writeFile(indexPath, `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>html2apk app</title>
</head>
<body>
  <h1>html2apk</h1>
  <button onclick="toast('Ola do Android')">Toast</button>
  <button onclick="notificar('Notificacao enviada')">Notificar</button>
  <script src="cordova.js"></script>
</body>
</html>
`, "utf8");
  }

  console.log("Created app.json and index.html when missing.");
}

async function runCli(argv) {
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await initProject();
    return;
  }

  if (command === "doctor") {
    const report = await runDoctor();
    console.log(formatDoctorReport(report));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === "build") {
    const options = parseBuildArgs(argv.slice(1));
    const result = await buildApk(options);
    console.log(`APK generated: ${result.apkPath}`);
    if (result.buildDir) {
      console.log(`Build directory kept: ${result.buildDir}`);
    }
    return;
  }

  printHelp();
  process.exitCode = 1;
}

module.exports = {
  createPlaceholderConfig,
  runCli,
  parseBuildArgs
};
