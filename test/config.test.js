"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { renderConfigXml } = require("../src/cordova/config-xml");
const { createPlaceholderConfig, parseBuildArgs } = require("../src/cli");
const { getRuntimeEnvironment } = require("../src/runtime-manager");
const { resolveBuildOptions } = require("../src/core/config");
const { defaultAppIconPath, injectCordovaRuntimeIntoHtml, installCordovaRuntimeScript, parseAdbDevices } = require("../src/core/build-apk");

test("parseBuildArgs maps common CLI flags", () => {
  assert.deepEqual(parseBuildArgs(["--release", "--debug", "--aab", "--show-runtime-logs", "--mode", "floating", "--orientation", "horizontal", "--theme-color", "#123abc", "--min-sdk", "26", "--android-platform", "android@15.0.0"]), {
    release: true,
    debug: true,
    buildFormat: "aab",
    showRuntimeLogs: true,
    mode: "floating",
    orientation: "horizontal",
    themeColor: "#123abc",
    minSdkVersion: "26",
    androidPlatform: "android@15.0.0"
  });
});

test("parseBuildArgs maps automatic APK theme mode", () => {
  assert.deepEqual(parseBuildArgs(["--theme", "auto"]), {
    themeMode: "auto"
  });
});

test("createPlaceholderConfig includes every editable app.json field safely", () => {
  const config = createPlaceholderConfig("Meu App");

  assert.equal(config.appName, "Meu App");
  assert.equal(config.packageId, "com.seuapp.meuapp");
  assert.equal(config.icon, "");
  assert.equal(config.splash, "");
  assert.equal(config.orientation, "default");
  assert.equal(config.minSdkVersion, 24);
  assert.equal(config.themeColor, "#126fff");
  assert.equal(config.themeMode, "fixed");
  assert.equal(config.buildFormat, "apk");
  assert.equal(config.showRuntimeLogs, false);
  assert.equal(config.oneSignalAppId, "");
  assert.equal(config.keystore.path, "");
  assert.deepEqual(Object.keys(config).sort(), [
    "_editMe",
    "appName",
    "androidPlatform",
    "buildFormat",
    "debug",
    "deepLinks",
    "entryFile",
    "files",
    "icon",
    "keystore",
    "mode",
    "minSdkVersion",
    "oneSignalAppId",
    "orientation",
    "packageId",
    "permissions",
    "plugins",
    "release",
    "showRuntimeLogs",
    "splash",
    "themeColor",
    "themeMode",
    "version",
    "webRoot"
  ].sort());
  assert.deepEqual(config.deepLinks, { schemes: [], appLinks: [] });
});

test("npm package config excludes generated Android artifacts", async () => {
  const packageJson = JSON.parse(await fs.readFile(path.resolve(__dirname, "..", "package.json"), "utf8"));

  assert.equal(packageJson.bin.html2apk, "bin/html2apk.js");
  assert.ok(packageJson.files.includes("examples/minimal/app.json"));
  assert.ok(packageJson.files.includes("examples/minimal/index.html"));
  assert.ok(!packageJson.files.includes("examples"));
  assert.ok(!packageJson.files.some((entry) => /(^|\/)dist(\/|$)|\.apk$|\.aab$/i.test(entry)));
});

test("build injects optional runtime console between bridge and cordova", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-html-"));
  const htmlPath = path.join(dir, "index.html");
  try {
    await fs.writeFile(htmlPath, "<!doctype html><html><head><script src=\"app.js\"></script></head><body></body></html>");

    const injected = await injectCordovaRuntimeIntoHtml(htmlPath, "cordova.js", "html2apk-early-bridge.js", "html2apk-runtime-console.js");
    const html = await fs.readFile(htmlPath, "utf8");

    assert.equal(injected, true);
    assert.match(html, /<script src="html2apk-early-bridge\.js"><\/script>\s*<script src="html2apk-runtime-console\.js"><\/script>\s*<script src="cordova\.js"><\/script>/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("build injects runtime scripts into every HTML page", async () => {
  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-build-"));
  const wwwDir = path.join(buildDir, "www");
  const nestedDir = path.join(wwwDir, "pages");
  try {
    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(wwwDir, "index.html"), "<!doctype html><html><head></head><body></body></html>");
    await fs.writeFile(path.join(nestedDir, "about.html"), "<!doctype html><html><head></head><body></body></html>");

    const count = await installCordovaRuntimeScript(buildDir, {
      entryFile: "index.html",
      showRuntimeLogs: true
    });
    const rootHtml = await fs.readFile(path.join(wwwDir, "index.html"), "utf8");
    const nestedHtml = await fs.readFile(path.join(nestedDir, "about.html"), "utf8");

    assert.equal(count, 2);
    assert.match(rootHtml, /<script src="html2apk-early-bridge\.js"><\/script>\s*<script src="html2apk-runtime-console\.js"><\/script>\s*<script src="cordova\.js"><\/script>/);
    assert.match(nestedHtml, /<script src="\.\.\/html2apk-early-bridge\.js"><\/script>\s*<script src="\.\.\/html2apk-runtime-console\.js"><\/script>\s*<script src="\.\.\/cordova\.js"><\/script>/);
    assert.ok(await fs.stat(path.join(wwwDir, "html2apk-console.png")));
  } finally {
    await fs.rm(buildDir, { recursive: true, force: true });
  }
});

test("default app icon points to bundled html2apk png", async () => {
  const iconPath = defaultAppIconPath();
  const stat = await fs.stat(iconPath);

  assert.equal(path.basename(iconPath), "html2apk.png");
  assert.ok(stat.size > 0);
});

test("parseAdbDevices reads ready and unauthorized USB devices", () => {
  assert.deepEqual(parseAdbDevices(`* daemon started successfully
List of devices attached
R58N1234	device
emulator-5554	device
ABCDEF	unauthorized
adb server is out of date
`), [
    { id: "R58N1234", status: "device" },
    { id: "emulator-5554", status: "device" },
    { id: "ABCDEF", status: "unauthorized" }
  ]);
});

test("renderConfigXml writes optional OneSignal App ID preference", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "fullscreen",
    permissions: [],
    oneSignalAppId: "11111111-2222-3333-4444-555555555555",
    entryFile: "index.html"
  });

  assert.match(xml, /<preference name="Html2ApkOneSignalAppId" value="11111111-2222-3333-4444-555555555555" \/>/);
});

