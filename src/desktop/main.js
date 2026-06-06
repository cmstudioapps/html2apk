"use strict";

const nodeFs = require("fs");
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require("electron");
const { buildApk, runDebugUsb } = require("../core/build-apk");
const {
  REQUIRED_ANDROID_BUILD_TOOLS,
  REQUIRED_ANDROID_PLATFORM,
  getRuntimeEnvironment
} = require("../runtime-manager");
const { runDoctor, formatDoctorReport } = require("../runtime-manager/doctor");

let mainWindow = null;
let projectWatcher = null;
let projectWatchTimer = null;
let watchedProjectRoot = null;
const smokeTest = process.env.HTML2APK_DESKTOP_SMOKE === "1";
const APP_ID = "dev.caiomultiversando.html2apk";
const APP_NAME = "html2apk";
const WINDOW_BACKGROUNDS = {
  light: "#f7fbff",
  dark: "#10141b"
};
const EDITOR_MAX_FILE_SIZE = 1024 * 1024;
const EDITOR_IGNORED_DIRS = new Set([".git", "node_modules", "dist", "platforms", "build"]);
const EDITOR_TEXT_EXTENSIONS = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".xml", ".svg",
  ".txt", ".md", ".ts", ".tsx", ".jsx", ".vue", ".scss", ".sass", ".less",
  ".yml", ".yaml", ".properties", ".gradle", ".java", ".kt"
]);

app.commandLine.appendSwitch("disable-crash-reporter");
process.title = APP_NAME;
app.setName(APP_NAME);

if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

function rootPath(...parts) {
  return path.resolve(__dirname, "..", "..", ...parts);
}

function iconPath() {
  return rootPath("html2apk.png");
}

function animateWindowIn(window) {
  let opacity = 0;
  window.setOpacity(opacity);
  window.show();
  window.focus();

  const timer = setInterval(() => {
    opacity = Math.min(1, opacity + 0.08);
    window.setOpacity(opacity);
    if (opacity >= 1) {
      clearInterval(timer);
    }
  }, 16);
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1280, Math.max(860, Math.floor(screenWidth * 0.92)));
  const height = Math.min(820, Math.max(620, Math.floor(screenHeight * 0.9)));

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(860, width),
    minHeight: Math.min(620, height),
    center: true,
    show: false,
    frame: false,
    title: APP_NAME,
    icon: iconPath(),
    backgroundColor: WINDOW_BACKGROUNDS.light,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  if (smokeTest) {
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(() => app.quit(), 500);
    });
  }
  mainWindow.once("ready-to-show", () => animateWindowIn(mainWindow));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function inspectProject(projectRoot) {
  if (!projectRoot) {
    throw new Error("Project folder is required.");
  }

  const stat = await fs.stat(projectRoot);
  if (!stat.isDirectory()) {
    throw new Error("Please choose a folder, not a file.");
  }

  const appJsonPath = path.join(projectRoot, "app.json");
  const configJsonPath = path.join(projectRoot, "config.json");
  const indexPath = path.join(projectRoot, "index.html");
  const appConfig = await readJsonIfExists(appJsonPath);
  const fallbackConfig = appConfig ? null : await readJsonIfExists(configJsonPath);
  const config = appConfig || fallbackConfig || {};
  const webRoot = path.resolve(projectRoot, config.webRoot || ".");
  const entryPath = path.resolve(webRoot, config.entryFile || "index.html");

  return {
    projectRoot,
    name: path.basename(projectRoot),
    hasAppJson: await pathExists(appJsonPath),
    hasConfigJson: await pathExists(configJsonPath),
    hasRootIndex: await pathExists(indexPath),
    hasEntryFile: await pathExists(entryPath),
    entryPath,
    config,
    distPath: path.join(projectRoot, "dist")
  };
}

function isInsideProject(projectRoot, targetPath) {
  const relative = path.relative(projectRoot, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeProjectPath(projectRoot, relativePath = "") {
  const root = path.resolve(projectRoot);
  const targetPath = path.resolve(root, relativePath || ".");
  if (!isInsideProject(root, targetPath)) {
    throw new Error("The file must stay inside the selected project folder.");
  }
  return targetPath;
}

function safeNewFilePath(projectRoot, relativePath) {
  const cleaned = String(relativePath || "").trim().replace(/\\/g, "/");
  if (!cleaned || path.isAbsolute(cleaned) || cleaned.split("/").some((part) => part === "..")) {
    throw new Error("Use a relative path inside the project, example: css/style.css.");
  }
  return safeProjectPath(projectRoot, cleaned);
}

function fileLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  if (["htm", "html"].includes(ext)) {
    return "html";
  }
  if (["js", "mjs", "cjs", "ts", "tsx", "jsx"].includes(ext)) {
    return "js";
  }
  if (["css", "scss", "sass", "less"].includes(ext)) {
    return "css";
  }
  if (ext === "json") {
    return "json";
  }
  return ext || "text";
}

function isEditableFile(filePath, size) {
  const ext = path.extname(filePath).toLowerCase();
  return size <= EDITOR_MAX_FILE_SIZE && (EDITOR_TEXT_EXTENSIONS.has(ext) || ext === "");
}

async function listProjectFileTree(projectRoot, relativeDir = "") {
  const absoluteDir = safeProjectPath(projectRoot, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) {
      return a.isDirectory() ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  })) {
    if (entry.name.startsWith(".html2apk-doctor-")) {
      continue;
    }

    const relativePath = path.join(relativeDir, entry.name);
    const normalizedRelativePath = relativePath.replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (EDITOR_IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      nodes.push({
        type: "directory",
        name: entry.name,
        path: normalizedRelativePath,
        children: await listProjectFileTree(projectRoot, relativePath)
      });
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const absolutePath = safeProjectPath(projectRoot, relativePath);
    const stat = await fs.stat(absolutePath);
    nodes.push({
      type: "file",
      name: entry.name,
      path: normalizedRelativePath,
      size: stat.size,
      editable: isEditableFile(absolutePath, stat.size),
      language: fileLanguage(absolutePath)
    });
  }

  return nodes;
}

