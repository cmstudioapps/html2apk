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
let logcatProcess = null;
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

  for (const key of ["mode", "appName", "packageId", "version", "url", "icon", "androidPlatform", "minSdkVersion", "themeColor", "themeMode", "theme", "oneSignalAppId", "orientation", "permissions", "deepLinks", "buildFormat"]) {
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
      --soft-green: #e8f7ef;
      --soft-amber: #fff6dd;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
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
    #groups { display: grid; gap: 14px; }
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
    h2.with-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    h2.with-action button {
      min-height: 32px;
      width: auto;
      padding: 6px 9px;
      font-size: .78rem;
      text-align: center;
      white-space: nowrap;
    }
    .toolbar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .toolbar input {
      grid-column: 1 / -1;
      min-height: 42px;
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--text);
      padding: 9px 11px;
      font: inherit;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      background: var(--panel);
      padding: 4px 9px;
      font-size: .78rem;
      font-weight: 800;
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
    button[disabled] { opacity: .68; }
    button:active { transform: translateY(1px); }
    button.primary { background: var(--blue); border-color: var(--blue); color: #fff; }
    button.safe { background: var(--soft-green); color: var(--green); }
    button.listener { background: var(--soft-amber); color: #8a5f00; }
    button.external { background: #f2edff; color: #6b46c1; }
    button.running { outline: 2px solid var(--blue); }
    button.ok { border-color: var(--green); }
    button.fail { border-color: var(--red); }
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
    .output-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px;
      border-bottom: 1px solid var(--line);
    }
    .output-head h2 { padding: 0; border: 0; }
    .output-feed {
      display: grid;
      gap: 8px;
      max-height: 360px;
      overflow: auto;
      padding: 12px;
    }
    .log-entry {
      border: 1px solid var(--line);
      border-left: 4px solid var(--blue);
      border-radius: 8px;
      padding: 9px;
      background: color-mix(in srgb, var(--panel) 96%, var(--blue));
    }
    .log-entry.ok { border-left-color: var(--green); }
    .log-entry.error { border-left-color: var(--red); }
    .log-entry strong { display: block; font-size: .9rem; }
    .log-entry time { display: block; margin-top: 2px; color: var(--muted); font-size: .74rem; }
    .log-entry pre {
      margin: 8px 0 0;
      white-space: pre-wrap;
      word-break: break-word;
      color: #dfe9f8;
      background: var(--code);
      border-radius: 7px;
      padding: 8px;
      font: .78rem/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .guide {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
      padding: 12px;
    }
    .guide article {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: color-mix(in srgb, var(--panel) 96%, var(--blue));
    }
    .guide strong { display: block; margin-bottom: 4px; }
    .guide p { margin: 0; color: var(--muted); font-size: .88rem; }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #10141b;
        --panel: #151b24;
        --text: #e6edf7;
        --muted: #9aa8ba;
        --line: #283243;
        --soft-green: #122d22;
        --soft-amber: #332a12;
      }
      button { background: #172642; }
      .danger { background: #351c20; }
      .notice { background: #2d2816; color: #f2cc60; }
    }
    @media (max-width: 720px) {
      .toolbar { grid-template-columns: 1fr 1fr; }
      h2.with-action { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Teste de funcoes html2apk</h1>
    <p>Use botoes manuais, lotes seguros e eventos passivos para testar as funcoes interpretadas do APK. Os resultados aparecem aqui e tambem no console runtime.</p>
    <div class="toolbar" aria-label="Controles do laboratorio">
      <button id="runSafeButton" class="primary" type="button">Rodar testes seguros</button>
      <button id="runPrepareButton" type="button">Preparar dados</button>
      <button id="registerEventsButton" type="button">Registrar eventos</button>
      <button id="clearLogButton" type="button">Limpar resultados</button>
      <input id="filterInput" type="search" placeholder="Filtrar funcao, evento ou categoria">
    </div>
    <div id="stats" class="stats" aria-live="polite"></div>
  </header>
  <main>
    <section aria-label="Resultado ao vivo">
      <div class="output-head">
        <h2>Resultado ao vivo</h2>
        <span class="chip">Novos no topo</span>
      </div>
      <div id="outputFeed" class="output-feed" aria-live="polite"></div>
    </section>
    <section aria-label="Como testar eventos passivos">
      <h2>Eventos que nao dependem de botao</h2>
      <div class="guide">
        <article><strong>USB, fone e volume</strong><p>Conecte/desconecte cabo, fone ou mude o volume fisico. O evento aparece no resultado ao vivo.</p></article>
        <article><strong>Teclado</strong><p>Toque no campo de filtro para abrir o teclado; feche o teclado para testar o evento inverso.</p></article>
        <article><strong>Sensores</strong><p>Sacuda o aparelho, vire a tela para baixo ou aproxime a mao do sensor de proximidade.</p></article>
        <article><strong>Notificacao e share</strong><p>Use os botoes de notificacao/compartilhamento e observe os callbacks registrados automaticamente.</p></article>
      </div>
    </section>
    <div id="groups"></div>
  </main>
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
        eventsReady: false,
        eventStops: [],
        outputCount: 0,
        sequenceRunning: false
      };
      var sampleImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

      function fn(name) {
        if (typeof window[name] !== "function") {
          throw new Error(name + " nao esta disponivel neste APK.");
        }
        return window[name];
      }

      function delay(ms) {
        return new Promise(function (resolve) {
          setTimeout(resolve, ms);
        });
      }

      function safeValue(value) {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        if (typeof value === "undefined") {
          return undefined;
        }
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          return String(value);
        }
      }

      function valueToText(value) {
        var normalized = safeValue(value);
        if (typeof normalized === "undefined") {
          return "";
        }
        if (typeof normalized === "string") {
          return normalized;
        }
        return JSON.stringify(normalized, null, 2);
      }

      function appendOutput(title, value, kind) {
        var feed = document.getElementById("outputFeed");
        var entry;
        var pre;
        var textValue;

        if (!feed) {
          return;
        }

        state.outputCount += 1;
        entry = document.createElement("article");
        entry.className = "log-entry " + (kind === "error" ? "error" : (kind === "ok" ? "ok" : "info"));
        entry.innerHTML = "<strong></strong><time></time>";
        entry.querySelector("strong").textContent = title;
        entry.querySelector("time").textContent = new Date().toLocaleTimeString();

        textValue = valueToText(value);
        if (textValue) {
          pre = document.createElement("pre");
          pre.textContent = textValue;
          entry.appendChild(pre);
        }

        feed.prepend(entry);
        while (feed.children.length > 80) {
          feed.lastElementChild.remove();
        }
        updateStats();
      }

      function log(title, value, kind) {
        var consoleKind = kind === "err" ? "error" : (kind === "ok" ? "ok" : "info");
        var hasValue = value !== "" && typeof value !== "undefined";
        appendOutput(title, hasValue ? value : undefined, consoleKind);
        if (window.Html2ApkRuntimeConsole && typeof window.Html2ApkRuntimeConsole.log === "function") {
          window.Html2ApkRuntimeConsole.log(consoleKind, title, hasValue ? safeValue(value) : undefined);
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
        var button = document.querySelector("[data-action='" + id + "']");
        var result;
        if (!test) {
          return;
        }
        if (button) {
          button.classList.remove("ok", "fail");
          button.classList.add("running");
          button.disabled = true;
        }
        log("Executando " + test.title, "", "");
        try {
          result = await test.run();
          log("OK: " + test.title, result, "ok");
          if (button) {
            button.classList.add("ok");
          }
          return { ok: true, result: result };
        } catch (error) {
          log("ERRO: " + test.title, error, "err");
          if (button) {
            button.classList.add("fail");
          }
          return { ok: false, error: error };
        } finally {
          if (button) {
            button.classList.remove("running");
            button.disabled = false;
          }
        }
      }

      async function runSequence(ids, label) {
        var index;
        if (state.sequenceRunning) {
          log("Lote ignorado", { motivo: "Ja existe um lote em execucao." }, "info");
          return;
        }
        state.sequenceRunning = true;
        log("Inicio do lote: " + label, { total: ids.length }, "info");
        try {
          for (index = 0; index < ids.length; index += 1) {
            await run(ids[index]);
            await delay(160);
          }
          log("Fim do lote: " + label, { total: ids.length }, "ok");
        } finally {
          state.sequenceRunning = false;
        }
      }

      function registerEvents() {
        var registered = [];
        var missing = [];
        var failed = [];

        function remember(stop) {
          if (typeof stop === "function") {
            state.eventStops.push(stop);
          }
        }

        function listen(name, title) {
          if (typeof window[name] !== "function") {
            missing.push(name);
            return;
          }
          try {
            remember(window[name](function (event) {
              log(title, event, "ok");
            }));
            registered.push(name);
          } catch (error) {
            failed.push({ name: name, message: error.message });
            log("Falha ao registrar " + name, error, "err");
          }
        }

        function event(type, title) {
          if (typeof window.aoEvento !== "function") {
            missing.push("aoEvento:" + type);
            return;
          }
          try {
            remember(window.aoEvento(type, function (detail) {
              log(title, detail, "ok");
            }));
            registered.push("aoEvento:" + type);
          } catch (error) {
            failed.push({ name: "aoEvento:" + type, message: error.message });
            log("Falha ao registrar evento " + type, error, "err");
          }
        }

        if (state.eventsReady) {
          return { registered: true, already: true };
        }
        state.eventsReady = true;
        event("app:background", "evento app:background");
        event("app:voltou", "evento app:voltou");
        event("botao:voltar", "evento botao:voltar");
        event("rede:mudou", "evento rede:mudou");
        event("bateria:mudou", "evento bateria:mudou");
        [
          ["aoMinimizar", "app minimizado"],
          ["aoVoltarParaApp", "app voltou"],
          ["aoAbrirLink", "link recebido"],
          ["aoReceberCompartilhamento", "compartilhamento recebido"],
          ["aoMudarRede", "rede mudou"],
          ["aoMudarBateria", "bateria mudou"],
          ["aoConectarUSB", "usb conectado"],
          ["aoDesconectarUSB", "usb desconectado"],
          ["aoConectarFone", "fone conectado"],
          ["aoDesconectarFone", "fone desconectado"],
          ["aoMudarVolume", "volume mudou"],
          ["aoAbrirTeclado", "teclado abriu"],
          ["aoFecharTeclado", "teclado fechou"],
          ["aoMudarOrientacao", "orientacao mudou"],
          ["aoSacudirCelular", "celular sacudido"],
          ["aoVirarCelularParaBaixo", "tela para baixo"],
          ["aoAproximarObjeto", "objeto proximo"],
          ["aoTirarPrint", "print detectado"],
          ["aoNFC", "nfc recebido"],
          ["aoReceberNotificacao", "notificacao recebida"],
          ["aoClicarNotificacao", "notificacao clicada"],
          ["aoConectarBT", "bluetooth conectado"],
          ["aoReceberDadosBT", "dados bluetooth"],
          ["aoDarErroBT", "erro bluetooth"],
          ["aoConectarWiFi", "wifi conectado"],
          ["aoReceberDadosWiFi", "dados wifi"],
          ["aoDarErroWiFi", "erro wifi"],
          ["aoClicarWidget", "clique no widget"]
        ].forEach(function (item) {
          listen(item[0], item[1]);
        });
        return { registered: registered.length, missing: missing, failed: failed };
      }

      var actions = {
        toast: { title: "toast()", run: function () { return fn("toast")("Mensagem do app de teste"); } },
        vibrar: { title: "vibrar()", run: function () { return fn("vibrar")(250); } },
        aguardar: { title: "aguardar(1000)", run: function () { return fn("aguardar")(1000); } },
        copiarTexto: { title: "copiarTexto()", run: function () { return fn("copiarTexto")("Texto copiado pelo html2apk"); } },
        lerTextoCopiado: { title: "lerTextoCopiado()", run: function () { return fn("lerTextoCopiado")(); } },
        compartilharTexto: { title: "compartilharTexto()", run: function () { return fn("compartilharTexto")("Compartilhado pelo app de teste html2apk"); } },
        compartilhar: { title: "compartilhar()", run: function () { return fn("compartilhar")({ texto: "Teste html2apk", url: "https://example.com" }); } },
        compartilharApp: { title: "share_me()", run: function () { return fn("share_me")({ titulo: "Compartilhar app de teste" }); } },
        receberCompartilhamento: { title: "aoReceberCompartilhamento()", run: function () { if (state.stopShareEvent) { state.stopShareEvent(); } state.stopShareEvent = fn("aoReceberCompartilhamento")(function (event) { log("compartilhamento recebido", event, "ok"); }); return { listening: true }; } },
        compartilhamentoInicial: { title: "obterCompartilhamentoInicial()", run: function () { return fn("obterCompartilhamentoInicial")(); } },
        iniciarBt: { title: "aoConectarBT()", run: function () { if (state.stopBtConnect) { state.stopBtConnect(); } state.stopBtConnect = fn("aoConectarBT")(function (event) { state.bluetoothConnected = true; log("bluetooth conectado", event, "ok"); }); if (state.stopBtData) { state.stopBtData(); } state.stopBtData = fn("aoReceberDadosBT")(function (data) { log("dados bluetooth", data, "ok"); }); if (state.stopBtError) { state.stopBtError(); } state.stopBtError = fn("aoDarErroBT")(function (error) { log("erro bluetooth", error, "err"); }); return { listening: true }; } },
        procurarBt: { title: "procurarBT()", run: async function () { var devices = await fn("procurarBT")({ timeoutMs: 10000 }); state.bluetoothDevices = devices || []; state.bluetoothDeviceId = state.bluetoothDevices[0] && state.bluetoothDevices[0].id; return devices; } },
        conectarBt: { title: "conectarBT()", run: async function () { if (!state.bluetoothDeviceId) { var devices = await fn("procurarBT")({ timeoutMs: 10000 }); state.bluetoothDevices = devices || []; state.bluetoothDeviceId = state.bluetoothDevices[0] && state.bluetoothDevices[0].id; } if (!state.bluetoothDeviceId) { return { connected: false, message: "Nenhum dispositivo encontrado." }; } return fn("conectarBT")(state.bluetoothDeviceId); } },
        enviarBt: { title: "enviarBT()", run: function () { return fn("enviarBT")({ origem: "laboratorio-html2apk", mensagem: "Ola via Bluetooth", quando: Date.now() }); } },
        iniciarWifi: { title: "aoConectarWiFi()", run: function () { if (state.stopWifiConnect) { state.stopWifiConnect(); } state.stopWifiConnect = fn("aoConectarWiFi")(function (event) { state.wifiConnected = true; log("wifi conectado", event, "ok"); }); if (state.stopWifiData) { state.stopWifiData(); } state.stopWifiData = fn("aoReceberDadosWiFi")(function (data) { log("dados wifi", data, "ok"); }); if (state.stopWifiError) { state.stopWifiError(); } state.stopWifiError = fn("aoDarErroWiFi")(function (error) { log("erro wifi", error, "err"); }); return { listening: true }; } },
        procurarWifi: { title: "procurarWiFi()", run: async function () { var devices = await fn("procurarWiFi")({ timeoutMs: 10000 }); state.wifiDevices = devices || []; state.wifiDeviceId = state.wifiDevices[0] && state.wifiDevices[0].id; return devices; } },
        conectarWifi: { title: "conectarWiFi()", run: async function () { if (!state.wifiDeviceId) { var devices = await fn("procurarWiFi")({ timeoutMs: 10000 }); state.wifiDevices = devices || []; state.wifiDeviceId = state.wifiDevices[0] && state.wifiDevices[0].id; } if (!state.wifiDeviceId) { return { connected: false, message: "Nenhum dispositivo Wi-Fi encontrado." }; } return fn("conectarWiFi")(state.wifiDeviceId); } },
        enviarWifi: { title: "enviarWiFi()", run: function () { return fn("enviarWiFi")({ origem: "laboratorio-html2apk", mensagem: "Ola via Wi-Fi", quando: Date.now() }); } },

        notificar: { title: "notificar()", run: function () { return fn("notificar")({ titulo: "html2apk", texto: "Notificacao imediata", aoClicar: { funcao: "toast", argumentos: ["Notificacao clicada"] } }); } },
        agendarNotificacao: { title: "agendarNotificacao()", run: async function () { var result = await fn("agendarNotificacao")({ titulo: "html2apk", texto: "Agendada para 10 segundos", quando: Date.now() + 10000 }); state.scheduledId = result && result.id; return result; } },
        agendarNotificacoes: { title: "agendarNotificacoes()", run: function () { return fn("agendarNotificacoes")([{ titulo: "Lista 1", texto: "Primeira notificacao", quando: Date.now() + 12000 }, { titulo: "Lista 2", texto: "Segunda notificacao", quando: Date.now() + 18000 }]); } },
        cancelarNotificacao: { title: "cancelarNotificacao()", run: function () { return fn("cancelarNotificacao")(state.scheduledId || 0); } },
        agendarLoopNotificacoes: { title: "agendarLoopNotificacoes()", run: async function () { var result = await fn("agendarLoopNotificacoes")({ aCada: "30s", notificacoes: [{ titulo: "Loop 1", texto: "Primeiro item" }, { titulo: "Loop 2", texto: "Segundo item" }] }); state.loopId = result && result.id; return result; } },
        cancelarLoopNotificacoes: { title: "cancelarLoopNotificacoes()", run: function () { return fn("cancelarLoopNotificacoes")(state.loopId || 0); } },
        pushInfo: { title: "Push OneSignal", run: function () { if (typeof window.solicitarPermissaoPush !== "function") { return { available: false, message: "Configure OneSignal App ID no app real para testar push remoto." }; } return window.solicitarPermissaoPush(); } },

        statusPermissoes: { title: "statusPermissoes()", run: function () { return fn("statusPermissoes")(["CAMERA", "RECORD_AUDIO", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS", "SET_WALLPAPER", "BLUETOOTH_SCAN", "BLUETOOTH_CONNECT", "NFC", "SYSTEM_ALERT_WINDOW"]); } },
        permissaoNotificacao: { title: "solicitarPermissaoNotificacoes()", run: function () { return fn("solicitarPermissaoNotificacoes")(); } },
        statusPermissaoNotificacoes: { title: "statusPermissaoNotificacoes()", run: function () { return fn("statusPermissaoNotificacoes")(); } },
        permissaoCamera: { title: "solicitarPermissaoCamera()", run: function () { return fn("solicitarPermissaoCamera")(); } },
        permissaoMicrofone: { title: "solicitarPermissaoMicrofone()", run: function () { return fn("solicitarPermissaoMicrofone")(); } },
        statusMicrofone: { title: "statusMicrofone()", run: function () { return fn("statusMicrofone")(); } },
        alarmeExato: { title: "podeAgendarNotificacaoExata()", run: function () { return fn("podeAgendarNotificacaoExata")(); } },
        abrirAlarmeExato: { title: "abrirConfiguracaoAlarmeExato()", run: function () { return fn("abrirConfiguracaoAlarmeExato")(); } },
        statusSobreposicao: { title: "statusPermissaoSobreposicao()", run: function () { return fn("statusPermissaoSobreposicao")(); } },
        solicitarSobreposicao: { title: "solicitarPermissaoSobreposicao()", run: function () { return fn("solicitarPermissaoSobreposicao")(); } },
        abrirSobreposicao: { title: "abrirConfiguracaoSobreposicao()", run: function () { return fn("abrirConfiguracaoSobreposicao")(); } },
        abrirConfiguracoesDeeplink: { title: "abrirConfiguracoesDeeplink()", run: function () { return fn("abrirConfiguracoesDeeplink")(); } },
        ouvirLuminosidade: { title: "ouvirLuminosidade()", run: function () { return fn("ouvirLuminosidade")(); } },
        pararLuminosidade: { title: "pararLuminosidade()", run: function () { return fn("pararLuminosidade")(); } },

        fullscreenOn: { title: "fullscreen(true)", run: function () { return fn("fullscreen")(true); } },
        fullscreenOff: { title: "fullscreen(false)", run: function () { return fn("fullscreen")(false); } },
        telaAcordadaOn: { title: "manterTelaAcordada(true)", run: function () { return fn("manterTelaAcordada")(true); } },
        telaAcordadaOff: { title: "manterTelaAcordada(false)", run: function () { return fn("manterTelaAcordada")(false); } },
        brilhoTela: { title: "brilhoTela()", run: function () { return fn("brilhoTela")(0.72); } },
        corTema: { title: "definirCorTema()", run: function () { return fn("definirCorTema")({ statusBarColor: "#126fff", navigationBarColor: "#10141b", darkIcons: false }); } },
        corBarrasSistema: { title: "definirCorBarrasSistema()", run: function () { return fn("definirCorBarrasSistema")({ statusBarColor: "#18864b", navigationBarColor: "#10141b", darkIcons: false }); } },
        lanternaOn: { title: "lanterna(true)", run: function () { return fn("lanterna")(true); } },
        lanternaOff: { title: "lanterna(false)", run: function () { return fn("lanterna")(false); } },
        lanterna: { title: "alternarLanterna()", run: function () { return fn("alternarLanterna")(); } },
        statusLanterna: { title: "statusLanterna()", run: function () { return fn("statusLanterna")(); } },
        capturarTela: { title: "capturarTela()", run: function () { return fn("capturarTela")({ formato: "png" }); } },
        tirarPrint: { title: "tirarPrint()", run: function () { return fn("tirarPrint")({ formato: "png" }); } },
        volumeAtual: { title: "volumeAtual()", run: function () { return fn("volumeAtual")(); } },
        definirVolume: { title: "definirVolume('midia', 0.5)", run: function () { return fn("definirVolume")("midia", 0.5, { mostrarUI: true }); } },
        aumentarVolume: { title: "aumentarVolume()", run: function () { return fn("aumentarVolume")("midia", 1, { mostrarUI: true }); } },
        diminuirVolume: { title: "diminuirVolume()", run: function () { return fn("diminuirVolume")("midia", 1, { mostrarUI: true }); } },
        iniciarIconeFlutuante: { title: "iniciarIconeFlutuante()", run: function () { return fn("iniciarIconeFlutuante")({ opacidade: 0.85 }); } },
        configurarIconeFlutuante: { title: "configurarIconeFlutuante()", run: function () { return fn("configurarIconeFlutuante")({ opacidade: 0.65, tamanho: 58 }); } },
        definirOpacidadeIconeFlutuante: { title: "definirOpacidadeIconeFlutuante()", run: function () { return fn("definirOpacidadeIconeFlutuante")(0.55); } },
        pararIconeFlutuante: { title: "pararIconeFlutuante()", run: function () { return fn("pararIconeFlutuante")(); } },
        solicitarCriacaoWidget: { title: "solicitarCriacaoWidget()", run: function () { return fn("solicitarCriacaoWidget")(); } },
        atualizarWidget: { title: "atualizarWidget()", run: function () { return fn("atualizarWidget")({ titulo: "Alerta do Teste", descricao: "Funcionou!", fundoCor: "#ff0000", corTexto: "#ffffff", botao1: { texto: "Ação", acao: "botao_1_clicado" } }); } },
        minimizarApp: { title: "minimizarApp()", run: function () { return fn("minimizarApp")(); } },
        entrarPip: { title: "entrarPip()", run: function () { return fn("entrarPip")({ aspectRatio: "16:9" }); } },
        fecharApp: { title: "fecharApp()", run: function () { return fn("fecharApp")(); } },
        ativarSegundoPlano: { title: "ativarSegundoPlano()", run: function () { return fn("ativarSegundoPlano")({ titulo: "Meu App Rodando", texto: "Não feche isso..." }); } },
        desativarSegundoPlano: { title: "desativarSegundoPlano()", run: function () { return fn("desativarSegundoPlano")(); } },
        abrirOverlay: { title: "abrirOverlay()", run: function () { return fn("abrirOverlay")({ url: "https://multiversando.com.br", largura: 300, altura: 400 }); } },
        fecharOverlay: { title: "fecharOverlay()", run: function () { return fn("fecharOverlay")(); } },

        tirarFoto: { title: "tirarFoto()", run: async function () { var result = await fn("tirarFoto")({ base64: true }); state.lastPhoto = result; return result; } },
        capturarVideo: { title: "capturarVideo()", run: function () { return fn("capturarVideo")({ duracaoSegundos: 5 }); } },
        escanearQRCode: { title: "escanearQRCode()", run: function () { return fn("escanearQRCode")(); } },
        pastaSelect: { title: "pastaSelect()", run: function () { return fn("pastaSelect")(); } },

        obterRaizArmazenamento: { title: "obterRaizArmazenamento()", run: function () { return fn("obterRaizArmazenamento")(); } },
        listarDiretorio: { title: "listarDiretorio('/storage/emulated/0/')", run: function () { return fn("listarDiretorio")("/storage/emulated/0/"); } },
        criarDiretorio: { title: "criarDiretorio('/storage/emulated/0/Html2ApkManager')", run: function () { return fn("criarDiretorio")("/storage/emulated/0/Html2ApkManager"); } },
        salvarArquivoExterno: { title: "salvarArquivoExterno(..., 'teste')", run: function () { return fn("salvarArquivoExterno")("/storage/emulated/0/Html2ApkManager/teste.txt", "teste criado via JS!"); } },
        lerArquivoExterno: { title: "lerArquivoExterno(.../teste.txt)", run: function () { return fn("lerArquivoExterno")("/storage/emulated/0/Html2ApkManager/teste.txt"); } },
        abrirArquivoExterno: { title: "abrirArquivoExterno(.../teste.txt)", run: function () { return fn("abrirArquivoExterno")("/storage/emulated/0/Html2ApkManager/teste.txt", { exibirUi: true }); } },
        abrirArquivoExternoSemUI: { title: "abrirArquivoExterno(mp3, exibirUi: false)", run: function () { return fn("abrirArquivoExterno")("/storage/emulated/0/Music/audio.mp3", { exibirUi: false }); } },
        fecharArquivoExterno: { title: "fecharArquivoExterno()", run: function () { return fn("fecharArquivoExterno")(); } },
        copiarExterno: { title: "copiarExterno()", run: function () { return fn("copiarExterno")("/storage/emulated/0/Html2ApkManager/teste.txt", "/storage/emulated/0/Html2ApkManager/copia.txt"); } },
        moverExterno: { title: "moverExterno()", run: function () { return fn("moverExterno")("/storage/emulated/0/Html2ApkManager/copia.txt", "/storage/emulated/0/Html2ApkManager/movido.txt"); } },
        excluirExterno: { title: "excluirExterno(.../Html2ApkManager)", run: function () { return fn("excluirExterno")("/storage/emulated/0/Html2ApkManager"); } },
        ouvirMic: { title: "ouvirMic()", run: async function () { state.micRecording = true; return fn("ouvirMic")(); } },
        pararMic: { title: "pararMic()", run: async function () { state.micRecording = false; return fn("pararMic")(); } },
        falar: { title: "falar()", run: function () { return fn("falar")("Ola, eu sou o html2apk", { idioma: "pt-BR", velocidade: 1 }); } },
        pararFala: { title: "pararFala()", run: function () { return fn("pararFala")(); } },
        ouvir: { title: "ouvir()", run: function () { return fn("ouvir")({ idioma: "pt-BR", prompt: "Fale uma frase para testar" }); } },
        ocr: { title: "ocr(imagem)", run: async function () { if (!state.lastImage) { state.lastImage = await fn("escolherImagem")(); } if (!state.lastImage || !state.lastImage.uri) { return { canceled: true }; } return fn("ocr")(state.lastImage); } },

        escolherImagem: { title: "escolherImagem()", run: async function () { var result = await fn("escolherImagem")(); state.lastImage = result; return result; } },
        escolherImagens: { title: "escolherImagens()", run: function () { return fn("escolherImagens")({ multiplas: true }); } },
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
        instalarAtualizacao: { title: "instalarAtualizacao()", run: function () { var opts = prompt("Titulo do modal:", "Baixando atualizacao..."); var optsMsg = prompt("Mensagem do modal:", "Por favor, aguarde."); alert("Simulacao: instalando atualizacao de https://example.com/app.apk com titulo: " + opts); return fn("instalarAtualizacao")("https://example.com/app.apk", { titulo: opts, mensagem: optsMsg }); } },
        solicitarPermissaoInstalacao: { title: "solicitarPermissaoInstalacao()", run: function () { return fn("solicitarPermissaoInstalacao")(); } },
        baixarArquivo: { title: "baixarArquivo()", run: function () { return fn("baixarArquivo")("https://example.com/", "example.html"); } },
        baixarBase64: { title: "baixarBase64()", run: function () { return fn("baixarBase64")("pixel-download.png", sampleImageBase64, { mimeType: "image/png" }); } },
        baixarArquivoLocal: { title: "baixarArquivoLocal()", run: async function () { var file = await fn("escolherArquivo")(); if (!file) { return { canceled: true }; } return fn("baixarArquivoLocal")(file, "copia-" + (file.name || file.nome || "arquivo")); } },
        excluirArquivo: { title: "excluirArquivo()", run: function () { return fn("excluirArquivo")("lab.json"); } },

        abrirNoApp: { title: "abrirNoApp()", run: function () { return fn("abrirNoApp")("#teste-funcoes"); } },
        abrirForaDoApp: { title: "abrirForaDoApp()", run: function () { return fn("abrirForaDoApp")("https://example.com"); } },
        abrirUrl: { title: "abrirUrl()", run: function () { return fn("abrirUrl")("https://example.com"); } },
        abrirUrlExterno: { title: "abrirUrlExterno()", run: function () { return fn("abrirUrlExterno")("https://example.com"); } },
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
        infoAppsAbertos: { title: "infoAppsAbertos()", run: function () { return fn("infoAppsAbertos")(); } },

        obterLocalizacao: { title: "obterLocalizacao()", run: function () { return fn("obterLocalizacao")({ altaPrecisao: true, timeoutMs: 10000 }); } },
        acompanharLocalizacao: { title: "acompanharLocalizacao()", run: async function () { var result = await fn("acompanharLocalizacao")({ intervaloMs: 5000 }); state.watchId = result && result.watchId; return result; } },
        pararLocalizacao: { title: "pararLocalizacao()", run: function () { return fn("pararLocalizacao")(state.watchId || ""); } },
        aoMudarLocalizacao: { title: "aoMudarLocalizacao()", run: function () { if (state.stopLocationEvent) { state.stopLocationEvent(); } state.stopLocationEvent = fn("aoMudarLocalizacao")(function (event) { log("localizacao:mudou", event, "ok"); }); return { listening: true }; } },
        medirVelocidade: { title: "medirVelocidade()", run: async function () { if (state.pararMedicao) { await state.pararMedicao(); } state.pararMedicao = await fn("medirVelocidade")(function(kmh, local) { log("medirVelocidade", { kmh: kmh, original: local }, "ok"); }); return { measuring: true }; } },
        pararVelocidade: { title: "parar medidor de velocidade", run: async function () { if (state.pararMedicao) { await state.pararMedicao(); state.pararMedicao = null; return { stopped: true }; } return { stopped: false }; } },
        autenticarBiometria: { title: "autenticarBiometria()", run: function () { return fn("autenticarBiometria")({ titulo: "Teste html2apk", descricao: "Confirme para testar a bridge" }); } },
        solicitarBloqueio: { title: "solicitarBloqueio()", run: function () { return fn("solicitarBloqueio")({ titulo: "Acesso Restrito", descricao: "Confirme a senha de tela" }); } },
        solicitarSegundoPlano: { title: "solicitarSegundoPlano()", run: function () { return fn("solicitarSegundoPlano")(); } },
        configurarInicioAutomatico: { title: "configurarInicioAutomatico()", run: function () { state.autoStart = !state.autoStart; return fn("configurarInicioAutomatico")(state.autoStart); } },
        salvarSeguro: { title: "salvarSeguro()", run: function () { return fn("salvarSeguro")("tokenTeste", { token: "abc123", criadoEm: Date.now() }); } },
        lerSeguro: { title: "lerSeguro()", run: function () { return fn("lerSeguro")("tokenTeste"); } },
        lerSeguroCompleto: { title: "lerSeguroCompleto()", run: function () { return fn("lerSeguroCompleto")("tokenTeste"); } },
        listarSeguro: { title: "listarSeguro()", run: function () { return fn("listarSeguro")(); } },
        removerSeguro: { title: "removerSeguro()", run: function () { return fn("removerSeguro")("tokenTeste"); } },
        limparSeguro: { title: "limparSeguro()", run: function () { return fn("limparSeguro")(); } },

        salvarNaSessao: { title: "salvarNaSessao()", run: function () { return fn("salvarNaSessao")("testeChave", "valor_sessao_123"); } },
        lerDaSessao: { title: "lerDaSessao()", run: function () { return fn("lerDaSessao")("testeChave"); } },
        removerDaSessao: { title: "removerDaSessao()", run: function () { return fn("removerDaSessao")("testeChave"); } },
        listarSessao: { title: "listarSessao()", run: function () { return fn("listarSessao")(); } },
        limparSessao: { title: "limparSessao()", run: function () { return fn("limparSessao")(); } },
        
        solicitarPermissaoContatos: { title: "solicitarPermissaoContatos()", run: function () { return fn("solicitarPermissaoContatos")(); } },
        pesquisarContato: { title: "pesquisarContato()", run: function () { return fn("pesquisarContato")("a"); } },

        infoPapelParede: { title: "infoPapelParede()", run: function () { return fn("infoPapelParede")(); } },
        definirPapelParede: { title: "definirPapelParede()", run: function () { return fn("definirPapelParede")({ base64: sampleImageBase64, mimeType: "image/png", alvo: "inicio" }); } },
        abrirConfigPapel: { title: "abrirConfiguracaoPapelParede()", run: function () { return fn("abrirConfiguracaoPapelParede")(); } },
        definirImagemEscolhida: { title: "imagem escolhida -> papel de parede", run: async function () { if (!state.lastImage) { state.lastImage = await fn("escolherImagem")(); } if (!state.lastImage || !state.lastImage.uri) { return { canceled: true }; } return fn("definirPapelParede")({ uri: state.lastImage.uri, alvo: "inicio", mimeType: state.lastImage.mimeType || "image/*" }); } },

        registrarEventos: { title: "registrarEventos()", run: function () { return fn("registrarEventos")({ aoClicarNotificacao: function (e) { alert("Clicou na notificacao: " + JSON.stringify(e)); }, aoMudarEstadoApp: function (e) { console.log("Estado mudou:", e); } }); } },
        obterNotificacaoInicial: { title: "obterNotificacaoInicial()", run: function () { return fn("obterNotificacaoInicial")(); } },
        obterLinkInicial: { title: "obterLinkInicial()", run: function () { return fn("obterLinkInicial")(); } },
        aoLigarDispositivo: { title: "aoLigarDispositivo()", run: function () { return fn("aoLigarDispositivo")(() => alert("App iniciou via boot!")); } }
      };

      var groups = [
        { title: "Feedback e compartilhamento", ids: ["toast", "vibrar", "aguardar", "copiarTexto", "lerTextoCopiado", "compartilharTexto", "compartilhar", "compartilharApp", "receberCompartilhamento", "compartilhamentoInicial"] },
        { title: "Bluetooth", ids: ["iniciarBt", "procurarBt", "conectarBt", "enviarBt"] },
        { title: "Wi-Fi local", ids: ["iniciarWifi", "procurarWifi", "conectarWifi", "enviarWifi"] },
        { title: "Arquivo, PDF e Galeria", ids: ["solicitarPermissaoArmazenamento", "statusPermissaoArmazenamento", "escolherArquivo", "escolherArquivos", "salvarArquivo", "apontarArquivo", "lerArquivo", "lerArquivoCompleto", "listarArquivos", "arquivoExiste", "abrirArquivo", "compartilharArquivo", "excluirArquivo", "baixarArquivo", "baixarArquivoLocal", "gerarPdfHTML", "salvarNaGaleria", "infoArmazenamento"] },
        { title: "Gerenciador de Arquivos Externo (Root)", ids: ["obterRaizArmazenamento", "pastaSelect", "listarDiretorio", "criarDiretorio", "salvarArquivoExterno", "lerArquivoExterno", "abrirArquivoExterno", "abrirArquivoExternoSemUI", "fecharArquivoExterno", "copiarExterno", "moverExterno", "excluirExterno"] },
        { title: "Notificacoes", ids: ["notificar", "agendarNotificacao", "agendarNotificacoes", "cancelarNotificacao", "agendarLoopNotificacoes", "cancelarLoopNotificacoes", "pushInfo"] },
        { title: "Permissoes e configuracoes", ids: ["statusPermissoes", "permissaoNotificacao", "statusPermissaoNotificacoes", "permissaoCamera", "permissaoMicrofone", "statusMicrofone", "solicitarPermissaoContatos", "alarmeExato", "abrirAlarmeExato", "statusSobreposicao", "solicitarSobreposicao", "abrirSobreposicao", "abrirConfiguracoesDeeplink"] },
        { title: "Background e Worker", ids: ["ativarSegundoPlano", "desativarSegundoPlano"] },
        { title: "Sensores (Luminosidade)", ids: ["ouvirLuminosidade", "pararLuminosidade"] },
        { title: "Tela e hardware", ids: ["fullscreenOn", "fullscreenOff", "telaAcordadaOn", "telaAcordadaOff", "brilhoTela", "corTema", "corBarrasSistema", "lanternaOn", "lanternaOff", "lanterna", "statusLanterna", "capturarTela", "tirarPrint", "volumeAtual", "definirVolume", "aumentarVolume", "diminuirVolume", "iniciarIconeFlutuante", "configurarIconeFlutuante", "definirOpacidadeIconeFlutuante", "pararIconeFlutuante", "abrirOverlay", "fecharOverlay", "solicitarCriacaoWidget", "atualizarWidget", "minimizarApp", "entrarPip", "fecharApp"] },
        { title: "Camera, QR Code e microfone", ids: ["tirarFoto", "capturarVideo", "escanearQRCode", "ouvirMic", "pararMic"] },
        { title: "Texto e voz", ids: ["ocr", "falar", "pararFala", "ouvir"] },
        { title: "Arquivos e midia", ids: ["escolherImagem", "escolherImagens", "escolherArquivo", "escolherArquivos", "escolherVideo", "escolherPasta", "salvarArquivoPicker", "salvarArquivoCrud", "lerArquivo", "lerArquivoCompleto", "listarArquivos", "infoArquivo", "arquivoExiste", "abrirArquivo", "compartilharArquivo", "baixarArquivo", "baixarBase64", "baixarArquivoLocal", "excluirArquivo", "instalarAtualizacao", "solicitarPermissaoInstalacao"] },
        { title: "Abrir apps externos", ids: ["abrirNoApp", "abrirForaDoApp", "abrirUrl", "abrirUrlExterno", "discar", "abrirMapa", "abrirWhatsapp"] },
        { title: "Diagnostico", ids: ["infoDispositivo", "infoRede", "infoBateria", "infoMemoria", "infoArmazenamento", "infoDesempenho", "appsAbertos", "infoAppsAbertos"] },
        { title: "Localizacao e seguranca", ids: ["obterLocalizacao", "acompanharLocalizacao", "pararLocalizacao", "aoMudarLocalizacao", "medirVelocidade", "pararVelocidade"] },
        { title: "Seguranca e armazenamento", ids: ["autenticarBiometria", "solicitarBloqueio", "solicitarSegundoPlano", "configurarInicioAutomatico", "salvarSeguro", "lerSeguro", "lerSeguroCompleto", "listarSeguro", "removerSeguro", "limparSeguro", "salvarNaSessao", "lerDaSessao", "removerDaSessao", "listarSessao", "limparSessao"] },
        { title: "Agenda de Contatos", ids: ["solicitarPermissaoContatos", "pesquisarContato"] },
        { title: "Papel de parede", ids: ["infoPapelParede", "definirPapelParede", "abrirConfigPapel", "definirImagemEscolhida"] },
        { title: "Eventos", ids: ["registrarEventos", "obterNotificacaoInicial", "obterLinkInicial", "aoLigarDispositivo"] }
      ];

      var safeActionIds = [
        "registrarEventos", "statusPermissoes", "statusPermissaoNotificacoes", "statusMicrofone",
        "alarmeExato", "statusSobreposicao", "statusLanterna", "volumeAtual",
        "infoDispositivo", "infoRede", "infoBateria", "infoMemoria", "infoArmazenamento",
        "infoDesempenho", "appsAbertos", "infoAppsAbertos", "listarArquivos", "arquivoExiste",
        "compartilhamentoInicial", "obterNotificacaoInicial", "obterLinkInicial", "infoPapelParede",
        "aguardar", "lerTextoCopiado"
      ];
      var setupActionIds = [
        "salvarArquivoCrud", "lerArquivo", "lerArquivoCompleto", "infoArquivo", "salvarSeguro",
        "lerSeguro", "lerSeguroCompleto", "listarSeguro", "baixarBase64",
        "salvarNaSessao", "lerDaSessao", "listarSessao"
      ];
      var listenerActionIds = [
        "registrarEventos", "receberCompartilhamento", "iniciarBt", "iniciarWifi", "aoMudarLocalizacao"
      ];
      var externalActionIds = [
        "compartilharTexto", "compartilhar", "compartilharApp", "abrirForaDoApp", "abrirUrl",
        "abrirUrlExterno", "discar", "abrirMapa", "abrirWhatsapp", "abrirAlarmeExato",
        "abrirSobreposicao", "abrirConfigPapel", "escolherImagem", "escolherImagens",
        "escolherArquivo", "escolherArquivos", "escolherVideo", "escolherPasta", "pastaSelect",
        "salvarArquivo", "salvarArquivoPicker", "baixarArquivoLocal", "tirarFoto", "capturarVideo",
        "escanearQRCode", "ouvir", "autenticarBiometria", "solicitarBloqueio", "solicitarPermissaoContatos"
      ];
      var dangerActionIds = ["fecharApp", "minimizarApp", "entrarPip", "limparSeguro", "excluirArquivo", "pararIconeFlutuante"];
      var initialSmokeIds = ["registrarEventos", "statusPermissoes", "infoDispositivo", "infoRede", "infoBateria", "volumeAtual"];

      function toSet(ids) {
        return ids.reduce(function (map, id) {
          map[id] = true;
          return map;
        }, {});
      }

      var safeActionSet = toSet(safeActionIds);
      var setupActionSet = toSet(setupActionIds);
      var listenerActionSet = toSet(listenerActionIds);
      var externalActionSet = toSet(externalActionIds);
      var dangerActionSet = toSet(dangerActionIds);

      function actionMode(id) {
        if (listenerActionSet[id]) {
          return "listener";
        }
        if (safeActionSet[id]) {
          return "safe";
        }
        if (setupActionSet[id]) {
          return "setup";
        }
        if (externalActionSet[id]) {
          return "external";
        }
        return "manual";
      }

      function actionHint(id) {
        var mode = actionMode(id);
        if (mode === "listener") {
          return "Registra e fica escutando";
        }
        if (mode === "safe") {
          return "Pode rodar no lote seguro";
        }
        if (mode === "setup") {
          return "Prepara ou consulta dados de teste";
        }
        if (mode === "external") {
          return "Abre permissao, seletor ou app externo";
        }
        if (dangerActionSet[id]) {
          return "Afeta estado do app";
        }
        return "Toque para executar";
      }

      function groupRunnableIds(group) {
        return group.ids.filter(function (id) {
          return safeActionSet[id] || setupActionSet[id];
        });
      }

      function updateStats() {
        var stats = document.getElementById("stats");
        var total = Object.keys(actions).length;
        if (!stats) {
          return;
        }
        stats.innerHTML = [
          "<span class='chip'>" + total + " testes no laboratorio</span>",
          "<span class='chip'>" + safeActionIds.length + " seguros em lote</span>",
          "<span class='chip'>" + listenerActionIds.length + " grupos de escuta</span>",
          "<span class='chip'>" + state.outputCount + " resultados</span>"
        ].join("");
      }

      function applyFilter() {
        var filter = document.getElementById("filterInput");
        var term = filter ? filter.value.trim().toLowerCase() : "";
        document.querySelectorAll("#groups section").forEach(function (section) {
          var visible = 0;
          var groupTitle = section.querySelector("h2").textContent.toLowerCase();
          section.querySelectorAll("[data-action]").forEach(function (button) {
            var text = button.textContent.toLowerCase();
            var match = !term || text.indexOf(term) !== -1 || groupTitle.indexOf(term) !== -1;
            button.hidden = !match;
            if (match) {
              visible += 1;
            }
          });
          section.hidden = visible === 0;
        });
      }

      function render() {
        var root = document.getElementById("groups");
        var notice = "<p class='notice'>Os lotes seguros evitam camera, seletores, apps externos e acoes que fecham/minimizam. Para eventos passivos, deixe o app aberto e provoque o evento fisico no aparelho.</p>";
        root.innerHTML = groups.map(function (group) {
          var runnable = groupRunnableIds(group);
          var runButton = runnable.length
            ? "<button type='button' data-run-group='" + runnable.join(",") + "'>Rodar seguros (" + runnable.length + ")</button>"
            : "";
          return "<section><h2 class='with-action'><span>" + group.title + "</span>" + runButton + "</h2><div class='grid'>" + group.ids.map(function (id) {
            var item = actions[id];
            var mode = actionMode(id);
            var classes = [mode];
            if (dangerActionSet[id]) {
              classes.push("danger");
            }
            return "<button type='button' class='" + classes.join(" ") + "' data-action='" + id + "'><span>" + item.title + "</span><small>" + actionHint(id) + "</small></button>";
          }).join("") + "</div></section>";
        }).join("") + notice;
        updateStats();
        applyFilter();
      }

      document.addEventListener("click", function (event) {
        var groupButton = event.target.closest("[data-run-group]");
        var button = event.target.closest("[data-action]");
        if (groupButton) {
          runSequence(groupButton.getAttribute("data-run-group").split(","), "grupo");
          return;
        }
        if (button) {
          run(button.getAttribute("data-action"));
        }
      });

      document.addEventListener("input", function (event) {
        if (event.target && event.target.id === "filterInput") {
          applyFilter();
        }
      });

      document.getElementById("runSafeButton").addEventListener("click", function () {
        runSequence(safeActionIds, "testes seguros");
      });

      document.getElementById("runPrepareButton").addEventListener("click", function () {
        runSequence(setupActionIds, "preparar dados");
      });

      document.getElementById("registerEventsButton").addEventListener("click", function () {
        run("registrarEventos");
      });

      document.getElementById("clearLogButton").addEventListener("click", function () {
        var feed = document.getElementById("outputFeed");
        if (feed) {
          feed.innerHTML = "";
        }
        state.outputCount = 0;
        updateStats();
      });

      document.addEventListener("deviceready", function () {
        log("deviceready", { ready: true }, "ok");
        runSequence(initialSmokeIds, "diagnostico inicial");
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
      "SET_WALLPAPER",
      "BLUETOOTH_SCAN",
      "BLUETOOTH_CONNECT",
      "NFC",
      "MODIFY_AUDIO_SETTINGS",
      "SYSTEM_ALERT_WINDOW",
      "ACCESS_NETWORK_STATE",
      "ACCESS_WIFI_STATE",
      "CHANGE_WIFI_MULTICAST_STATE"
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
  if (logcatProcess) {
    logcatProcess.kill();
    logcatProcess = null;
  }
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

ipcMain.handle("dialog:select-json", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select app.json",
    properties: ["openFile"],
    filters: [
      { name: "JSON files", extensions: ["json"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to read or parse JSON file: ${error.message}`);
  }
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

ipcMain.on("logcat:start", (event, filter) => {
  if (logcatProcess) {
    logcatProcess.kill();
  }
  
  const args = ["logcat"];
  if (filter) {
    args.push("-s", filter);
  }
  
  logcatProcess = spawn("adb", args);
  
  logcatProcess.stdout.on("data", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("logcat:data", data.toString());
    }
  });
  
  logcatProcess.stderr.on("data", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("logcat:data", data.toString());
    }
  });
  
  logcatProcess.on("error", (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (err.code === "ENOENT") {
        mainWindow.webContents.send("logcat:data", "[Erro] O comando 'adb' não foi encontrado. Certifique-se de que o Android SDK está instalado e o 'adb' está no PATH do sistema.");
      } else {
        mainWindow.webContents.send("logcat:data", `[Erro] Falha ao iniciar adb: ${err.message}`);
      }
    }
    logcatProcess = null;
  });
  
  logcatProcess.on("close", () => {
    logcatProcess = null;
  });
});

ipcMain.on("logcat:stop", () => {
  if (logcatProcess) {
    logcatProcess.kill();
    logcatProcess = null;
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