test("build injects cordova.js at the top of entry HTML when missing", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-html-"));
  const htmlPath = path.join(dir, "index.html");
  try {
    await fs.writeFile(htmlPath, "<!doctype html><html><head><script src=\"app.js\"></script></head><body></body></html>");

    const injected = await injectCordovaRuntimeIntoHtml(htmlPath);
    const html = await fs.readFile(htmlPath, "utf8");

    assert.equal(injected, true);
    assert.match(html, /<head>\s*<script src="html2apk-early-bridge\.js"><\/script>\s*<script src="cordova\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("build injects early bridge without duplicating existing cordova.js", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-html-"));
  const htmlPath = path.join(dir, "index.html");
  try {
    await fs.writeFile(htmlPath, "<!doctype html><script src=\"cordova.js\"></script>");

    const injected = await injectCordovaRuntimeIntoHtml(htmlPath);
    const html = await fs.readFile(htmlPath, "utf8");

    assert.equal(injected, true);
    assert.equal((html.match(/cordova\.js/g) || []).length, 1);
    assert.equal((html.match(/html2apk-early-bridge\.js/g) || []).length, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("renderConfigXml writes manifest permissions through config-file", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "fullscreen",
    permissions: ["INTERNET", "android.permission.CAMERA"],
    entryFile: "index.html"
  });

  assert.match(xml, /<config-file target="AndroidManifest.xml" parent="\/manifest">/);
  assert.match(xml, /android.permission.INTERNET/);
  assert.match(xml, /android.permission.CAMERA/);
  assert.match(xml, /<preference name="Fullscreen" value="true" \/>/);
});

test("renderConfigXml uses the app icon as the Android startup splash", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "fullscreen",
    permissions: [],
    icon: "res/html2apk/icon.png",
    androidSplashScreenAnimatedIcon: "C:\\tmp\\html2apk\\res\\html2apk\\icon.png",
    entryFile: "index.html"
  });

  assert.match(xml, /<icon src="res\/html2apk\/icon\.png" \/>/);
  assert.match(xml, /AndroidWindowSplashScreenAnimatedIcon/);
  assert.match(xml, /C:\\tmp\\html2apk\\res\\html2apk\\icon\.png/);
  assert.doesNotMatch(xml, /<splash /);
});

test("renderConfigXml applies themeColor to Android background preferences", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "fullscreen",
    permissions: [],
    icon: "res/html2apk/icon.png",
    themeColor: "#123abc",
    entryFile: "index.html"
  });

  assert.match(xml, /<preference name="BackgroundColor" value="#123abc" \/>/);
  assert.match(xml, /<preference name="Html2ApkThemeMode" value="fixed" \/>/);
  assert.match(xml, /<preference name="AndroidWindowSplashScreenBackground" value="#123abc" \/>/);
});

test("resolveBuildOptions accepts theme auto alias with color fallback", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-project-"));
  try {
    await fs.writeFile(path.join(project, "index.html"), "<!doctype html>");
    await fs.writeFile(path.join(project, "app.json"), JSON.stringify({
      appName: "AutoTheme",
      packageId: "com.example.autotheme",
      theme: "auto",
      themeColor: "auto",
      oneSignal: {
        appId: "11111111-2222-3333-4444-555555555555"
      }
    }));

    const result = await resolveBuildOptions({ projectRoot: project });

    assert.equal(result.options.themeMode, "auto");
    assert.equal(result.options.theme, "auto");
    assert.equal(result.options.themeColor, "#126fff");
    assert.equal(result.options.oneSignalAppId, "11111111-2222-3333-4444-555555555555");
  } finally {
    await fs.rm(project, { recursive: true, force: true });
  }
});

test("resolveBuildOptions normalizes AAB builds as release artifacts", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-project-"));
  try {
    await fs.writeFile(path.join(project, "index.html"), "<!doctype html>");
    await fs.writeFile(path.join(project, "app.json"), JSON.stringify({
      appName: "BundleApp",
      packageId: "com.example.bundle",
      buildFormat: "aab"
    }));

    const result = await resolveBuildOptions({ projectRoot: project });

    assert.equal(result.options.buildFormat, "aab");
    assert.equal(result.options.release, true);
  } finally {
    await fs.rm(project, { recursive: true, force: true });
  }
});

test("renderConfigXml applies Android minimum SDK preference", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "fullscreen",
    minSdkVersion: 26,
    permissions: [],
    entryFile: "index.html"
  });

  assert.match(xml, /<preference name="android-minSdkVersion" value="26" \/>/);
});

test("renderConfigXml applies orientation and floating mode permissions", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "floating",
    orientation: "landscape",
    permissions: ["INTERNET"],
    entryFile: "index.html"
  });

  assert.match(xml, /<preference name="Html2ApkMode" value="floating" \/>/);
  assert.match(xml, /<preference name="Orientation" value="landscape" \/>/);
  assert.match(xml, /android.permission.SYSTEM_ALERT_WINDOW/);
});