async function readProjectTextFile(projectRoot, relativePath) {
  const targetPath = safeProjectPath(projectRoot, relativePath);
  const stat = await fs.stat(targetPath);
  if (!stat.isFile()) {
    throw new Error("Choose a file, not a folder.");
  }
  if (!isEditableFile(targetPath, stat.size)) {
    throw new Error("This file is too large or is not a supported text file.");
  }

  const buffer = await fs.readFile(targetPath);
  if (buffer.includes(0)) {
    throw new Error("Binary files cannot be edited here.");
  }

  return {
    path: String(relativePath).replace(/\\/g, "/"),
    language: fileLanguage(targetPath),
    size: stat.size,
    content: buffer.toString("utf8")
  };
}

async function writeProjectTextFile(projectRoot, relativePath, content) {
  const targetPath = safeProjectPath(projectRoot, relativePath);
  await fs.writeFile(targetPath, String(content || ""), "utf8");
  const stat = await fs.stat(targetPath);
  return {
    path: String(relativePath).replace(/\\/g, "/"),
    size: stat.size
  };
}

async function createProjectTextFile(projectRoot, relativePath) {
  const targetPath = safeNewFilePath(projectRoot, relativePath);
  if (await pathExists(targetPath)) {
    throw new Error("A file already exists at this path.");
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, "", "utf8");
  return readProjectTextFile(projectRoot, path.relative(projectRoot, targetPath));
}

function shouldIgnoreProjectWatchPath(fileName) {
  const normalized = String(fileName || "").replace(/\\/g, "/");
  return normalized
    && (normalized.includes(".html2apk-doctor-")
    || normalized.startsWith("dist/")
    || normalized === "dist"
    || normalized.startsWith("node_modules/")
    || normalized === "node_modules"
    || normalized.startsWith(".git/")
    || normalized === ".git");
}

function stopProjectWatcher() {
  if (projectWatchTimer) {
    clearTimeout(projectWatchTimer);
    projectWatchTimer = null;
  }

  if (projectWatcher) {
    projectWatcher.close();
    projectWatcher = null;
  }

  watchedProjectRoot = null;
}

function startProjectWatcher(projectRoot, sender) {
  stopProjectWatcher();
  watchedProjectRoot = projectRoot;

  try {
    projectWatcher = nodeFs.watch(projectRoot, { recursive: true }, (eventType, fileName) => {
      if (shouldIgnoreProjectWatchPath(fileName)) {
        return;
      }

      const changedPath = path.join(projectRoot, String(fileName || ""));
      if (projectWatchTimer) {
        clearTimeout(projectWatchTimer);
      }

      projectWatchTimer = setTimeout(async () => {
        projectWatchTimer = null;
        try {
          if (watchedProjectRoot !== projectRoot) {
            return;
          }

          const project = await inspectProject(projectRoot);
          sender.send("project:changed", {
            eventType,
            changedPath,
            project,
            time: new Date().toISOString()
          });
        } catch (error) {
          sender.send("project:watch-error", {
            message: error.message,
            time: new Date().toISOString()
          });
        }
      }, 350);
    });

    projectWatcher.on("error", (error) => {
      sender.send("project:watch-error", {
        message: error.message,
        time: new Date().toISOString()
      });
    });

    return {
      ok: true,
      projectRoot
    };
  } catch (error) {
    stopProjectWatcher();
    return {
      ok: false,
      message: error.message
    };
  }
}

function cleanBuildOptions(options = {}) {
  const output = {
    projectRoot: options.projectRoot,
    debug: Boolean(options.debug),
    showRuntimeLogs: Boolean(options.showRuntimeLogs),
    release: Boolean(options.release)
  };

  for (const key of ["mode", "appName", "packageId", "version", "icon", "androidPlatform", "minSdkVersion", "themeColor", "themeMode", "theme", "oneSignalAppId", "orientation", "permissions", "deepLinks", "buildFormat"]) {
    if (Array.isArray(options[key]) || options[key]) {
      output[key] = options[key];
    }
  }

  if (options.keystore && typeof options.keystore === "object") {
    const keystore = {};
    for (const key of ["path", "alias", "storePassword", "keyPassword", "password", "type"]) {
      if (options.keystore[key]) {
        keystore[key] = options.keystore[key];
      }
    }
    if (Object.keys(keystore).length) {
      output.keystore = keystore;
    }
  }

  return output;
}

function nativeFunctionLabHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>html2apk - Teste de funcoes</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f8fb;
      --panel: #ffffff;
      --text: #172033;
      --muted: #65758b;
      --line: #dbe3ee;
      --blue: #126fff;
      --green: #18864b;
      --red: #c33b3b;
      --code: #0c1117;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      border-bottom: 1px solid var(--line);
      padding: 14px 16px;
      backdrop-filter: blur(14px);
    }
    h1 { margin: 0; font-size: 1.2rem; }
    header p { margin: 6px 0 0; color: var(--muted); line-height: 1.35; }
    main { display: grid; gap: 14px; padding: 14px; }
    section {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
    }
    h2 {
      margin: 0;
      padding: 13px 14px;
      font-size: .98rem;
      border-bottom: 1px solid var(--line);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      padding: 12px;
    }
    button {
      min-height: 48px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #eef5ff;
      color: var(--blue);
      padding: 10px;
      font-weight: 800;
      text-align: left;
    }
    button:active { transform: translateY(1px); }
    button small { display: block; margin-top: 4px; color: var(--muted); font-weight: 600; line-height: 1.3; }
    .danger { background: #fff0f0; color: var(--red); }
    .notice {
      margin: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fff8df;
      color: #745400;
      line-height: 1.42;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #10141b;
        --panel: #151b24;
        --text: #e6edf7;
        --muted: #9aa8ba;
        --line: #283243;
      }
      button { background: #172642; }
      .danger { background: #351c20; }
      .notice { background: #2d2816; color: #f2cc60; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Teste de funcoes html2apk</h1>
    <p>Toque nos botoes para chamar as funcoes interpretadas do APK. Algumas abrem permissoes, camera, seletor de arquivo ou outro app Android.</p>
  </header>
  <main id="groups"></main>
  <script>
    (function () {
      var state = {
        scheduledId: null,
        loopId: null,
        watchId: null,
        stopLocationEvent: null,
        lastImage: null,
        lastPhoto: null,
        micRecording: false,
        eventsReady: false
      };
      var sampleImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

      function fn(name) {
        if (typeof window[name] !== "function") {
          throw new Error(name + " nao esta disponivel neste APK.");
        }
        return window[name];
      }

      function log(title, value, kind) {
        var consoleKind = kind === "err" ? "error" : (kind === "ok" ? "ok" : "info");
        var hasValue = value !== "" && typeof value !== "undefined";
        if (window.Html2ApkRuntimeConsole && typeof window.Html2ApkRuntimeConsole.log === "function") {
          window.Html2ApkRuntimeConsole.log(consoleKind, title, hasValue ? value : undefined);
          return;
        }
        if (consoleKind === "error") {
          console.error(title, hasValue ? value : "");
        } else if (consoleKind === "ok") {
          console.log(title, hasValue ? value : "");
        } else {
          console.info(title, hasValue ? value : "");
        }
      }

      async function run(id) {
        var test = actions[id];
        if (!test) {
          return;
        }
        log("Executando " + test.title, "", "");
        try {
          var result = await test.run();
          log("OK: " + test.title, result, "ok");
        } catch (error) {
          log("ERRO: " + test.title, error, "err");
        }
      }

      function registerEvents() {
        if (state.eventsReady) {
          return { registered: true, already: true };
        }
        state.eventsReady = true;
        fn("aoEvento")("app:background", function (event) { log("evento app:background", event, "ok"); });
        fn("aoEvento")("app:voltou", function (event) { log("evento app:voltou", event, "ok"); });
        fn("aoEvento")("botao:voltar", function (event) { log("evento botao:voltar", event, "ok"); });
        fn("aoEvento")("rede:mudou", function (event) { log("evento rede:mudou", event, "ok"); });
        fn("aoEvento")("bateria:mudou", function (event) { log("evento bateria:mudou", event, "ok"); });
        fn("aoClicarNotificacao")(function (event) { log("notificacao clicada", event, "ok"); });
        return { registered: true };
      }

      var actions = {
        toast: { title: "toast()", run: function () { return fn("toast")("Mensagem do app de teste"); } },
        vibrar: { title: "vibrar()", run: function () { return fn("vibrar")(250); } },
        copiarTexto: { title: "copiarTexto()", run: function () { return fn("copiarTexto")("Texto copiado pelo html2apk"); } },
        lerTextoCopiado: { title: "lerTextoCopiado()", run: function () { return fn("lerTextoCopiado")(); } },
        compartilharTexto: { title: "compartilharTexto()", run: function () { return fn("compartilharTexto")("Compartilhado pelo app de teste html2apk"); } },
        compartilhar: { title: "compartilhar()", run: function () { return fn("compartilhar")({ texto: "Teste html2apk", url: "https://example.com" }); } },

        notificar: { title: "notificar()", run: function () { return fn("notificar")({ titulo: "html2apk", texto: "Notificacao imediata", aoClicar: { funcao: "toast", argumentos: ["Notificacao clicada"] } }); } },
        agendarNotificacao: { title: "agendarNotificacao()", run: async function () { var result = await fn("agendarNotificacao")({ titulo: "html2apk", texto: "Agendada para 10 segundos", quando: Date.now() + 10000 }); state.scheduledId = result && result.id; return result; } },
        cancelarNotificacao: { title: "cancelarNotificacao()", run: function () { return fn("cancelarNotificacao")(state.scheduledId || 0); } },
        agendarLoopNotificacoes: { title: "agendarLoopNotificacoes()", run: async function () { var result = await fn("agendarLoopNotificacoes")({ aCada: "30s", notificacoes: [{ titulo: "Loop 1", texto: "Primeiro item" }, { titulo: "Loop 2", texto: "Segundo item" }] }); state.loopId = result && result.id; return result; } },
        cancelarLoopNotificacoes: { title: "cancelarLoopNotificacoes()", run: function () { return fn("cancelarLoopNotificacoes")(state.loopId || 0); } },
        pushInfo: { title: "Push OneSignal", run: function () { if (typeof window.solicitarPermissaoPush !== "function") { return { available: false, message: "Configure OneSignal App ID no app real para testar push remoto." }; } return window.solicitarPermissaoPush(); } },

        statusPermissoes: { title: "statusPermissoes()", run: function () { return fn("statusPermissoes")(["CAMERA", "RECORD_AUDIO", "ACCESS_FINE_LOCATION", "POST_NOTIFICATIONS", "SET_WALLPAPER"]); } },
        permissaoNotificacao: { title: "solicitarPermissaoNotificacoes()", run: function () { return fn("solicitarPermissaoNotificacoes")(); } },
        permissaoCamera: { title: "solicitarPermissaoCamera()", run: function () { return fn("solicitarPermissaoCamera")(); } },
        permissaoMicrofone: { title: "solicitarPermissaoMicrofone()", run: function () { return fn("solicitarPermissaoMicrofone")(); } },
        alarmeExato: { title: "podeAgendarNotificacaoExata()", run: function () { return fn("podeAgendarNotificacaoExata")(); } },
        abrirAlarmeExato: { title: "abrirConfiguracaoAlarmeExato()", run: function () { return fn("abrirConfiguracaoAlarmeExato")(); } },
        statusSobreposicao: { title: "statusPermissaoSobreposicao()", run: function () { return fn("statusPermissaoSobreposicao")(); } },
        abrirSobreposicao: { title: "abrirConfiguracaoSobreposicao()", run: function () { return fn("abrirConfiguracaoSobreposicao")(); } },

        fullscreenOn: { title: "fullscreen(true)", run: function () { return fn("fullscreen")(true); } },
        fullscreenOff: { title: "fullscreen(false)", run: function () { return fn("fullscreen")(false); } },
        telaAcordadaOn: { title: "manterTelaAcordada(true)", run: function () { return fn("manterTelaAcordada")(true); } },
        telaAcordadaOff: { title: "manterTelaAcordada(false)", run: function () { return fn("manterTelaAcordada")(false); } },
        brilhoTela: { title: "brilhoTela()", run: function () { return fn("brilhoTela")(0.72); } },
        corTema: { title: "definirCorTema()", run: function () { return fn("definirCorTema")({ statusBarColor: "#126fff", navigationBarColor: "#10141b", darkIcons: false }); } },
        lanterna: { title: "alternarLanterna()", run: function () { return fn("alternarLanterna")(); } },
        statusLanterna: { title: "statusLanterna()", run: function () { return fn("statusLanterna")(); } },
        iniciarIconeFlutuante: { title: "iniciarIconeFlutuante()", run: function () { return fn("iniciarIconeFlutuante")(); } },
        pararIconeFlutuante: { title: "pararIconeFlutuante()", run: function () { return fn("pararIconeFlutuante")(); } },

        tirarFoto: { title: "tirarFoto()", run: async function () { var result = await fn("tirarFoto")({ base64: true }); state.lastPhoto = result; return result; } },
        capturarVideo: { title: "capturarVideo()", run: function () { return fn("capturarVideo")({ duracaoSegundos: 5 }); } },
        escanearQRCode: { title: "escanearQRCode()", run: function () { return fn("escanearQRCode")(); } },
        ouvirMic: { title: "ouvirMic()", run: async function () { state.micRecording = true; return fn("ouvirMic")(); } },
        pararMic: { title: "pararMic()", run: async function () { state.micRecording = false; return fn("pararMic")(); } },

        escolherImagem: { title: "escolherImagem()", run: async function () { var result = await fn("escolherImagem")(); state.lastImage = result; return result; } },
        escolherImagens: { title: "escolherImagens()", run: function () { return fn("escolherImagens")({ multiplo: true }); } },
        escolherArquivo: { title: "escolherArquivo()", run: function () { return fn("escolherArquivo")({ tipos: ["text/*", "application/json", "image/*"] }); } },
        escolherArquivos: { title: "escolherArquivos()", run: function () { return fn("escolherArquivos")({ multiplo: true }); } },
        escolherVideo: { title: "escolherVideo()", run: function () { return fn("escolherVideo")(); } },
        escolherPasta: { title: "escolherPasta()", run: function () { return fn("escolherPasta")(); } },
        salvarArquivoPicker: { title: "salvarArquivo({ nome })", run: function () { return fn("salvarArquivo")({ nome: "teste-html2apk.txt", mimeType: "text/plain", conteudo: "Arquivo salvo pelo teste html2apk" }); } },
        salvarArquivoCrud: { title: "salvarArquivo('lab.json')", run: function () { return fn("salvarArquivo")("lab.json", { criadoEm: Date.now(), origem: "teste-funcoes" }); } },
        lerArquivo: { title: "lerArquivo()", run: function () { return fn("lerArquivo")("lab.json"); } },
        lerArquivoCompleto: { title: "lerArquivoCompleto()", run: function () { return fn("lerArquivoCompleto")("lab.json"); } },
        listarArquivos: { title: "listarArquivos()", run: function () { return fn("listarArquivos")(); } },
        infoArquivo: { title: "infoArquivo()", run: function () { return fn("infoArquivo")("lab.json"); } },
        arquivoExiste: { title: "arquivoExiste()", run: function () { return fn("arquivoExiste")("lab.json"); } },
        abrirArquivo: { title: "abrirArquivo()", run: function () { return fn("abrirArquivo")("lab.json"); } },
        compartilharArquivo: { title: "compartilharArquivo()", run: function () { return fn("compartilharArquivo")("lab.json"); } },
        baixarArquivo: { title: "baixarArquivo()", run: function () { return fn("baixarArquivo")("https://example.com/", "example.html"); } },
        baixarBase64: { title: "baixarBase64()", run: function () { return fn("baixarBase64")("pixel-download.png", sampleImageBase64, { mimeType: "image/png" }); } },
        baixarArquivoLocal: { title: "baixarArquivoLocal()", run: async function () { var file = await fn("escolherArquivo")(); if (!file) { return { canceled: true }; } return fn("baixarArquivoLocal")(file, "copia-" + (file.name || file.nome || "arquivo")); } },
        excluirArquivo: { title: "excluirArquivo()", run: function () { return fn("excluirArquivo")("lab.json"); } },

        abrirNoApp: { title: "abrirNoApp()", run: function () { return fn("abrirNoApp")("#teste-funcoes"); } },
        abrirForaDoApp: { title: "abrirForaDoApp()", run: function () { return fn("abrirForaDoApp")("https://example.com"); } },
        abrirUrl: { title: "abrirUrl()", run: function () { return fn("abrirUrl")("https://example.com"); } },
        discar: { title: "discar()", run: function () { return fn("discar")("11999999999"); } },
        abrirMapa: { title: "abrirMapa()", run: function () { return fn("abrirMapa")("Sao Paulo"); } },
        abrirWhatsapp: { title: "abrirWhatsapp()", run: function () { return fn("abrirWhatsapp")("5511999999999", "Teste html2apk"); } },

        infoDispositivo: { title: "infoDispositivo()", run: function () { return fn("infoDispositivo")(); } },
        infoRede: { title: "infoRede()", run: function () { return fn("infoRede")(); } },
        infoBateria: { title: "infoBateria()", run: function () { return fn("infoBateria")(); } },
        infoMemoria: { title: "infoMemoria()", run: function () { return fn("infoMemoria")(); } },
        infoArmazenamento: { title: "infoArmazenamento()", run: function () { return fn("infoArmazenamento")(); } },
        infoDesempenho: { title: "infoDesempenho()", run: function () { return fn("infoDesempenho")(); } },
        appsAbertos: { title: "appsAbertos()", run: function () { return fn("appsAbertos")(); } },

        obterLocalizacao: { title: "obterLocalizacao()", run: function () { return fn("obterLocalizacao")({ altaPrecisao: true, timeoutMs: 10000 }); } },
        acompanharLocalizacao: { title: "acompanharLocalizacao()", run: async function () { var result = await fn("acompanharLocalizacao")({ intervaloMs: 5000 }); state.watchId = result && result.watchId; return result; } },
        pararLocalizacao: { title: "pararLocalizacao()", run: function () { return fn("pararLocalizacao")(state.watchId || ""); } },
        aoMudarLocalizacao: { title: "aoMudarLocalizacao()", run: function () { if (state.stopLocationEvent) { state.stopLocationEvent(); } state.stopLocationEvent = fn("aoMudarLocalizacao")(function (event) { log("localizacao:mudou", event, "ok"); }); return { listening: true }; } },
        autenticarBiometria: { title: "autenticarBiometria()", run: function () { return fn("autenticarBiometria")({ titulo: "Teste html2apk", descricao: "Confirme para testar a bridge" }); } },
        salvarSeguro: { title: "salvarSeguro()", run: function () { return fn("salvarSeguro")("tokenTeste", { token: "abc123", criadoEm: Date.now() }); } },
        lerSeguro: { title: "lerSeguro()", run: function () { return fn("lerSeguro")("tokenTeste"); } },
        lerSeguroCompleto: { title: "lerSeguroCompleto()", run: function () { return fn("lerSeguroCompleto")("tokenTeste"); } },
        listarSeguro: { title: "listarSeguro()", run: function () { return fn("listarSeguro")(); } },
        removerSeguro: { title: "removerSeguro()", run: function () { return fn("removerSeguro")("tokenTeste"); } },
        limparSeguro: { title: "limparSeguro()", run: function () { return fn("limparSeguro")(); } },

        infoPapelParede: { title: "infoPapelParede()", run: function () { return fn("infoPapelParede")(); } },
        definirPapelParede: { title: "definirPapelParede()", run: function () { return fn("definirPapelParede")({ base64: sampleImageBase64, mimeType: "image/png", alvo: "inicio" }); } },
        abrirConfigPapel: { title: "abrirConfiguracaoPapelParede()", run: function () { return fn("abrirConfiguracaoPapelParede")(); } },
        definirImagemEscolhida: { title: "imagem escolhida -> papel de parede", run: async function () { if (!state.lastImage) { state.lastImage = await fn("escolherImagem")(); } if (!state.lastImage || !state.lastImage.uri) { return { canceled: true }; } return fn("definirPapelParede")({ uri: state.lastImage.uri, alvo: "inicio", mimeType: state.lastImage.mimeType || "image/*" }); } },

        registrarEventos: { title: "registrar eventos", run: function () { return registerEvents(); } },
        obterNotificacaoInicial: { title: "obterNotificacaoInicial()", run: function () { return fn("obterNotificacaoInicial")(); } },
        obterLinkInicial: { title: "obterLinkInicial()", run: function () { return fn("obterLinkInicial")(); } }
      };

      var groups = [
        { title: "Feedback e compartilhamento", ids: ["toast", "vibrar", "copiarTexto", "lerTextoCopiado", "compartilharTexto", "compartilhar"] },
        { title: "Notificacoes", ids: ["notificar", "agendarNotificacao", "cancelarNotificacao", "agendarLoopNotificacoes", "cancelarLoopNotificacoes", "pushInfo"] },
        { title: "Permissoes e configuracoes", ids: ["statusPermissoes", "permissaoNotificacao", "permissaoCamera", "permissaoMicrofone", "alarmeExato", "abrirAlarmeExato", "statusSobreposicao", "abrirSobreposicao"] },
        { title: "Tela e hardware", ids: ["fullscreenOn", "fullscreenOff", "telaAcordadaOn", "telaAcordadaOff", "brilhoTela", "corTema", "lanterna", "statusLanterna", "iniciarIconeFlutuante", "pararIconeFlutuante"] },
        { title: "Camera, QR Code e microfone", ids: ["tirarFoto", "capturarVideo", "escanearQRCode", "ouvirMic", "pararMic"] },
        { title: "Arquivos e midia", ids: ["escolherImagem", "escolherImagens", "escolherArquivo", "escolherArquivos", "escolherVideo", "escolherPasta", "salvarArquivoPicker", "salvarArquivoCrud", "lerArquivo", "lerArquivoCompleto", "listarArquivos", "infoArquivo", "arquivoExiste", "abrirArquivo", "compartilharArquivo", "baixarArquivo", "baixarBase64", "baixarArquivoLocal", "excluirArquivo"] },
        { title: "Abrir apps externos", ids: ["abrirNoApp", "abrirForaDoApp", "abrirUrl", "discar", "abrirMapa", "abrirWhatsapp"] },
        { title: "Diagnostico", ids: ["infoDispositivo", "infoRede", "infoBateria", "infoMemoria", "infoArmazenamento", "infoDesempenho", "appsAbertos"] },
        { title: "Localizacao e seguranca", ids: ["obterLocalizacao", "acompanharLocalizacao", "pararLocalizacao", "aoMudarLocalizacao", "autenticarBiometria", "salvarSeguro", "lerSeguro", "lerSeguroCompleto", "listarSeguro", "removerSeguro", "limparSeguro"] },
        { title: "Papel de parede", ids: ["infoPapelParede", "definirPapelParede", "abrirConfigPapel", "definirImagemEscolhida"] },
        { title: "Eventos", ids: ["registrarEventos", "obterNotificacaoInicial", "obterLinkInicial"] }
      ];

      function render() {
        var root = document.getElementById("groups");
        root.innerHTML = groups.map(function (group) {
          return "<section><h2>" + group.title + "</h2><div class='grid'>" + group.ids.map(function (id) {
            var item = actions[id];
            return "<button type='button' data-action='" + id + "'>" + item.title + "<small>Toque para executar</small></button>";
          }).join("") + "</div></section>";
        }).join("") + "<p class='notice'>Video wallpaper, push remoto e fundo de chamadas dependem de configuracao do sistema, OneSignal ou fabricante. O app mostra o retorno real quando a funcao nao puder agir direto.</p>";
      }

      document.addEventListener("click", function (event) {
        var button = event.target.closest("[data-action]");
        if (button) {
          run(button.getAttribute("data-action"));
        }
      });

      document.addEventListener("deviceready", function () {
        log("deviceready", { ready: true }, "ok");
      }, false);

      render();
    }());
  </script>
</body>
</html>`;
}

async function createNativeFunctionLabProject() {
  const projectRoot = await fs.mkdtemp(path.join(app.getPath("temp"), "html2apk-function-lab-"));
  const config = {
    appName: "html2apk Function Lab",
    packageId: "dev.html2apk.functionlab",
    version: "1.0.0",
    buildFormat: "apk",
    mode: "standalone",
    orientation: "vertical",
    minSdkVersion: 24,
    themeMode: "fixed",
    themeColor: "#126fff",
    showRuntimeLogs: true,
    permissions: [
      "INTERNET",
      "POST_NOTIFICATIONS",
      "VIBRATE",
      "CAMERA",
      "RECORD_AUDIO",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "SET_WALLPAPER"
    ]
  };

  await fs.writeFile(path.join(projectRoot, "index.html"), nativeFunctionLabHtml(), "utf8");
  await fs.writeFile(path.join(projectRoot, "app.json"), JSON.stringify(config, null, 2), "utf8");
  return projectRoot;
}

function quoteForCmd(value) {
  const text = String(value);
  if (!text.length) {
    return "\"\"";
  }

  if (/^[a-zA-Z0-9_@./:\\=+\-;]+$/.test(text)) {
    return text;
  }

  return `"${text.replace(/(["^&|<>])/g, "^$1")}"`;
}

