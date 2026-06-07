(function () {
  if (typeof window === "undefined" || window.Html2ApkRuntimeConsole) {
    return;
  }

  var MAX_ENTRIES = 300;
  var MAX_DETAIL = 1800;
  var entries = [];
  var networkEntries = [];
  var scanCount = 0;
  var scanTimer = null;
  var slowScanTimer = null;
  var modal = null;
  var panel = null;
  var button = null;
  var consoleList = null;
  var networkList = null;
  var badge = null;
  var consoleCount = null;
  var networkCount = null;
  var errorCount = null;
  var copyAllButton = null;
  var copyOnlyErrorsButton = null;
  var activeTab = "console";
  var opened = false;
  var dragMoved = false;
  var originalConsole = {};

  var functionNames = [
    "notificar", "notify",
    "agendarNotificacao", "scheduleNotification",
    "agendarNotificacoes", "scheduleNotifications",
    "agendarLoopNotificacoes", "scheduleNotificationLoop",
    "cancelarNotificacao", "cancelNotification",
    "lanterna", "flashlight",
    "alternarLanterna", "toggleFlashlight",
    "tirarFoto", "takePhoto", "capturePhoto",
    "capturarVideo", "captureVideo",
    "escanearQRCode", "scanQRCode", "scanQrCode",
    "ouvirMic", "listenMic", "startMic",
    "pararMic", "stopMic",
    "solicitarPermissaoCamera", "requestCameraPermission",
    "solicitarPermissaoMicrofone", "requestMicrophonePermission",
    "solicitarPermissaoNotificacoes", "requestNotificationPermission",
    "escolherArquivo", "pickFile",
    "escolherImagem", "pickImage",
    "escolherImagens", "pickImages",
    "escolherPasta", "pickFolder",
    "salvarArquivo", "saveFile",
    "lerArquivo", "readFile", "readStoredFile",
    "excluirArquivo", "deleteFile", "removeFile",
    "listarArquivos", "listFiles",
    "abrirArquivo", "openFile",
    "compartilharArquivo", "shareFile",
    "compartilhar", "share",
    "compartilharApp", "shareApp", "share_me",
    "aguardar", "loading",
    "aoReceberCompartilhamento", "onShareReceived",
    "obterCompartilhamentoInicial", "getInitialShare",
    "procurarBT", "scanBluetooth", "procurarBluetooth", "buscarBT",
    "conectarBT", "connectBluetooth", "conectarBluetooth",
    "enviarBT", "sendBluetooth",
    "aoConectarBT", "onBluetoothConnect",
    "aoReceberDadosBT", "onBluetoothData",
    "aoDarErroBT", "onBluetoothError",
    "procurarWiFi", "scanWiFi", "scanWifi",
    "conectarWiFi", "connectWiFi", "connectWifi",
    "enviarWiFi", "sendWiFi", "sendWifi",
    "aoConectarWiFi", "onWiFiConnect", "onWifiConnect",
    "aoReceberDadosWiFi", "onWiFiData", "onWifiData",
    "aoDarErroWiFi", "onWiFiError", "onWifiError",
    "ocr", "recognizeText", "textFromImage",
    "falar", "speak", "textToSpeech",
    "pararFala", "stopSpeaking",
    "ouvir", "recognizeSpeech", "speechToText",
    "baixarArquivo", "downloadFile",
    "baixarBase64", "downloadBase64", "downloadFromBase64",
    "baixarArquivoLocal", "downloadLocalFile", "downloadFromFile",
    "aoConectarUSB", "onUSBConnect", "onUsbConnect",
    "aoDesconectarUSB", "onUSBDisconnect", "onUsbDisconnect",
    "aoConectarFone", "onHeadphoneConnect",
    "aoDesconectarFone", "onHeadphoneDisconnect",
    "aoMudarVolume", "onVolumeChange",
    "aoAbrirTeclado", "onKeyboardOpen",
    "aoFecharTeclado", "onKeyboardClose",
    "aoSacudirCelular", "onPhoneShake", "onShake",
    "aoVirarCelularParaBaixo", "onPhoneFaceDown",
    "aoAproximarObjeto", "onProximityNear",
    "aoTirarPrint", "onScreenshot",
    "aoMudarOrientacao", "onOrientationChange",
    "aoNFC", "onNFC", "onNfc",
    "aoReceberNotificacao", "onNotificationReceived",
    "definirPapelParede", "setWallpaper", "setPhoneWallpaper",
    "infoPapelParede", "wallpaperInfo",
    "abrirConfiguracaoPapelParede", "openWallpaperSettings",
    "capturarTela", "tirarPrint", "captureScreen", "takeScreenshot", "screenshot",
    "volumeAtual", "currentVolume", "getVolume",
    "definirVolume", "setVolume",
    "aumentarVolume", "increaseVolume",
    "diminuirVolume", "decreaseVolume",
    "configurarIconeFlutuante", "configureFloatingIcon",
    "definirOpacidadeIconeFlutuante", "setFloatingIconOpacity",
    "minimizarApp", "minimizeApp",
    "fecharApp", "closeApp", "exitApp",
    "abrirNoApp", "openInApp",
    "abrirForaDoApp", "openOutsideApp",
    "abrirUrl", "openUrl",
    "obterLocalizacao", "getLocation",
    "acompanharLocalizacao", "watchLocation",
    "pararLocalizacao", "stopLocationWatch",
    "autenticarBiometria", "authenticateBiometric",
    "salvarSeguro", "saveSecure", "secureSet",
    "lerSeguro", "readSecure", "secureGet",
    "removerSeguro", "deleteSecure", "removeSecure",
    "vibrar", "vibrate",
    "toast",
    "statusPermissoes", "permissionStatus",
    "infoDispositivo", "deviceInfo",
    "infoDesempenho", "performanceInfo",
    "appsAbertos", "openAppsMemory"
  ];

  function now() {
    return new Date().toLocaleTimeString();
  }

  function stringify(value) {
    if (value instanceof Error) {
      return value.stack || value.message || String(value);
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function short(value, limit) {
    var text = stringify(value);
    var max = limit || 700;
    return text.length > max ? text.slice(0, max) + "..." : text;
  }

  function scriptAssetUrl(fileName) {
    var scripts = document.getElementsByTagName("script");
    var index;
    var src;

    for (index = scripts.length - 1; index >= 0; index -= 1) {
      src = scripts[index].getAttribute("src") || "";
      if (src.indexOf("html2apk-runtime-console.js") !== -1) {
        try {
          return new URL(fileName, scripts[index].src).toString();
        } catch (error) {
          return fileName;
        }
      }
    }

    return fileName;
  }

  function keepEntry(list, entry) {
    list.push(entry);
    while (list.length > MAX_ENTRIES) {
      list.shift();
    }
  }

  function renderEntry(entry, target) {
    var item;
    var meta;
    var label;
    var time;
    var body;

    if (!target) {
      return;
    }

    item = document.createElement("div");
    item.className = "html2apk-console-entry " + entry.kind;

    meta = document.createElement("div");
    meta.className = "html2apk-console-meta";
    label = document.createElement("span");
    label.className = "html2apk-console-kind";
    label.textContent = entry.kind.toUpperCase();
    time = document.createElement("time");
    time.textContent = entry.time;

    body = document.createElement("pre");
    body.textContent = entry.message;

    meta.appendChild(label);
    meta.appendChild(time);
    item.appendChild(meta);
    item.appendChild(body);
    target.appendChild(item);

    while (target.children.length > MAX_ENTRIES) {
      target.removeChild(target.firstChild);
    }

    scrollListToBottom(target);
  }

  function scrollListToBottom(target) {
    if (!target) {
      return;
    }
    target.scrollTop = target.scrollHeight;
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        target.scrollTop = target.scrollHeight;
      });
    }
  }

  function renderNetworkEntry(entry) {
    var status = entry.status || "ERR";
    var method = entry.method || "GET";
    var title = method + " " + entry.url + " -> " + status + " (" + entry.durationMs + "ms)";
    var detail = {
      type: entry.type,
      ok: entry.ok,
      status: entry.status,
      statusText: entry.statusText,
      durationMs: entry.durationMs,
      requestBody: entry.requestBody,
      responseBody: entry.responseBody,
      error: entry.error
    };

    renderEntry({
      kind: entry.ok ? "network" : "error",
      time: entry.time,
      message: title + "\n" + short(detail, MAX_DETAIL)
    }, networkList);
  }

  function redrawLists() {
    if (consoleList) {
      consoleList.innerHTML = "";
      entries.forEach(function (entry) {
        renderEntry(entry, consoleList);
      });
    }
    if (networkList) {
      networkList.innerHTML = "";
      networkEntries.forEach(renderNetworkEntry);
    }
  }

  function updateBadge() {
    var count;
    count = entries.filter(function (entry) {
      return entry.kind === "error";
    }).length + networkEntries.filter(function (entry) {
      return !entry.ok;
    }).length;
    if (badge) {
      badge.textContent = count ? String(count) : "";
      badge.style.display = count ? "inline-flex" : "none";
    }
    if (consoleCount) {
      consoleCount.textContent = String(entries.length);
    }
    if (networkCount) {
      networkCount.textContent = String(networkEntries.length);
    }
    if (errorCount) {
      errorCount.textContent = String(count);
    }
  }

  function add(kind, message, detail) {
    var hasDetail = arguments.length > 2 && typeof detail !== "undefined";
    var entry = {
      kind: kind || "info",
      time: now(),
      message: hasDetail ? String(message || "") + "\n" + short(detail, MAX_DETAIL) : String(message || "")
    };

    keepEntry(entries, entry);
    renderEntry(entry, consoleList);
    updateBadge();
    if (entry.kind === "error") {
      openConsole("console");
    }
  }

  function addNetwork(entry) {
    var safeEntry = entry || {};
    safeEntry.time = safeEntry.time || now();
    safeEntry.durationMs = safeEntry.durationMs || 0;
    safeEntry.ok = safeEntry.ok !== false && (!safeEntry.status || (safeEntry.status >= 200 && safeEntry.status < 400));
    keepEntry(networkEntries, safeEntry);
    renderNetworkEntry(safeEntry);
    updateBadge();
    if (!safeEntry.ok) {
      openConsole("network");
    }
  }

  function consoleEntryText(entry) {
    return "[" + (entry.time || "") + "] " + String(entry.kind || "info").toUpperCase() + "\n" + String(entry.message || "");
  }

  function networkEntryText(entry) {
    var status = entry.status || "ERR";
    var method = entry.method || "GET";
    var title = method + " " + entry.url + " -> " + status + " (" + (entry.durationMs || 0) + "ms)";
    var detail = {
      type: entry.type,
      ok: entry.ok,
      status: entry.status,
      statusText: entry.statusText,
      durationMs: entry.durationMs,
      requestBody: entry.requestBody,
      responseBody: entry.responseBody,
      error: entry.error
    };

    return "[" + (entry.time || "") + "] " + (entry.ok ? "NETWORK" : "ERROR") + "\n" + title + "\n" + short(detail, MAX_DETAIL);
  }

  function runtimeConsoleText(onlyErrors) {
    var output = [];
    entries.forEach(function (entry) {
      if (!onlyErrors || entry.kind === "error") {
        output.push(consoleEntryText(entry));
      }
    });
    networkEntries.forEach(function (entry) {
      if (!onlyErrors || !entry.ok) {
        output.push(networkEntryText(entry));
      }
    });
    if (!output.length) {
      return onlyErrors ? "Nenhum erro registrado." : "Console vazio.";
    }
    return output.join("\n\n");
  }

  function fallbackCopyText(text) {
    return new Promise(function (resolve, reject) {
      var target = document.body || document.documentElement;
      var textarea;
      var copied = false;

      if (!target || !document.createElement) {
        reject(new Error("Clipboard indisponivel."));
        return;
      }

      textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      target.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }

      target.removeChild(textarea);
      if (copied) {
        resolve();
      } else {
        reject(new Error("Nao foi possivel copiar."));
      }
    });
  }

  function copyTextToClipboard(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopyText(text);
      });
    }
    return fallbackCopyText(text);
  }

  function flashActionButton(target, label) {
    var original;
    if (!target) {
      return;
    }
    original = target.getAttribute("data-original-label") || target.textContent;
    target.setAttribute("data-original-label", original);
    target.textContent = label;
    target.disabled = true;
    setTimeout(function () {
      target.textContent = original;
      target.disabled = false;
    }, 1200);
  }

  function copyConsole() {
    var text = runtimeConsoleText(false);
    return copyTextToClipboard(text).then(function () {
      add("info", "Console copiado.");
      flashActionButton(copyAllButton, "Copiado");
      return { ok: true, copied: "console" };
    }, function (error) {
      add("error", "Falha ao copiar console", error);
      flashActionButton(copyAllButton, "Falhou");
      return { ok: false, copied: "console", message: error && error.message ? error.message : String(error) };
    });
  }

  function copyErrors() {
    var text = runtimeConsoleText(true);
    return copyTextToClipboard(text).then(function () {
      add("info", "Erros copiados.");
      flashActionButton(copyOnlyErrorsButton, "Copiado");
      return { ok: true, copied: "errors" };
    }, function (error) {
      add("error", "Falha ao copiar erros", error);
      flashActionButton(copyOnlyErrorsButton, "Falhou");
      return { ok: false, copied: "errors", message: error && error.message ? error.message : String(error) };
    });
  }

  function setActiveTab(tab) {
    activeTab = tab === "network" ? "network" : "console";
    if (!modal) {
      return;
    }
    modal.querySelectorAll("[data-html2apk-console-tab]").forEach(function (item) {
      item.classList.toggle("active", item.dataset.html2apkConsoleTab === activeTab);
    });
    if (consoleList) {
      consoleList.classList.toggle("active", activeTab === "console");
    }
    if (networkList) {
      networkList.classList.toggle("active", activeTab === "network");
    }
    updateBadge();
  }

  function clearActiveTab() {
    if (activeTab === "network") {
      networkEntries = [];
      if (networkList) {
        networkList.innerHTML = "";
      }
      updateBadge();
      return;
    }

    entries = [];
    if (consoleList) {
      consoleList.innerHTML = "";
    }
    updateBadge();
    add("info", "Console limpo.");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeButtonDraggable(target) {
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var startLeft = 0;
    var startTop = 0;

    target.addEventListener("pointerdown", function (event) {
      var rect = target.getBoundingClientRect();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      dragMoved = false;
      target.setPointerCapture(pointerId);
    });

    target.addEventListener("pointermove", function (event) {
      var nextLeft;
      var nextTop;
      if (pointerId !== event.pointerId) {
        return;
      }
      if (Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4) {
        dragMoved = true;
      }
      nextLeft = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - target.offsetWidth - 8);
      nextTop = clamp(startTop + event.clientY - startY, 8, window.innerHeight - target.offsetHeight - 8);
      target.style.left = nextLeft + "px";
      target.style.top = nextTop + "px";
      target.style.right = "auto";
      target.style.bottom = "auto";
      try {
        localStorage.setItem("html2apk.consoleButton", JSON.stringify({ left: nextLeft, top: nextTop }));
      } catch (error) {
      }
    });

    target.addEventListener("pointerup", function (event) {
      if (pointerId === event.pointerId) {
        target.releasePointerCapture(pointerId);
        pointerId = null;
      }
    });
  }

  function restoreButtonPosition(target) {
    var saved;
    try {
      saved = JSON.parse(localStorage.getItem("html2apk.consoleButton") || "null");
    } catch (error) {
      saved = null;
    }
    if (!saved || typeof saved.left !== "number" || typeof saved.top !== "number") {
      return;
    }
    target.style.left = clamp(saved.left, 8, window.innerWidth - 56) + "px";
    target.style.top = clamp(saved.top, 8, window.innerHeight - 56) + "px";
    target.style.right = "auto";
    target.style.bottom = "auto";
  }

  function makePanelDraggable(header, target) {
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var startLeft = 0;
    var startTop = 0;

    header.addEventListener("pointerdown", function (event) {
      var rect;
      if (event.target.closest("button")) {
        return;
      }
      rect = target.getBoundingClientRect();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      header.setPointerCapture(pointerId);
    });

    header.addEventListener("pointermove", function (event) {
      var nextLeft;
      var nextTop;
      if (pointerId !== event.pointerId) {
        return;
      }
      nextLeft = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - target.offsetWidth - 8);
      nextTop = clamp(startTop + event.clientY - startY, 8, window.innerHeight - target.offsetHeight - 8);
      target.style.position = "fixed";
      target.style.left = nextLeft + "px";
      target.style.top = nextTop + "px";
      target.style.right = "auto";
      target.style.bottom = "auto";
      target.style.transform = "none";
    });

    header.addEventListener("pointerup", function (event) {
      if (pointerId === event.pointerId) {
        header.releasePointerCapture(pointerId);
        pointerId = null;
      }
    });
  }

  function createUi() {
    var style;
    var icon;
    var header;
    var title;
    var tabs;
    var consoleTab;
    var networkTab;
    var summary;
    var consoleStat;
    var networkStat;
    var errorStat;
    var controls;
    var actions;
    var copyButton;
    var copyErrorsButton;
    var clearButton;
    var closeButton;
    var body;

    if (modal || !document.body) {
      return;
    }

    style = document.createElement("style");
    style.textContent = [
      ".html2apk-console-button{position:fixed;right:14px;bottom:14px;z-index:2147483640;width:58px;height:58px;border:0;border-radius:999px;background:#126fff;color:#fff;padding:0;box-shadow:0 16px 36px rgba(18,111,255,.34),0 8px 24px rgba(0,0,0,.28);touch-action:none}",
      ".html2apk-console-button:active{transform:scale(.98)}.html2apk-console-button img{width:100%;height:100%;object-fit:cover;border-radius:999px;display:block}.html2apk-console-button.fallback:before{content:'Console';font:800 10px system-ui,Segoe UI,Arial}",
      ".html2apk-console-badge{position:absolute;right:-3px;top:-3px;display:none;align-items:center;justify-content:center;min-width:21px;height:21px;border-radius:999px;background:#ef4444;color:#fff;font:900 11px system-ui,Segoe UI,Arial;border:2px solid #fff}",
      ".html2apk-console-modal{position:fixed;inset:0;z-index:2147483641;display:none;background:rgba(5,10,20,.56);padding:12px;font-family:system-ui,Segoe UI,Arial}",
      ".html2apk-console-modal.open{display:flex;align-items:flex-end;justify-content:center}",
      ".html2apk-console-panel{width:min(1040px,calc(100vw - 18px));max-height:min(82vh,760px);background:#0b1020;color:#edf4ff;border:1px solid rgba(148,163,184,.25);border-radius:16px;box-shadow:0 28px 90px rgba(0,0,0,.5);overflow:hidden}",
      ".html2apk-console-header{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;padding:12px;border-bottom:1px solid rgba(148,163,184,.22);background:linear-gradient(180deg,#111827,#0f172a);touch-action:none}",
      ".html2apk-console-title{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}.html2apk-console-title strong{font-size:15px;line-height:1.2}.html2apk-console-subtitle{display:block;color:#94a3b8;font-size:11px;font-weight:700;margin-top:2px}",
      ".html2apk-console-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.html2apk-console-stat{border:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.8);border-radius:10px;padding:8px}.html2apk-console-stat span{display:block;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.html2apk-console-stat strong{display:block;margin-top:2px;font-size:18px;line-height:1;color:#f8fafc}",
      ".html2apk-console-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.html2apk-console-tabs,.html2apk-console-actions{display:flex;gap:8px;flex-wrap:wrap}.html2apk-console-actions{justify-content:flex-start}",
      ".html2apk-console-header button{border:1px solid rgba(148,163,184,.28);background:#1e293b;color:#e2e8f0;border-radius:9px;padding:8px 10px;font:800 12px system-ui,Segoe UI,Arial}",
      ".html2apk-console-header button.active{background:#126fff;border-color:#60a5fa;color:#fff}.html2apk-console-header button:hover{border-color:#93c5fd}.html2apk-console-header button:disabled{opacity:.72}",
      ".html2apk-console-body{height:min(58vh,560px);background:#050816;overflow:hidden}.html2apk-console-list{display:none;height:100%;box-sizing:border-box;overflow:auto;padding:10px 10px 30px;scroll-padding-bottom:30px;overscroll-behavior:contain}.html2apk-console-list:after{content:'';display:block;height:14px}.html2apk-console-list.active{display:block}",
      ".html2apk-console-entry{border:1px solid rgba(148,163,184,.16);border-left:4px solid #64748b;border-radius:11px;padding:9px 10px;margin-bottom:8px;background:#0f172a}",
      ".html2apk-console-entry.error{border-left-color:#ef4444;background:#1b1117}.html2apk-console-entry.warn{border-left-color:#f59e0b;background:#1a1610}.html2apk-console-entry.call,.html2apk-console-entry.network{border-left-color:#60a5fa}.html2apk-console-entry.ok{border-left-color:#22c55e;background:#0f1a15}.html2apk-console-entry.info{border-left-color:#94a3b8}",
      ".html2apk-console-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#94a3b8;font-size:11px;font-weight:900;margin-bottom:6px}.html2apk-console-kind{color:#e2e8f0}.html2apk-console-entry pre{white-space:pre-wrap;word-break:break-word;margin:0;color:#dbeafe;font:12px ui-monospace,SFMono-Regular,Consolas,monospace;line-height:1.48}",
      "@media (min-width:760px){.html2apk-console-header{grid-template-columns:minmax(170px,.8fr) minmax(220px,1fr) minmax(300px,1.2fr);align-items:center}.html2apk-console-controls{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}.html2apk-console-actions{justify-content:flex-end}.html2apk-console-summary{grid-template-columns:repeat(3,minmax(80px,1fr))}}"
    ].join("");
    document.head.appendChild(style);

    button = document.createElement("button");
    button.type = "button";
    button.className = "html2apk-console-button";
    button.setAttribute("aria-label", "Console");
    icon = document.createElement("img");
    icon.alt = "";
    icon.src = scriptAssetUrl("html2apk-console.png");
    icon.addEventListener("error", function () {
      button.classList.add("fallback");
      icon.remove();
    });
    badge = document.createElement("span");
    badge.className = "html2apk-console-badge";
    button.appendChild(icon);
    button.appendChild(badge);
    button.addEventListener("click", function () {
      if (dragMoved) {
        setTimeout(function () {
          dragMoved = false;
        }, 0);
        return;
      }
      openConsole();
    });
    makeButtonDraggable(button);
    restoreButtonPosition(button);

    modal = document.createElement("section");
    modal.className = "html2apk-console-modal";
    modal.setAttribute("aria-label", "Console");

    panel = document.createElement("div");
    panel.className = "html2apk-console-panel";

    header = document.createElement("div");
    header.className = "html2apk-console-header";
    title = document.createElement("div");
    title.className = "html2apk-console-title";
    title.innerHTML = "<div><strong>Console html2apk</strong><span class=\"html2apk-console-subtitle\">Logs, erros, rede e chamadas nativas</span></div>";

    summary = document.createElement("div");
    summary.className = "html2apk-console-summary";
    consoleStat = document.createElement("div");
    consoleStat.className = "html2apk-console-stat";
    consoleStat.innerHTML = "<span>Console</span>";
    consoleCount = document.createElement("strong");
    consoleCount.textContent = "0";
    consoleStat.appendChild(consoleCount);
    networkStat = document.createElement("div");
    networkStat.className = "html2apk-console-stat";
    networkStat.innerHTML = "<span>Rede</span>";
    networkCount = document.createElement("strong");
    networkCount.textContent = "0";
    networkStat.appendChild(networkCount);
    errorStat = document.createElement("div");
    errorStat.className = "html2apk-console-stat";
    errorStat.innerHTML = "<span>Erros</span>";
    errorCount = document.createElement("strong");
    errorCount.textContent = "0";
    errorStat.appendChild(errorCount);
    summary.appendChild(consoleStat);
    summary.appendChild(networkStat);
    summary.appendChild(errorStat);

    controls = document.createElement("div");
    controls.className = "html2apk-console-controls";

    tabs = document.createElement("div");
    tabs.className = "html2apk-console-tabs";
    controls.appendChild(tabs);

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Fechar";
    title.appendChild(closeButton);

    header.appendChild(title);
    header.appendChild(summary);
    header.appendChild(controls);
    consoleTab = document.createElement("button");
    consoleTab.type = "button";
    consoleTab.textContent = "Console";
    consoleTab.dataset.html2apkConsoleTab = "console";
    consoleTab.addEventListener("click", function () {
      setActiveTab("console");
    });
    networkTab = document.createElement("button");
    networkTab.type = "button";
    networkTab.textContent = "Rede";
    networkTab.dataset.html2apkConsoleTab = "network";
    networkTab.addEventListener("click", function () {
      setActiveTab("network");
    });
    tabs.appendChild(consoleTab);
    tabs.appendChild(networkTab);

    actions = document.createElement("div");
    actions.className = "html2apk-console-actions";
    copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copiar console";
    copyButton.addEventListener("click", copyConsole);
    copyAllButton = copyButton;
    copyErrorsButton = document.createElement("button");
    copyErrorsButton.type = "button";
    copyErrorsButton.textContent = "Copiar apenas erros";
    copyErrorsButton.addEventListener("click", copyErrors);
    copyOnlyErrorsButton = copyErrorsButton;
    clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Limpar";
    clearButton.addEventListener("click", clearActiveTab);
    closeButton.addEventListener("click", closeConsole);
    actions.appendChild(copyButton);
    actions.appendChild(copyErrorsButton);
    actions.appendChild(clearButton);
    controls.appendChild(actions);

    body = document.createElement("div");
    body.className = "html2apk-console-body";
    consoleList = document.createElement("div");
    consoleList.className = "html2apk-console-list";
    networkList = document.createElement("div");
    networkList.className = "html2apk-console-list";
    body.appendChild(consoleList);
    body.appendChild(networkList);

    panel.appendChild(header);
    panel.appendChild(body);
    modal.appendChild(panel);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeConsole();
      }
    });
    makePanelDraggable(header, panel);

    document.body.appendChild(button);
    document.body.appendChild(modal);
    redrawLists();
    setActiveTab(activeTab);
    updateBadge();
  }

  function openConsole(tab) {
    opened = true;
    createUi();
    if (tab) {
      setActiveTab(tab);
    }
    if (modal) {
      modal.classList.add("open");
    }
  }

  function closeConsole() {
    opened = false;
    if (modal) {
      modal.classList.remove("open");
    }
  }

  function wrapFunction(name, fn) {
    var wrapped;
    if (typeof fn !== "function" || fn.__html2apkConsoleWrapped) {
      return fn;
    }

    wrapped = function () {
      var args = Array.prototype.slice.call(arguments);
      var result;
      add("call", name + "(" + args.map(short).join(", ") + ")");
      try {
        result = fn.apply(this, arguments);
      } catch (error) {
        add("error", name + " falhou", error);
        throw error;
      }

      if (result && typeof result.then === "function") {
        return result.then(function (value) {
          add("ok", name + " resolveu", value);
          return value;
        }, function (error) {
          add("error", name + " rejeitou", error);
          throw error;
        });
      }

      add("ok", name + " retornou", result);
      return result;
    };

    wrapped.__html2apkConsoleWrapped = true;
    wrapped.__html2apkConsoleOriginal = fn;
    return wrapped;
  }

  function wrapApi(api, prefix) {
    if (!api || typeof api !== "object") {
      return;
    }
    Object.keys(api).forEach(function (name) {
      if (name.indexOf("__") === 0 || typeof api[name] !== "function") {
        return;
      }
      api[name] = wrapFunction(prefix ? prefix + "." + name : name, api[name]);
    });
  }

  function wrapKnownFunctions() {
    wrapApi(window.Html2ApkEarlyBridge, "early");
    wrapApi(window.Html2ApkNative, "native");

    functionNames.forEach(function (name) {
      if (typeof window[name] === "function") {
        window[name] = wrapFunction(name, window[name]);
      }
    });
  }

  function installConsoleHooks() {
    ["log", "info", "debug", "warn", "error"].forEach(function (name) {
      if (typeof console[name] !== "function" || console[name].__html2apkConsoleWrapped) {
        return;
      }
      originalConsole[name] = console[name];
      console[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        add(name === "error" ? "error" : (name === "warn" ? "warn" : "info"), "console." + name, args);
        return originalConsole[name].apply(console, arguments);
      };
      console[name].__html2apkConsoleWrapped = true;
    });

    window.addEventListener("error", function (event) {
      var target = event.target || {};
      if (target !== window && (target.src || target.href)) {
        addNetwork({
          type: "resource",
          method: "GET",
          url: target.src || target.href,
          ok: false,
          status: "ERR",
          statusText: "Resource failed",
          durationMs: 0,
          error: target.outerHTML ? short(target.outerHTML, 500) : "Resource failed"
        });
        return;
      }

      add("error", event.message || "Erro JavaScript", {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error ? stringify(event.error) : ""
      });
    }, true);

    window.addEventListener("unhandledrejection", function (event) {
      add("error", "Promise rejeitada sem tratamento", event.reason);
    });
  }

  function responseHeaders(headers) {
    var output = {};
    try {
      headers.forEach(function (value, key) {
        output[key] = value;
      });
    } catch (error) {
    }
    return output;
  }

  function requestUrl(input) {
    if (typeof input === "string") {
      return input;
    }
    if (input && input.url) {
      return input.url;
    }
    return String(input || "");
  }

  function requestMethod(input, init) {
    return String((init && init.method) || (input && input.method) || "GET").toUpperCase();
  }

  function installFetchHook() {
    var originalFetch = window.fetch;
    if (typeof originalFetch !== "function" || originalFetch.__html2apkNetworkWrapped) {
      return;
    }

    window.fetch = function (input, init) {
      var startedAt = Date.now();
      var method = requestMethod(input, init || {});
      var url = requestUrl(input);
      var requestBody = init && typeof init.body === "string" ? short(init.body, MAX_DETAIL) : undefined;

      return originalFetch.apply(this, arguments).then(function (response) {
        var entry = {
          type: "fetch",
          method: method,
          url: url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          durationMs: Date.now() - startedAt,
          requestBody: requestBody,
          headers: responseHeaders(response.headers)
        };

        try {
          response.clone().text().then(function (body) {
            entry.responseBody = short(body, MAX_DETAIL);
            addNetwork(entry);
          }, function () {
            addNetwork(entry);
          });
        } catch (error) {
          addNetwork(entry);
        }

        return response;
      }, function (error) {
        addNetwork({
          type: "fetch",
          method: method,
          url: url,
          ok: false,
          status: "ERR",
          statusText: "Fetch failed",
          durationMs: Date.now() - startedAt,
          requestBody: requestBody,
          error: stringify(error)
        });
        throw error;
      });
    };

    window.fetch.__html2apkNetworkWrapped = true;
  }

  function installXhrHook() {
    var proto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
    var originalOpen;
    var originalSend;
    if (!proto || proto.__html2apkNetworkWrapped) {
      return;
    }

    originalOpen = proto.open;
    originalSend = proto.send;

    proto.open = function (method, url) {
      this.__html2apkNetwork = {
        type: "xhr",
        method: String(method || "GET").toUpperCase(),
        url: String(url || "")
      };
      return originalOpen.apply(this, arguments);
    };

    proto.send = function (body) {
      var xhr = this;
      var meta = xhr.__html2apkNetwork || { type: "xhr", method: "GET", url: "" };
      var startedAt = Date.now();
      var requestBody = typeof body === "string" ? short(body, MAX_DETAIL) : undefined;
      var finished = false;

      function finish(kind) {
        var responseBody;
        if (finished) {
          return;
        }
        finished = true;
        try {
          responseBody = typeof xhr.responseText === "string" ? short(xhr.responseText, MAX_DETAIL) : undefined;
        } catch (error) {
          responseBody = undefined;
        }
        addNetwork({
          type: "xhr",
          method: meta.method,
          url: meta.url,
          ok: kind === "loadend" && xhr.status >= 200 && xhr.status < 400,
          status: kind === "loadend" ? xhr.status : "ERR",
          statusText: xhr.statusText || kind,
          durationMs: Date.now() - startedAt,
          requestBody: requestBody,
          responseBody: responseBody
        });
      }

      xhr.addEventListener("loadend", function () {
        finish("loadend");
      }, { once: true });
      xhr.addEventListener("error", function () {
        finish("error");
      }, { once: true });
      xhr.addEventListener("timeout", function () {
        finish("timeout");
      }, { once: true });
      xhr.addEventListener("abort", function () {
        finish("abort");
      }, { once: true });

      return originalSend.apply(this, arguments);
    };

    proto.__html2apkNetworkWrapped = true;
  }

  function installNetworkHooks() {
    installFetchHook();
    installXhrHook();
  }

  window.Html2ApkRuntimeConsole = {
    open: openConsole,
    close: closeConsole,
    clear: clearActiveTab,
    copy: copyConsole,
    copyErrors: copyErrors,
    text: function (onlyErrors) {
      return runtimeConsoleText(!!onlyErrors);
    },
    errorText: function () {
      return runtimeConsoleText(true);
    },
    log: add,
    network: addNetwork,
    entries: function () {
      return entries.slice();
    },
    networkEntries: function () {
      return networkEntries.slice();
    },
    wrap: wrapKnownFunctions
  };

  installConsoleHooks();
  installNetworkHooks();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createUi);
  } else {
    createUi();
  }

  wrapKnownFunctions();
  document.addEventListener("deviceready", wrapKnownFunctions, false);
  window.addEventListener("html2apk:event", wrapKnownFunctions);

  scanTimer = setInterval(function () {
    scanCount += 1;
    wrapKnownFunctions();
    if (scanCount >= 80) {
      clearInterval(scanTimer);
      if (!slowScanTimer) {
        slowScanTimer = setInterval(wrapKnownFunctions, 2000);
      }
    }
  }, 250);

  add("info", "Console runtime do html2apk ativo.");
})();