test("renderConfigXml writes deep link intent filters", () => {
  const xml = renderConfigXml({
    appName: "MeuApp",
    packageId: "com.example.meuapp",
    version: "1.0.0",
    mode: "fullscreen",
    permissions: [],
    entryFile: "index.html",
    deepLinks: {
      schemes: ["meuapp"],
      appLinks: [
        {
          host: "example.com",
          paths: ["/produto/*"],
          autoVerify: true
        }
      ]
    }
  });

  assert.match(xml, /android:scheme="meuapp"/);
  assert.match(xml, /android:autoVerify="true"/);
  assert.match(xml, /android:host="example\.com"/);
  assert.match(xml, /android:pathPattern="\/produto\/\.\*"/);
});

test("runtime-manager prepares Android SDK paths from default locations", async () => {
  const sdk = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-sdk-"));
  try {
    await fs.mkdir(path.join(sdk, "platform-tools"), { recursive: true });
    await fs.mkdir(path.join(sdk, "cmdline-tools", "latest", "bin"), { recursive: true });
    await fs.mkdir(path.join(sdk, "platforms", "android-36"), { recursive: true });
    await fs.mkdir(path.join(sdk, "build-tools", "36.0.0"), { recursive: true });

    const runtime = getRuntimeEnvironment({
      ANDROID_HOME: sdk,
      PATH: ""
    });

    assert.equal(runtime.androidSdk, sdk);
    assert.equal(runtime.env.ANDROID_SDK_ROOT, sdk);
    assert.match(runtime.env.PATH || runtime.env.Path, /platform-tools/);
    assert.match(runtime.buildTools, /36\.0\.0/);
    assert.match(runtime.requiredPlatform, /android-36/);
    assert.match(runtime.requiredBuildTools, /36\.0\.0/);
  } finally {
    await fs.rm(sdk, { recursive: true, force: true });
  }
});