function createSpawnSpec(command, args) {
  const needsCmd = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  if (!needsCmd) {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [quoteForCmd(command), ...args.map(quoteForCmd)].join(" ")]
  };
}

function sdkManagerPath(runtime) {
  if (!runtime.cmdlineTools) {
    return null;
  }

  return path.join(runtime.cmdlineTools, process.platform === "win32" ? "sdkmanager.bat" : "sdkmanager");
}

function androidPackageArgs() {
  return [
    "platform-tools",
    `platforms;${REQUIRED_ANDROID_PLATFORM}`,
    `build-tools;${REQUIRED_ANDROID_BUILD_TOOLS}`,
    "cmdline-tools;latest"
  ];
}

function sendInstallLog(sender, line, kind = "raw") {
  sender.send("install:log", {
    line,
    kind,
    time: new Date().toISOString()
  });
}

async function findAndroidCli() {
  if (process.platform !== "win32") {
    return null;
  }

  const candidates = [
    process.env.LOCALAPPDATA
      ? path.join(
        process.env.LOCALAPPDATA,
        "Microsoft",
        "WinGet",
        "Packages",
        "Google.AndroidCLI_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "android.exe"
      )
      : null,
    "android.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "android.exe" || await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function runInstallCommand(sender, command, args, options = {}) {
  const pretty = `${command} ${args.join(" ")}`.trim();
  const spawnSpec = createSpawnSpec(command, args);
  const env = options.env || process.env;

  sendInstallLog(sender, `$ ${pretty}`, "system");

  return new Promise((resolve, reject) => {
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    function acceptLicenseIfPrompted(text) {
      if (!options.acceptLicenses || !child.stdin.writable) {
        return;
      }

      if (/(accept|license|licen[cç]a|y\/n|y\/N|\[y\/n\]|\(y\/N\))/i.test(text)) {
        child.stdin.write("y\n");
      }
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      sendInstallLog(sender, text);
      acceptLicenseIfPrompted(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      sendInstallLog(sender, text, "error");
      acceptLicenseIfPrompted(text);
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run "${pretty}": ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }

      const error = new Error(`Command failed (${code}): ${pretty}`);
      error.code = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

async function askAndroidInstallPermission() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Instalar", "Cancelar"],
    defaultId: 0,
    cancelId: 1,
    title: "html2apk",
    message: "Instalar pacotes Android necessarios?",
    detail: [
      "O html2apk precisa do Android SDK com platform-tools, Android Platform 36, Build Tools 36.0.0 e command line tools.",
      "Ao continuar, o instalador pode baixar pacotes e aceitar as licencas Android necessarias para o build."
    ].join("\n\n")
  });

  return result.response === 0;
}

async function installWithSdkManager(sender, sdkManager, runtime) {
  const args = androidPackageArgs();
  await runInstallCommand(sender, sdkManager, ["--licenses"], {
    env: runtime.env,
    acceptLicenses: true
  }).catch((error) => {
    sendInstallLog(sender, error.message, "error");
  });

  await runInstallCommand(sender, sdkManager, args, {
    env: runtime.env,
    acceptLicenses: true
  });
}

async function installWithWingetAndroidCli(sender) {
  if (process.platform !== "win32") {
    throw new Error("Automatic Android CLI installation is only available on Windows in this desktop app.");
  }

  try {
    await runInstallCommand(sender, "winget", [
      "install",
      "--id",
      "Google.AndroidCLI",
      "-e",
      "--accept-package-agreements",
      "--accept-source-agreements"
    ]);
  } catch (error) {
    sendInstallLog(sender, error.message, "error");
  }

  const androidCli = await findAndroidCli();
  if (!androidCli) {
    throw new Error("Android CLI was not found after the Winget step.");
  }

  await runInstallCommand(sender, androidCli, ["sdk", "install", ...androidPackageArgs()], {
    acceptLicenses: true
  });
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  if (process.platform === "win32") {
    app.setAppUserModelId(APP_ID);
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopProjectWatcher();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("app:info", () => ({
  name: APP_NAME,
  version: app.getVersion(),
  credit: "Dev Caio Multiversando",
  iconPath: iconPath()
}));

ipcMain.handle("window:minimize", () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.handle("window:toggle-maximize", () => {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) {
    return false;
  }

  if (window.isMaximized()) {
    window.unmaximize();
    return false;
  }

  window.maximize();
  return true;
});

ipcMain.handle("window:close", () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle("window:set-theme", (_event, theme) => {
  const nextTheme = theme === "dark" ? "dark" : "light";
  BrowserWindow.getFocusedWindow()?.setBackgroundColor(WINDOW_BACKGROUNDS[nextTheme]);
  return nextTheme;
});

ipcMain.handle("dialog:select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select project folder",
    properties: ["openDirectory"]
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return inspectProject(result.filePaths[0]);
});

ipcMain.handle("dialog:select-icon", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select app icon",
    properties: ["openFile"],
    filters: [
      { name: "PNG images", extensions: ["png"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("dialog:select-keystore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Android keystore",
    properties: ["openFile"],
    filters: [
      { name: "Android keystore", extensions: ["jks", "keystore", "p12", "pfx"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("project:inspect", async (_event, projectRoot) => {
  return inspectProject(projectRoot);
});

ipcMain.handle("project:list-files", async (_event, projectRoot) => {
  return listProjectFileTree(projectRoot);
});

ipcMain.handle("project:read-file", async (_event, projectRoot, relativePath) => {
  return readProjectTextFile(projectRoot, relativePath);
});

ipcMain.handle("project:write-file", async (_event, projectRoot, relativePath, content) => {
  return writeProjectTextFile(projectRoot, relativePath, content);
});

ipcMain.handle("project:create-file", async (_event, projectRoot, relativePath) => {
  return createProjectTextFile(projectRoot, relativePath);
});

ipcMain.handle("project:watch", async (event, projectRoot) => {
  return startProjectWatcher(projectRoot, event.sender);
});

ipcMain.handle("project:unwatch", async () => {
  stopProjectWatcher();
  return { ok: true };
});

ipcMain.handle("doctor:run", async (_event, projectRoot) => {
  const report = await runDoctor({ projectRoot });
  return {
    ok: report.ok,
    report,
    text: formatDoctorReport(report)
  };
});

ipcMain.handle("install:android-requirements", async (event) => {
  const approved = await askAndroidInstallPermission();
  if (!approved) {
    return {
      ok: false,
      canceled: true,
      message: "Installation canceled by user."
    };
  }

  const sender = event.sender;

  try {
    const runtime = getRuntimeEnvironment();
    const sdkManager = sdkManagerPath(runtime);
    sendInstallLog(sender, "Preparing Android SDK requirements.", "system");

    if (sdkManager && await pathExists(sdkManager)) {
      await installWithSdkManager(sender, sdkManager, runtime);
    } else {
      await installWithWingetAndroidCli(sender);
    }

    return {
      ok: true,
      message: "Android SDK requirements installed."
    };
  } catch (error) {
    sendInstallLog(sender, error.message, "error");
    return {
      ok: false,
      message: error.message
    };
  }
});

ipcMain.handle("build:run", async (event, options) => {
  const buildOptions = cleanBuildOptions(options);
  const sendLog = (line, kind = "raw") => {
    event.sender.send("build:log", {
      line,
      kind,
      time: new Date().toISOString()
    });
  };

  try {
    sendLog("Starting html2apk build.", "system");
    const result = await buildApk({
      ...buildOptions,
      onLog: (line) => sendLog(line)
    });
    sendLog(`Android file generated: ${result.artifactPath || result.apkPath}`, "success");
    return {
      ok: true,
      result
    };
  } catch (error) {
    sendLog(error.message, "error");
    return {
      ok: false,
      message: error.message,
      logs: error.logs || [],
      buildDir: error.buildDir || null
    };
  }
});

ipcMain.handle("build:run-usb-debug", async (event, options) => {
  const buildOptions = cleanBuildOptions(options);
  const sendLog = (line, kind = "raw") => {
    event.sender.send("build:log", {
      line,
      kind,
      time: new Date().toISOString()
    });
  };

  try {
    sendLog("Starting html2apk USB debug build.", "system");
    const result = await runDebugUsb({
      ...buildOptions,
      release: false,
      onLog: (line) => sendLog(line)
    });
    sendLog(`USB debug installed on device: ${result.device?.id || "Android device"}`, "success");
    return {
      ok: true,
      result
    };
  } catch (error) {
    sendLog(error.message, "error");
    return {
      ok: false,
      message: error.message,
      logs: error.logs || [],
      buildDir: error.buildDir || null
    };
  }
});

ipcMain.handle("codes:run-function-lab", async (event) => {
  const sendLog = (line, kind = "raw") => {
    event.sender.send("build:log", {
      line,
      kind,
      time: new Date().toISOString()
    });
  };
  let projectRoot = null;

  try {
    sendLog("Creating html2apk interpreted functions test app.", "system");
    projectRoot = await createNativeFunctionLabProject();
    sendLog(`Function test project: ${projectRoot}`, "system");
    sendLog("USB required: connect an Android phone with USB debugging authorized.", "system");
    const result = await runDebugUsb({
      projectRoot,
      debug: false,
      release: false,
      showRuntimeLogs: true,
      onLog: (line) => sendLog(line)
    });
    sendLog(`Function test app opened on device: ${result.device?.id || "Android device"}`, "success");
    return {
      ok: true,
      result: {
        ...result,
        projectRoot,
        distPath: path.join(projectRoot, "dist")
      }
    };
  } catch (error) {
    sendLog(error.message, "error");
    return {
      ok: false,
      message: error.message,
      logs: error.logs || [],
      buildDir: error.buildDir || null,
      projectRoot
    };
  }
});

ipcMain.handle("shell:open-path", async (_event, targetPath) => {
  if (!targetPath) {
    return false;
  }
  await shell.openPath(targetPath);
  return true;
});

ipcMain.handle("shell:show-item", async (_event, targetPath) => {
  if (!targetPath) {
    return false;
  }
  shell.showItemInFolder(targetPath);
  return true;
});

ipcMain.handle("shell:open-external", async (_event, targetUrl) => {
  if (!targetUrl) {
    return false;
  }

  const url = new URL(String(targetUrl));
  if (!["https:", "http:"].includes(url.protocol)) {
    return false;
  }

  await shell.openExternal(url.toString());
  return true;
});