test("bridge exposes production notification APIs", async () => {
  const bridge = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "cordova-plugin-html2apk-bridge", "www", "html2apk-bridge.js"),
    "utf8"
  );
  const earlyBridge = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "html2apk-early-bridge.js"),
    "utf8"
  );
  const runtimeConsole = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "html2apk-runtime-console.js"),
    "utf8"
  );
  const plugin = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "cordova-plugin-html2apk-bridge", "plugin.xml"),
    "utf8"
  );
  const java = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "cordova-plugin-html2apk-bridge", "src", "android", "Html2ApkBridge.java"),
    "utf8"
  );
  const floatingService = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "cordova-plugin-html2apk-bridge", "src", "android", "FloatingIconService.java"),
    "utf8"
  );

  assert.match(bridge, /solicitarPermissaoNotificacoes/);
  assert.match(earlyBridge, /Html2ApkEarlyBridge/);
  assert.match(earlyBridge, /window\[key\] = api\[key\]/);
  assert.match(earlyBridge, /requestCameraPermission/);
  assert.match(earlyBridge, /requestNotificationPermission/);
  assert.match(earlyBridge, /deviceready/);
  assert.match(bridge, /aoClicarNotificacao/);
  assert.match(bridge, /registerNotificationAction/);
  assert.match(bridge, /executeNotificationClickAction/);
  assert.match(bridge, /functionName/);
  assert.match(bridge, /callbackId/);
  assert.match(bridge, /action: "open-app"/);
  assert.match(earlyBridge, /action: "open-app"/);
  assert.match(bridge, /notificationOpenValue/);
  assert.match(earlyBridge, /whenCordovaBridgeReady/);
  assert.match(earlyBridge, /executeNotificationClickAction/);
  assert.match(runtimeConsole, /Html2ApkRuntimeConsole/);
  assert.match(runtimeConsole, /wrapKnownFunctions/);
  assert.match(runtimeConsole, /unhandledrejection/);
  assert.match(runtimeConsole, /installNetworkHooks/);
  assert.match(runtimeConsole, /window\.fetch/);
  assert.match(runtimeConsole, /XMLHttpRequest/);
  assert.match(runtimeConsole, /networkEntries/);
  assert.match(runtimeConsole, /html2apk-console\.png/);
  assert.match(runtimeConsole, /pointerdown/);
  assert.match(runtimeConsole, /Copiar console/);
  assert.match(runtimeConsole, /Copiar apenas erros/);
  assert.match(runtimeConsole, /copyErrors/);
  assert.match(runtimeConsole, /runtimeConsoleText/);
  assert.match(bridge, /manterTelaAcordada/);
  assert.match(bridge, /iniciarIconeFlutuante/);
  assert.match(bridge, /capturarTela: function \(options\)/);
  assert.match(bridge, /tirarPrint: function \(options\)/);
  assert.match(bridge, /volumeAtual: function \(\)/);
  assert.match(bridge, /definirVolume: function \(streamOrOptions, value, options\)/);
  assert.match(bridge, /aumentarVolume: function \(streamOrOptions, amountOrOptions, options\)/);
  assert.match(bridge, /diminuirVolume: function \(streamOrOptions, amountOrOptions, options\)/);
  assert.match(bridge, /configurarIconeFlutuante: function \(options\)/);
  assert.match(bridge, /definirOpacidadeIconeFlutuante: function \(opacity\)/);
  assert.match(bridge, /minimizarApp: function \(\)/);
  assert.match(bridge, /fecharApp: function \(\)/);
  assert.match(bridge, /captureScreen: api\.capturarTela/);
  assert.match(bridge, /takeScreenshot: api\.capturarTela/);
  assert.match(bridge, /getVolume: api\.volumeAtual/);
  assert.match(bridge, /setVolume: api\.definirVolume/);
  assert.match(bridge, /increaseVolume: api\.aumentarVolume/);
  assert.match(bridge, /decreaseVolume: api\.diminuirVolume/);
  assert.match(bridge, /configureFloatingIcon: api\.configurarIconeFlutuante/);
  assert.match(bridge, /setFloatingIconOpacity: api\.definirOpacidadeIconeFlutuante/);
  assert.match(bridge, /minimizeApp: api\.minimizarApp/);
  assert.match(bridge, /closeApp: api\.fecharApp/);
  assert.match(bridge, /lanterna/);
  assert.match(bridge, /aguardar: function \(ms\)/);
  assert.match(bridge, /loading: api\.aguardar/);
  assert.match(earlyBridge, /aguardar: function \(ms\)/);
  assert.match(earlyBridge, /capturarTela: function \(options\)/);
  assert.match(earlyBridge, /captureScreen: api\.capturarTela/);
  assert.match(earlyBridge, /definirVolume: function \(streamOrOptions, value, options\)/);
  assert.match(earlyBridge, /setVolume: api\.definirVolume/);
  assert.match(earlyBridge, /definirOpacidadeIconeFlutuante: function \(opacity\)/);
  assert.match(earlyBridge, /minimizeApp: api\.minimizarApp/);
  assert.match(earlyBridge, /closeApp: api\.fecharApp/);
  assert.match(bridge, /tirarFoto/);
  assert.match(bridge, /escanearQRCode/);
  assert.match(bridge, /ouvirMic/);
  assert.match(bridge, /pararMic/);
  assert.match(bridge, /escolherArquivo/);
  assert.match(bridge, /lerArquivo/);
  assert.match(bridge, /baixarArquivo/);
  assert.match(bridge, /baixarBase64/);
  assert.match(bridge, /baixarArquivoLocal/);
  assert.match(bridge, /baixarArquivo: function \(urlOrOptions, nameOrOptions, options\)/);
  assert.match(earlyBridge, /baixarArquivo: function \(urlOrOptions, nameOrOptions, options\)/);
  assert.match(bridge, /baixarArquivoLocal: function \(fileOrOptions, nameOrOptions, options\)/);
  assert.match(earlyBridge, /baixarArquivoLocal: function \(fileOrOptions, nameOrOptions, options\)/);
  assert.match(bridge, /escolherImagens: function \(options\)/);
  assert.match(earlyBridge, /escolherImagens: function \(options\)/);
  assert.match(bridge, /ocr: function \(sourceOrOptions\)/);
  assert.match(bridge, /falar: function \(text, options\)/);
  assert.match(bridge, /pararFala: function \(\)/);
  assert.match(bridge, /ouvir: function \(options\)/);
  assert.match(bridge, /aoReceberCompartilhamento/);
  assert.match(bridge, /getInitialShare: api\.obterCompartilhamentoInicial/);
  assert.match(bridge, /onShareReceived: api\.aoReceberCompartilhamento/);
  assert.match(bridge, /procurarBT: function \(options\)/);
  assert.match(bridge, /conectarBT: function \(idDispositivo\)/);
  assert.match(bridge, /enviarBT: function \(data\)/);
  assert.match(bridge, /aoConectarBT: function \(listener\)/);
  assert.match(bridge, /aoReceberDadosBT: function \(listener\)/);
  assert.match(bridge, /aoDarErroBT: function \(listener\)/);
  assert.match(bridge, /scanBluetooth: api\.procurarBT/);
  assert.match(bridge, /connectBluetooth: api\.conectarBT/);
  assert.match(bridge, /sendBluetooth: api\.enviarBT/);
  assert.match(bridge, /onBluetoothError: api\.aoDarErroBT/);
  assert.match(bridge, /"bluetooth:error": "bluetooth:erro"/);
  assert.match(bridge, /procurarWiFi: function \(options\)/);
  assert.match(bridge, /conectarWiFi: function \(idDispositivo\)/);
  assert.match(bridge, /enviarWiFi: function \(data\)/);
  assert.match(bridge, /aoConectarWiFi: function \(listener\)/);
  assert.match(bridge, /aoReceberDadosWiFi: function \(listener\)/);
  assert.match(bridge, /aoDarErroWiFi: function \(listener\)/);
  assert.match(bridge, /scanWiFi: api\.procurarWiFi/);
  assert.match(bridge, /connectWiFi: api\.conectarWiFi/);
  assert.match(bridge, /sendWiFi: api\.enviarWiFi/);
  assert.match(bridge, /onWiFiError: api\.aoDarErroWiFi/);
  assert.match(bridge, /"wifi:error": "wifi:erro"/);
  assert.match(bridge, /aoConectarUSB: function \(listener\)/);
  assert.match(bridge, /aoDesconectarUSB: function \(listener\)/);
  assert.match(bridge, /aoConectarFone: function \(listener\)/);
  assert.match(bridge, /aoDesconectarFone: function \(listener\)/);
  assert.match(bridge, /aoMudarVolume: function \(listener\)/);
  assert.match(bridge, /aoAbrirTeclado: function \(listener\)/);
  assert.match(bridge, /aoFecharTeclado: function \(listener\)/);
  assert.match(bridge, /aoSacudirCelular: function \(listener\)/);
  assert.match(bridge, /aoVirarCelularParaBaixo: function \(listener\)/);
  assert.match(bridge, /aoAproximarObjeto: function \(listener\)/);
  assert.match(bridge, /aoTirarPrint: function \(listener\)/);
  assert.match(bridge, /aoMudarOrientacao: function \(listener\)/);
  assert.match(bridge, /aoNFC: function \(listener\)/);
  assert.match(bridge, /aoReceberNotificacao: function \(listener\)/);
  assert.match(bridge, /onUSBConnect: api\.aoConectarUSB/);
  assert.match(bridge, /onUSBDisconnect: api\.aoDesconectarUSB/);
  assert.match(bridge, /onHeadphoneConnect: api\.aoConectarFone/);
  assert.match(bridge, /onVolumeChange: api\.aoMudarVolume/);
  assert.match(bridge, /onKeyboardOpen: api\.aoAbrirTeclado/);
  assert.match(bridge, /onPhoneShake: api\.aoSacudirCelular/);
  assert.match(bridge, /onScreenshot: api\.aoTirarPrint/);
  assert.match(bridge, /onNFC: api\.aoNFC/);
  assert.match(bridge, /onNotificationReceived: api\.aoReceberNotificacao/);
  assert.match(bridge, /"usb:connected": "usb:conectado"/);
  assert.match(bridge, /"headphone:connected": "fone:conectado"/);
  assert.match(bridge, /"nfc:received": "nfc:recebido"/);
  assert.match(bridge, /recognizeText: api\.ocr/);
  assert.match(bridge, /speak: api\.falar/);
  assert.match(bridge, /recognizeSpeech: api\.ouvir/);
  assert.match(earlyBridge, /getInitialShare: api\.obterCompartilhamentoInicial/);
  assert.match(earlyBridge, /procurarBT/);
  assert.match(earlyBridge, /aoDarErroBT/);
  assert.match(earlyBridge, /onBluetoothError: api\.aoDarErroBT/);
  assert.match(earlyBridge, /procurarWiFi/);
  assert.match(earlyBridge, /aoDarErroWiFi/);
  assert.match(earlyBridge, /onWiFiError: api\.aoDarErroWiFi/);
  assert.match(earlyBridge, /aoConectarUSB/);
  assert.match(earlyBridge, /aoDesconectarUSB/);
  assert.match(earlyBridge, /aoConectarFone/);
  assert.match(earlyBridge, /aoMudarVolume/);
  assert.match(earlyBridge, /aoAbrirTeclado/);
  assert.match(earlyBridge, /aoSacudirCelular/);
  assert.match(earlyBridge, /aoTirarPrint/);
  assert.match(earlyBridge, /aoNFC/);
  assert.match(earlyBridge, /aoReceberNotificacao/);
  assert.match(earlyBridge, /onNotificationReceived: api\.aoReceberNotificacao/);
  assert.match(runtimeConsole, /aoReceberCompartilhamento/);
  assert.match(runtimeConsole, /procurarBT/);
  assert.match(runtimeConsole, /aoReceberDadosBT/);
  assert.match(runtimeConsole, /aoDarErroBT/);
  assert.match(runtimeConsole, /procurarWiFi/);
  assert.match(runtimeConsole, /aoReceberDadosWiFi/);
  assert.match(runtimeConsole, /aoDarErroWiFi/);
  assert.match(runtimeConsole, /aoConectarUSB/);
  assert.match(runtimeConsole, /aoDesconectarUSB/);
  assert.match(runtimeConsole, /aoConectarFone/);
  assert.match(runtimeConsole, /aoMudarVolume/);
  assert.match(runtimeConsole, /aoAbrirTeclado/);
  assert.match(runtimeConsole, /aoSacudirCelular/);
  assert.match(runtimeConsole, /aoTirarPrint/);
  assert.match(runtimeConsole, /aoNFC/);
  assert.match(runtimeConsole, /aoReceberNotificacao/);
  assert.match(runtimeConsole, /capturarTela/);
  assert.match(runtimeConsole, /volumeAtual/);
  assert.match(runtimeConsole, /definirVolume/);
  assert.match(runtimeConsole, /definirOpacidadeIconeFlutuante/);
  assert.match(runtimeConsole, /minimizarApp/);
  assert.match(runtimeConsole, /fecharApp/);
  assert.match(runtimeConsole, /recognizeSpeech/);
  assert.match(bridge, /definirPapelParede/);
  assert.match(runtimeConsole, /definirPapelParede/);
  assert.match(bridge, /infoDesempenho/);
  assert.match(bridge, /appsAbertos/);
  assert.match(bridge, /obterLocalizacao/);
  assert.match(bridge, /autenticarBiometria/);
  assert.match(bridge, /salvarSeguro/);
  assert.match(bridge, /aoEvento/);
  assert.match(bridge, /notify: api\.notificar/);
  assert.match(bridge, /scheduleNotifications: api\.agendarNotificacoes/);
  assert.match(bridge, /scheduleNotificationLoop: api\.agendarLoopNotificacoes/);
  assert.match(bridge, /cancelNotification: api\.cancelarNotificacao/);
  assert.match(bridge, /pickFile: api\.escolherArquivo/);
  assert.match(bridge, /openInApp: api\.abrirNoApp/);
  assert.match(bridge, /openOutsideApp: api\.abrirForaDoApp/);
  assert.match(bridge, /setThemeColor: api\.definirCorTema/);
  assert.match(bridge, /listenMic: api\.ouvirMic/);
  assert.match(bridge, /stopMic: api\.pararMic/);
  assert.match(bridge, /openAppsMemory: api\.appsAbertos/);
  assert.match(bridge, /downloadBase64: api\.baixarBase64/);
  assert.match(bridge, /downloadLocalFile: api\.baixarArquivoLocal/);
  assert.match(bridge, /share_me: api\.compartilharApp/);
  assert.match(bridge, /shareApp: api\.compartilharApp/);
  assert.match(runtimeConsole, /aguardar/);
  assert.match(runtimeConsole, /loading/);
  assert.match(bridge, /getLocation: api\.obterLocalizacao/);
  assert.match(bridge, /authenticateBiometric: api\.autenticarBiometria/);
  assert.match(bridge, /setWallpaper: api\.definirPapelParede/);
  assert.match(bridge, /onEvent: api\.aoEvento/);
  assert.match(bridge, /"notification:clicked": "notificacao:clicada"/);
  assert.match(bridge, /"location:changed": "localizacao:mudou"/);
  assert.match(bridge, /html2apk:notification/);
  assert.match(plugin, /BootReceiver/);
  assert.match(plugin, /FloatingIconService/);
  assert.match(plugin, /NotificationClickReceiver/);
  assert.match(plugin, /FileProvider/);
  assert.match(plugin, /html2apk_file_paths/);
  assert.match(plugin, /android.permission.CAMERA/);
  assert.match(plugin, /android.permission.RECORD_AUDIO/);
  assert.match(plugin, /android.permission.ACCESS_FINE_LOCATION/);
  assert.match(plugin, /android.permission.ACCESS_COARSE_LOCATION/);
  assert.match(plugin, /android.permission.USE_BIOMETRIC/);
  assert.match(plugin, /android.permission.SET_WALLPAPER/);
  assert.match(plugin, /android.permission.INTERNET/);
  assert.match(plugin, /android.permission.ACCESS_NETWORK_STATE/);
  assert.match(plugin, /android.permission.ACCESS_WIFI_STATE/);
  assert.match(plugin, /android.permission.CHANGE_WIFI_MULTICAST_STATE/);
  assert.match(plugin, /android.permission.MODIFY_AUDIO_SETTINGS/);
  assert.match(plugin, /android.permission.SYSTEM_ALERT_WINDOW/);
  assert.match(plugin, /android.permission.NFC/);
  assert.match(plugin, /android.permission.BLUETOOTH_SCAN/);
  assert.match(plugin, /android.permission.BLUETOOTH_CONNECT/);
  assert.match(plugin, /android.permission.BLUETOOTH_ADMIN/);
  assert.match(plugin, /android.hardware.bluetooth/);
  assert.match(plugin, /android.hardware.nfc/);
  assert.match(plugin, /RECEIVE_BOOT_COMPLETED/);
  assert.match(plugin, /android.intent.action.SEND/);
  assert.match(plugin, /android.intent.action.SEND_MULTIPLE/);
  assert.match(plugin, /text\/plain/);
  assert.match(plugin, /image\/\*/);
  assert.match(plugin, /video\/\*/);
  assert.match(plugin, /application\/pdf/);
  assert.match(plugin, /com\.google\.mlkit:text-recognition/);
  assert.match(java, /openSettingsForRuntimePermission/);
  assert.match(java, /rememberRuntimePermissionRequest/);
  assert.match(java, /cordova\.requestPermission\(this, REQUEST_CAMERA, Manifest\.permission\.CAMERA\)/);
  assert.match(java, /cordova\.requestPermission\(this, REQUEST_RECORD_AUDIO, Manifest\.permission\.RECORD_AUDIO\)/);
  assert.match(java, /cordova\.requestPermission\(this, REQUEST_POST_NOTIFICATIONS, Manifest\.permission\.POST_NOTIFICATIONS\)/);
  assert.match(java, /createNotificationClickIntent/);
  assert.match(java, /shouldOpenAppForNotificationClick/);
  assert.match(java, /handleNotificationClickBroadcast/);
  assert.doesNotMatch(java, /openSettingsForRuntimePermission\(Manifest\.permission\.CAMERA, true, false\)/);
  assert.doesNotMatch(java, /openSettingsForRuntimePermission\(Manifest\.permission\.RECORD_AUDIO, true, false\)/);
  assert.doesNotMatch(java, /openSettingsForRuntimePermission\(Manifest\.permission\.POST_NOTIFICATIONS, true, false\)/);
  assert.match(java, /settingsOpened/);
  assert.match(java, /wantsExactAlarm/);
  assert.match(java, /rejectBusyCallback/);
  assert.match(java, /hasPendingNotificationPermissionRequest/);
  assert.match(java, /hasPendingCameraPermissionRequest/);
  assert.match(java, /hasPendingMicrophonePermissionRequest/);
  assert.match(java, /File picker/);
  assert.match(java, /Folder picker/);
  assert.match(java, /File save dialog/);
  assert.match(java, /capturePhoto/);
  assert.match(java, /saveStoredFile/);
  assert.match(java, /shareCurrentApp/);
  assert.match(java, /notifyDownloadProgress/);
  assert.match(java, /appendDownloadPublication/);
  assert.match(java, /MediaStore\.MediaColumns\.RELATIVE_PATH/);
  assert.match(java, /shouldRefreshIndeterminateProgress/);
  assert.match(java, /setProgress\(100, progress, false\)/);
  assert.match(java, /MediaStore\.ACTION_PICK_IMAGES/);
  assert.match(java, /Intent\.ACTION_OPEN_DOCUMENT_TREE/);
  assert.match(java, /takePersistableUriPermission/);
  assert.match(java, /TextRecognition\.getClient/);
  assert.match(java, /TextToSpeech/);
  assert.match(java, /RecognizerIntent\.ACTION_RECOGNIZE_SPEECH/);
  assert.match(java, /handleSharedIntent/);
  assert.match(java, /Intent\.ACTION_SEND_MULTIPLE/);
  assert.match(java, /BluetoothAdapter/);
  assert.match(java, /BluetoothServerSocket/);
  assert.match(java, /BluetoothSocket/);
  assert.match(java, /scanBluetooth/);
  assert.match(java, /connectBluetooth/);
  assert.match(java, /sendBluetooth/);
  assert.match(java, /dispatchEvent\("bluetooth:dados"/);
  assert.match(java, /dispatchEvent\("bluetooth:erro"/);
  assert.match(java, /NsdManager/);
  assert.match(java, /ServerSocket/);
  assert.match(java, /scanWifi/);
  assert.match(java, /connectWifi/);
  assert.match(java, /sendWifi/);
  assert.match(java, /dispatchEvent\("wifi:dados"/);
  assert.match(java, /dispatchEvent\("wifi:erro"/);
  assert.match(java, /UsbManager/);
  assert.match(java, /UsbDevice/);
  assert.match(java, /dispatchEvent\("usb:conectado"/);
  assert.match(java, /dispatchEvent\("usb:desconectado"/);
  assert.match(java, /AudioDeviceCallback/);
  assert.match(java, /"fone:conectado"/);
  assert.match(java, /"fone:desconectado"/);
  assert.match(java, /dispatchEvent\("volume:mudou"/);
  assert.match(java, /"captureScreen"\.equals\(action\)/);
  assert.match(java, /captureScreenOnUiThread/);
  assert.match(java, /View\.draw|root\.draw/);
  assert.match(java, /"getVolume"\.equals\(action\)/);
  assert.match(java, /"setVolume"\.equals\(action\)/);
  assert.match(java, /"adjustVolume"\.equals\(action\)/);
  assert.match(java, /manager\.setStreamVolume/);
  assert.match(java, /"configureFloatingIcon"\.equals\(action\)/);
  assert.match(java, /FLOATING_ICON_OPACITY_KEY/);
  assert.match(java, /"minimizeApp"\.equals\(action\)/);
  assert.match(java, /moveTaskToBack\(true\)/);
  assert.match(java, /"closeApp"\.equals\(action\)/);
  assert.match(java, /finishAndRemoveTask/);
  assert.match(java, /"teclado:abriu"/);
  assert.match(java, /"teclado:fechou"/);
  assert.match(java, /SensorManager/);
  assert.match(java, /dispatchEvent\("celular:sacudido"/);
  assert.match(java, /dispatchEvent\("celular:tela_para_baixo"/);
  assert.match(java, /dispatchEvent\("proximidade:perto"/);
  assert.match(java, /MediaStore\.Images\.Media\.EXTERNAL_CONTENT_URI/);
  assert.match(java, /dispatchEvent\("print:tela"/);
  assert.match(java, /dispatchEvent\("orientacao:mudou"/);
  assert.match(java, /NfcAdapter/);
  assert.match(java, /dispatchEvent\("nfc:recebido"/);
  assert.match(java, /dispatchEvent\("notificacao:recebida"/);
  assert.match(java, /getLocation/);
  assert.match(java, /authenticateBiometric/);
  assert.match(java, /setWallpaper/);
  assert.match(java, /WallpaperManager/);
  assert.match(java, /AndroidKeyStore/);
  assert.match(floatingService, /OPACITY_KEY/);
  assert.match(floatingService, /setAlpha\(opacity\)/);
  assert.match(floatingService, /clampOpacity/);
});

test("bridge Java implements every native action awaited by JavaScript", async () => {
  const bridge = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "cordova-plugin-html2apk-bridge", "www", "html2apk-bridge.js"),
    "utf8"
  );
  const earlyBridge = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "html2apk-early-bridge.js"),
    "utf8"
  );
  const java = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "cordova-plugin-html2apk-bridge", "src", "android", "Html2ApkBridge.java"),
    "utf8"
  );
  const jsActions = new Set(
    [...bridge.matchAll(/call\("([A-Za-z0-9]+)"/g), ...earlyBridge.matchAll(/call\("([A-Za-z0-9]+)"/g)]
      .map((match) => match[1])
  );
  const javaActions = new Set([...java.matchAll(/"([A-Za-z0-9]+)"\.equals\(action\)/g)].map((match) => match[1]));
  const missing = [...jsActions].filter((action) => !javaActions.has(action)).sort();

  assert.deepEqual(missing, []);
});

test("desktop codes tab exposes USB interpreted-function lab", async () => {
  const index = await fs.readFile(
    path.resolve(__dirname, "..", "src", "desktop", "renderer", "index.html"),
    "utf8"
  );
  const renderer = await fs.readFile(
    path.resolve(__dirname, "..", "src", "desktop", "renderer", "renderer.js"),
    "utf8"
  );
  const preload = await fs.readFile(
    path.resolve(__dirname, "..", "src", "desktop", "preload.js"),
    "utf8"
  );
  const main = await fs.readFile(
    path.resolve(__dirname, "..", "src", "desktop", "main.js"),
    "utf8"
  );
  const styles = await fs.readFile(
    path.resolve(__dirname, "..", "src", "desktop", "renderer", "styles.css"),
    "utf8"
  );
  const runtimeConsole = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "html2apk-runtime-console.js"),
    "utf8"
  );

  assert.match(index, /nativeFunctionLabButton/);
  assert.match(renderer, /runNativeFunctionLabFlow/);
  assert.match(renderer, /testNativeFunctions/);
  assert.match(preload, /runNativeFunctionLab: \(\) => ipcRenderer\.invoke\("codes:run-function-lab"\)/);
  assert.match(main, /ipcMain\.handle\("codes:run-function-lab"/);
  assert.match(main, /createNativeFunctionLabProject/);
  assert.match(main, /runDebugUsb/);
  assert.match(main, /statusPermissoes/);
  assert.match(main, /definirPapelParede/);
  assert.match(main, /capturarTela/);
  assert.match(main, /volumeAtual/);
  assert.match(main, /definirVolume/);
  assert.match(main, /definirOpacidadeIconeFlutuante/);
  assert.match(main, /minimizarApp/);
  assert.match(main, /fecharApp/);
  assert.match(main, /receberCompartilhamento/);
  assert.match(main, /procurarBt/);
  assert.match(main, /enviarBt/);
  assert.match(main, /procurarWifi/);
  assert.match(main, /enviarWifi/);
  assert.match(main, /aoConectarUSB/);
  assert.match(main, /aoDesconectarUSB/);
  assert.match(main, /aoConectarFone/);
  assert.match(main, /aoMudarVolume/);
  assert.match(main, /aoAbrirTeclado/);
  assert.match(main, /aoSacudirCelular/);
  assert.match(main, /aoTirarPrint/);
  assert.match(main, /aoNFC/);
  assert.match(main, /aoReceberNotificacao/);
  assert.match(main, /ocr\(imagem\)/);
  assert.match(main, /ouvir\(\)/);
  assert.match(renderer, /aoReceberCompartilhamento/);
  assert.match(renderer, /procurarBT/);
  assert.match(renderer, /aoDarErroBT/);
  assert.match(renderer, /Bluetooth RFCOMM/);
  assert.match(renderer, /procurarWiFi/);
  assert.match(renderer, /aoDarErroWiFi/);
  assert.match(renderer, /NSD \+ Socket TCP local/);
  assert.match(renderer, /aoConectarUSB/);
  assert.match(renderer, /aoDesconectarUSB/);
  assert.match(renderer, /aoConectarFone/);
  assert.match(renderer, /aoMudarVolume/);
  assert.match(renderer, /aoAbrirTeclado/);
  assert.match(renderer, /aoSacudirCelular/);
  assert.match(renderer, /aoTirarPrint/);
  assert.match(renderer, /aoNFC/);
  assert.match(renderer, /aoReceberNotificacao/);
  assert.match(renderer, /capturarTela\(\) \/ tirarPrint\(\)/);
  assert.match(renderer, /volumeAtual\(\) \/ definirVolume/);
  assert.match(renderer, /definirOpacidadeIconeFlutuante/);
  assert.match(renderer, /minimizarApp\(\) \/ fecharApp\(\)/);
  assert.match(renderer, /ML Kit TextRecognition local/);
  assert.match(renderer, /RecognizerIntent/);
  assert.match(renderer, /function primaryCodeKey\(entry\)/);
  assert.match(renderer, /function findRecipeForEntry\(entry\)/);
  assert.match(renderer, /entry\.recipe \|\| findRecipeForEntry\(entry\) \|\| \{\}/);
  assert.doesNotMatch(renderer, /entry\.recipe \|\| nativeCodeRecipes\[index\]/);
  assert.match(main, /Rodar testes seguros/);
  assert.match(main, /Resultado ao vivo/);
  assert.match(main, /Eventos que nao dependem de botao/);
  assert.match(main, /outputFeed/);
  assert.match(main, /runSequence/);
  assert.match(main, /data-run-group/);
  assert.match(main, /initialSmokeIds/);
  assert.match(main, /agendarNotificacoes/);
  assert.match(main, /statusMicrofone/);
  assert.match(main, /statusPermissaoNotificacoes/);
  assert.match(main, /solicitarPermissaoSobreposicao/);
  assert.match(main, /definirCorBarrasSistema/);
  assert.match(main, /tirarPrint/);
  assert.match(main, /infoAppsAbertos/);
  assert.match(main, /Html2ApkRuntimeConsole\.log/);
  assert.doesNotMatch(main, /logPanel/);
  assert.match(runtimeConsole, /function scrollListToBottom\(target\)/);
  assert.match(runtimeConsole, /requestAnimationFrame/);
  assert.match(runtimeConsole, /box-sizing:border-box;overflow:auto;padding:10px 10px 30px;scroll-padding-bottom:30px/);
  assert.match(styles, /\.log-console::after/);
  assert.match(styles, /scroll-padding-bottom: 34px/);
  assert.match(styles, /scroll-padding-bottom: 26px/);
  assert.match(renderer, /requestAnimationFrame\(\(\) => \{/);
});

test("OneSignal template exposes Portuguese and English helpers", async () => {
  const template = await fs.readFile(
    path.resolve(__dirname, "..", "src", "templates", "html2apk-onesignal.js"),
    "utf8"
  );

  assert.match(template, /__HTML2APK_ONESIGNAL_APP_ID__/);
  assert.match(template, /solicitarPermissaoPush/);
  assert.match(template, /requestPushPermission/);
  assert.match(template, /fallbackToSettings !== false/);
  assert.match(template, /aoClicarPush/);
  assert.match(template, /onPushClick/);
  assert.match(template, /identificarUsuarioPush/);
  assert.match(template, /loginPushUser/);
  assert.match(template, /adicionarTagPush/);
  assert.match(template, /addPushTag/);
});

test("resolveBuildOptions prefers overrides over app config and defaults", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-project-"));
  try {
    await fs.writeFile(path.join(project, "index.html"), "<!doctype html>");
    await fs.writeFile(path.join(project, "app.json"), JSON.stringify({
      appName: "ConfigApp",
      packageId: "com.example.config",
      mode: "standalone",
      permissions: ["INTERNET"]
    }));

    const result = await resolveBuildOptions({
      projectRoot: project,
      mode: "fullscreen",
      orientation: "horizontal",
      minSdkVersion: "26",
      permissions: ["CAMERA"]
    });

    assert.equal(result.options.appName, "ConfigApp");
    assert.equal(result.options.packageId, "com.example.config");
    assert.equal(result.options.mode, "fullscreen");
    assert.equal(result.options.orientation, "landscape");
    assert.equal(result.options.minSdkVersion, 26);
    assert.deepEqual(result.options.permissions, ["CAMERA"]);
  } finally {
    await fs.rm(project, { recursive: true, force: true });
  }
});

test("resolveBuildOptions reads config.json when app.json is absent", async () => {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "html2apk-project-"));
  try {
    await fs.writeFile(path.join(project, "index.html"), "<!doctype html>");
    await fs.writeFile(path.join(project, "config.json"), JSON.stringify({
      appName: "FallbackApp",
      packageId: "com.example.fallback"
    }));

    const result = await resolveBuildOptions({ projectRoot: project });

    assert.equal(result.options.appName, "FallbackApp");
    assert.equal(result.options.packageId, "com.example.fallback");
    assert.equal(path.basename(result.configPath), "config.json");
  } finally {
    await fs.rm(project, { recursive: true, force: true });
  }
});
