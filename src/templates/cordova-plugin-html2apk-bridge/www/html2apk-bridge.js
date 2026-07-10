"use strict";

var exec = require("cordova/exec");
var channel = require("cordova/channel");

var notificationListeners = [];
var eventListeners = {};
var initialNotification = null;
var initialLink = null;
var initialShare = null;
var bluetoothServerStartPromise = null;
var wifiServerStartPromise = null;
var scheduledNotificationCounter = 0;
var notificationActionCounter = 0;
var notificationActionCallbacks = {};
var deviceReady = typeof document === "undefined";
var deviceReadyCallbacks = [];
var eventAliases = {
  "app:ready": "app:pronto",
  "app:paused": "app:pausado",
  "app:closed": "app:fechado",
  "app:resumed": "app:voltou",
  "back:button": "botao:voltar",
  "link:opened": "link:aberto",
  "network:changed": "rede:mudou",
  "battery:changed": "bateria:mudou",
  "location:changed": "localizacao:mudou",
  "biometric:failed": "biometria:falhou",
  "share:received": "compartilhamento:recebido",
  "sharing:received": "compartilhamento:recebido",
  "bt:connected": "bluetooth:conectado",
  "bluetooth:connected": "bluetooth:conectado",
  "bt:data": "bluetooth:dados",
  "bluetooth:data": "bluetooth:dados",
  "bt:disconnected": "bluetooth:desconectado",
  "bluetooth:disconnected": "bluetooth:desconectado",
  "bt:error": "bluetooth:erro",
  "bluetooth:error": "bluetooth:erro",
  "wifi:connected": "wifi:conectado",
  "wifi:data": "wifi:dados",
  "wifi:disconnected": "wifi:desconectado",
  "wifi:error": "wifi:erro",
  "usb:connected": "usb:conectado",
  "usb:disconnected": "usb:desconectado",
  "headphone:connected": "fone:conectado",
  "headphone:disconnected": "fone:desconectado",
  "volume:changed": "volume:mudou",
  "keyboard:opened": "teclado:abriu",
  "keyboard:closed": "teclado:fechou",
  "phone:shaken": "celular:sacudido",
  "phone:faceDown": "celular:tela_para_baixo",
  "proximity:near": "proximidade:perto",
  "screenshot:taken": "print:tela",
  "orientation:changed": "orientacao:mudou",
  "nfc:received": "nfc:recebido",
  "notification:received": "notificacao:recebida",
  "notification:clicked": "notificacao:clicada"
};

function markDeviceReady() {
  if (deviceReady) {
    return;
  }

  deviceReady = true;
  deviceReadyCallbacks.splice(0).forEach(function (callback) {
    callback();
  });
}

function whenDeviceReady() {
  if (deviceReady) {
    return Promise.resolve();
  }

  return new Promise(function (resolve) {
    deviceReadyCallbacks.push(resolve);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("deviceready", markDeviceReady, false);
}

var nativeWindowCount = 0;

if (typeof document !== "undefined" && document.dispatchEvent) {
  var originalDispatchEvent = document.dispatchEvent;
  document.dispatchEvent = function (event) {
    if (nativeWindowCount > 0 && event && typeof event.type === "string") {
      var t = event.type;
      if (t === "app:voltou" || t === "app:resumed" || t === "app:pausado" || t === "app:paused" || t === "app:background") {
        return false;
      }
    }
    return originalDispatchEvent.apply(this, arguments);
  };
}

var NATIVE_UI_ACTIONS = {
  "capturePhoto": true,
  "captureVideo": true,
  "requestCameraPermission": true,
  "requestMicrophonePermission": true,
  "shareText": true,
  "share": true,
  "shareCurrentApp": true,
  "scanBluetooth": true,
  "scanWifi": true,
  "recognizeSpeech": true,
  "openUrl": true,
  "dial": true,
  "openMap": true,
  "openWhatsapp": true,
  "pickFile": true,
  "pickFolder": true,
  "saveFile": true,
  "saveStoredFile": true,
  "openFile": true,
  "requestDeviceLock": true,
  "authenticateBiometric": true,
  "requestInstallPermission": true,
  "installUpdate": true,
  "requestBackgroundExecution": true,
  "setupAutoStartOnBoot": true,
  "setupFloatingIcon": true
};

function call(action, args) {
  var isNativeUI = NATIVE_UI_ACTIONS[action] === true;
  if (isNativeUI) {
    nativeWindowCount++;
  }

  var promise = whenCordovaBridgeReady().then(function () {
    return new Promise(function (resolve, reject) {
      try {
        exec(resolve, reject, "Html2ApkBridge", action, args || []);
      } catch (error) {
        reject(error);
      }
    });
  });

  if (isNativeUI) {
    var release = function () {
      setTimeout(function () {
        nativeWindowCount = Math.max(0, nativeWindowCount - 1);
      }, 500);
    };
    promise = promise.then(function (res) {
      release();
      return res;
    }, function (err) {
      release();
      throw err;
    });
  }

  return promise;
}

function whenCordovaBridgeReady() {
  var timer;

  if (!channel || !channel.onCordovaReady || channel.onCordovaReady.state === 2) {
    return Promise.resolve();
  }

  return new Promise(function (resolve, reject) {
    timer = setTimeout(function () {
      reject(new Error("html2apk native bridge is not ready. Make sure cordova.js finished loading."));
    }, 10000);

    channel.onCordovaReady.subscribe(function () {
      clearTimeout(timer);
      resolve();
    });
  });
}

function asyncThrow(error) {
  setTimeout(function () {
    throw error;
  }, 0);
}

function cloneSerializable(value) {
  var output;

  if (typeof value === "function" || typeof value === "undefined") {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    output = [];
    value.forEach(function (item) {
      var cloned = cloneSerializable(item);
      if (typeof cloned !== "undefined") {
        output.push(cloned);
      }
    });
    return output;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  output = {};
  Object.keys(value).forEach(function (key) {
    var cloned = cloneSerializable(value[key]);
    if (typeof cloned !== "undefined") {
      output[key] = cloned;
    }
  });
  return output;
}

function registerNotificationAction(handler, source) {
  var id = "html2apk-click-" + Date.now() + "-" + (++notificationActionCounter);
  notificationActionCallbacks[id] = function (detail) {
    return handler(detail, source || {});
  };
  return id;
}

function normalizeNotificationClick(click) {
  var normalized;
  var callbackId;
  var actionHandler;
  var functionName;

  if (typeof click === "function") {
    callbackId = registerNotificationAction(click);
    return {
      action: "run-function",
      acao: "executar-funcao",
      callbackId: callbackId
    };
  }

  if (!click || typeof click !== "object") {
    return {
      action: "open-app",
      acao: "abrir-app"
    };
  }

  normalized = cloneSerializable(click) || {};
  actionHandler = click.acao || click.action;
  if (typeof actionHandler === "function") {
    callbackId = registerNotificationAction(actionHandler, click);
    normalized.callbackId = callbackId;
    normalized.action = normalized.action || "run-function";
    normalized.acao = normalized.acao || "executar-funcao";
  }

  functionName = normalized.funcao || normalized.functionName || normalized.function || normalized.fn || normalized.nomeFuncao;
  if (typeof functionName === "string" && functionName.trim()) {
    normalized.funcao = functionName.trim();
    normalized.functionName = normalized.funcao;
    normalized.action = normalized.action || "run-function";
    normalized.acao = normalized.acao || "executar-funcao";
  }

  if (normalized.action && !normalized.acao) {
    normalized.acao = normalized.action;
  }
  if (normalized.acao && !normalized.action) {
    normalized.action = normalized.acao;
  }

  return normalized;
}

function notificationOpenValue(source) {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(source, "open")) {
    return source.open !== false;
  }
  if (Object.prototype.hasOwnProperty.call(source, "abrir")) {
    return source.abrir !== false;
  }
  if (Object.prototype.hasOwnProperty.call(source, "abrirApp")) {
    return source.abrirApp !== false;
  }
  if (Object.prototype.hasOwnProperty.call(source, "openApp")) {
    return source.openApp !== false;
  }
  return undefined;
}

function normalizeNotificationActions(actions) {
  if (!Array.isArray(actions)) {
    return actions;
  }

  return actions.map(function (action) {
    var normalized = cloneSerializable(action) || {};
    var click = action && (action.aoClicar || action.onClick);
    if (!click && action && (
      typeof action.funcao === "string" ||
      typeof action.functionName === "string" ||
      typeof action.fn === "string"
    )) {
      click = action;
    }
    if (click) {
      normalized.aoClicar = normalizeNotificationClick(click);
      normalized.onClick = normalized.aoClicar;
    }
    if (typeof notificationOpenValue(action) !== "undefined") {
      normalized.open = notificationOpenValue(action);
      if (normalized.aoClicar && typeof normalized.aoClicar.open === "undefined") {
        normalized.aoClicar.open = normalized.open;
        normalized.onClick = normalized.aoClicar;
      }
    }
    return normalized;
  });
}

function normalizeNotificationOptions(messageOrOptions) {
  var options;
  var click;
  var actions;

  if (typeof messageOrOptions === "string") {
    return {
      title: "Notificacao",
      text: messageOrOptions,
      onClick: {
        action: "open-app"
      }
    };
  }

  options = cloneSerializable(messageOrOptions || {}) || {};
  click = messageOrOptions && (messageOrOptions.aoClicar || messageOrOptions.onClick);
  options.onClick = normalizeNotificationClick(click);
  options.aoClicar = options.onClick;
  if (typeof notificationOpenValue(messageOrOptions) !== "undefined") {
    options.open = notificationOpenValue(messageOrOptions);
    options.abrir = options.open;
    options.onClick.open = options.open;
    options.aoClicar.open = options.open;
  }

  actions = normalizeNotificationActions(messageOrOptions && (messageOrOptions.acoes || messageOrOptions.actions));
  if (Array.isArray(actions)) {
    options.acoes = actions;
    options.actions = actions;
  }

  return options;
}

function normalizeScheduledNotificationOptions(options) {
  var normalized = normalizeNotificationOptions(options || {});
  if (!normalized.id) {
    scheduledNotificationCounter = (scheduledNotificationCounter + 1) % 100000;
    normalized.id = Math.floor(Date.now() % 0x0fffffff) + scheduledNotificationCounter;
  }
  return normalized;
}

function parseIntervalMs(value) {
  var text;
  var match;
  var amount;
  var unit;

  if (typeof value === "number" && isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (value && typeof value === "object") {
    return parseIntervalMs(value.intervalo || value.interval || value.aCada || value.every || value.ms);
  }

  text = String(value || "").trim().toLowerCase();
  match = text.match(/^(\d+(?:\.\d+)?)\s*(ms|s|seg|m|min|h|hr|d|dia|dias)?$/);
  if (!match) {
    return 0;
  }

  amount = Number(match[1]);
  unit = match[2] || "ms";
  if (unit === "s" || unit === "seg") {
    return Math.round(amount * 1000);
  }
  if (unit === "m" || unit === "min") {
    return Math.round(amount * 60 * 1000);
  }
  if (unit === "h" || unit === "hr") {
    return Math.round(amount * 60 * 60 * 1000);
  }
  if (unit === "d" || unit === "dia" || unit === "dias") {
    return Math.round(amount * 24 * 60 * 60 * 1000);
  }
  return Math.round(amount);
}

function scheduleNotification(options) {
  return call("scheduleNotification", [normalizeScheduledNotificationOptions(options || {})]);
}

function scheduleNotifications(items) {
  var list = Array.isArray(items) ? items : [];
  return Promise.all(list.map(function (item) {
    return scheduleNotification(item);
  }));
}

function normalizeNotificationLoop(options) {
  var source = options || {};
  var notifications = source.notificacoes || source.notifications || source.items || [];
  var interval = parseIntervalMs(source.intervalo || source.interval || source.aCada || source.every || source.repeat || source.repetir);
  var normalized;

  if (!interval) {
    return Promise.reject(new Error("Notification loop interval is required."));
  }
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return Promise.reject(new Error("Notification loop requires at least one notification."));
  }

  normalized = normalizeScheduledNotificationOptions(Object.assign({}, source));
  normalized.intervalo = interval;
  normalized.interval = interval;
  normalized.repeat = true;
  normalized.repetir = true;
  normalized.notificacoes = notifications.map(function (item) {
    return normalizeNotificationOptions(Object.assign({}, item || {}));
  });
  normalized.notifications = normalized.notificacoes;
  normalized.loopIndex = Number(source.loopIndex || source.indiceLoop || 0) || 0;
  normalized.indiceLoop = normalized.loopIndex;
  normalized.quando = normalized.quando || normalized.when || (Date.now() + interval);
  normalized.when = normalized.when || normalized.quando;
  return normalized;
}

function scheduleNotificationLoop(options) {
  var normalized = normalizeNotificationLoop(options);
  if (normalized && typeof normalized.then === "function") {
    return normalized;
  }

  return scheduleNotification(normalized);
}

function notificationId(input) {
  if (input && typeof input === "object") {
    return input.id || input.notificationId || input.notificacaoId;
  }
  return input;
}

function normalizeEventType(type) {
  var eventType = String(type || "");
  return eventAliases[eventType] || eventType;
}

function emitNotificationClick(detail) {
  var notification = detail || null;
  initialNotification = detail || null;

  notificationListeners.slice().forEach(function (listener) {
    try {
      listener(notification);
    } catch (error) {
      asyncThrow(error);
    }
  });

  executeNotificationClickAction(notification);
}

function notificationActionFromDetail(detail) {
  var action;

  if (!detail || typeof detail !== "object") {
    return null;
  }

  action = detail.action || detail.acao;
  if (action && typeof action === "object") {
    if (action.callbackId || action.functionName || action.funcao || action.fn || action.nomeFuncao) {
      return action;
    }
    if (action.aoClicar || action.onClick) {
      return action.aoClicar || action.onClick;
    }
  }

  return detail.aoClicar || detail.onClick || null;
}

function notificationActionArgs(action, detail) {
  var args = action && (
    action.argumentos ||
    action.args ||
    action.parametros ||
    action.params ||
    action.parameters
  );

  if (typeof args === "undefined") {
    return action && (action.passarEvento === false || action.passEvent === false) ? [] : [detail];
  }

  return Array.isArray(args) ? args : [args];
}

function handleActionResult(result) {
  if (result && typeof result.then === "function") {
    result.catch(asyncThrow);
  }
}

function executeNotificationClickAction(detail) {
  var action = notificationActionFromDetail(detail);
  var callbackId = action && (action.callbackId || action.idCallback || action.callback);
  var functionName;
  var handler;
  var args;

  if (!action || typeof action !== "object") {
    return;
  }
  if (detail && detail.__html2apkActionHandled) {
    return;
  }

  if (callbackId && notificationActionCallbacks[callbackId]) {
    detail.__html2apkActionHandled = true;
    handleActionResult(notificationActionCallbacks[callbackId](detail));
    return;
  }

  functionName = action.funcao || action.functionName || action.function || action.fn || action.nomeFuncao;
  if (!functionName) {
    return;
  }

  handler = api && api[functionName];
  if (typeof handler !== "function" && typeof window !== "undefined") {
    handler = window[functionName];
  }
  if (typeof handler !== "function") {
    return;
  }

  args = notificationActionArgs(action, detail);
  detail.__html2apkActionHandled = true;
  handleActionResult(handler.apply(typeof window === "undefined" ? null : window, args));
}

function emitEvent(type, detail) {
  var eventType = normalizeEventType(type || (detail && detail.type));
  if (!eventType) {
    return;
  }

  if (nativeWindowCount > 0) {
    if (eventType === "app:voltou" || eventType === "app:resumed" || eventType === "app:pausado" || eventType === "app:paused" || eventType === "app:background") {
      return;
    }
  }

  var payload = detail || {};
  payload.type = payload.type || eventType;
  payload.tipo = payload.tipo || eventType;
  payload.timestamp = payload.timestamp || Date.now();

  (eventListeners[eventType] || []).slice().forEach(function (listener) {
    try {
      listener(payload);
    } catch (error) {
      setTimeout(function () {
        throw error;
      }, 0);
    }
  });
}

function onEvent(type, listener) {
  if (typeof listener !== "function") {
    throw new TypeError("listener must be a function");
  }

  var eventType = normalizeEventType(type);
  eventListeners[eventType] = eventListeners[eventType] || [];
  eventListeners[eventType].push(listener);

  return function unsubscribe() {
    eventListeners[eventType] = (eventListeners[eventType] || []).filter(function (item) {
      return item !== listener;
    });
  };
}

function firstOrNull(result) {
  return Array.isArray(result) && result.length ? result[0] : null;
}

function openInAppUrl(url, options) {
  var target = String(url || "").trim();
  if (!target) {
    return Promise.reject(new Error("URL is required."));
  }
  if (typeof window === "undefined" || !window.location) {
    return Promise.reject(new Error("window.location is unavailable."));
  }

  return new Promise(function (resolve) {
    var replace = Boolean(options && (options.replace || options.substituir));
    resolve({
      url: target,
      target: "app",
      alvo: "app",
      opened: true,
      aberto: true,
      replace: replace,
      substituir: replace
    });

    setTimeout(function () {
      if (replace) {
        window.location.replace(target);
        return;
      }

      window.location.assign(target);
    }, 0);
  });
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function storedFileOptions(nameOrOptions, value, options) {
  var normalized;
  if (nameOrOptions && typeof nameOrOptions === "object" && !Array.isArray(nameOrOptions)) {
    return cloneSerializable(nameOrOptions) || {};
  }

  normalized = cloneSerializable(options || {}) || {};
  normalized.name = String(nameOrOptions || "");
  normalized.nome = normalized.name;
  normalized.value = cloneSerializable(value);
  normalized.valor = normalized.value;
  if (typeof value !== "string" && !hasOwn(normalized, "json")) {
    normalized.json = true;
  }
  return normalized;
}

function storedFileNameOptions(nameOrOptions, options) {
  var normalized;
  if (nameOrOptions && typeof nameOrOptions === "object" && !Array.isArray(nameOrOptions)) {
    return cloneSerializable(nameOrOptions) || {};
  }
  normalized = cloneSerializable(options || {}) || {};
  normalized.name = String(nameOrOptions || "");
  normalized.nome = normalized.name;
  return normalized;
}

function applyDownloadName(normalized, nameOrOptions) {
  if (typeof nameOrOptions === "string") {
    normalized.name = nameOrOptions;
    normalized.nome = nameOrOptions;
    normalized.fileName = nameOrOptions;
    normalized.nomeArquivo = nameOrOptions;
  } else if (nameOrOptions && typeof nameOrOptions === "object" && !Array.isArray(nameOrOptions)) {
    Object.assign(normalized, cloneSerializable(nameOrOptions) || {});
  }
  return normalized;
}

function applyBase64DownloadSource(normalized, value) {
  var source = String(value || "");
  var comma;
  var header;
  var mimeType;

  if (source.indexOf("data:") === 0) {
    comma = source.indexOf(",");
    header = comma >= 0 ? source.slice(5, comma) : "";
    mimeType = header.split(";")[0];
    normalized.base64 = comma >= 0 ? source.slice(comma + 1) : source;
    if (mimeType) {
      normalized.mimeType = normalized.mimeType || mimeType;
      normalized.tipoMime = normalized.tipoMime || mimeType;
    }
    return normalized;
  }

  normalized.base64 = source;
  return normalized;
}

function downloadFileOptions(urlOrOptions, nameOrOptions, options) {
  var normalized;
  var source;

  if (urlOrOptions && typeof urlOrOptions === "object" && !Array.isArray(urlOrOptions)) {
    normalized = cloneSerializable(urlOrOptions) || {};
    applyDownloadName(normalized, nameOrOptions);
    if (options && typeof options === "object" && !Array.isArray(options)) {
      Object.assign(normalized, cloneSerializable(options) || {});
    }
    return normalized;
  }

  normalized = cloneSerializable(options || {}) || {};
  source = String(urlOrOptions || "").trim();
  if (source.indexOf("data:") === 0) {
    applyBase64DownloadSource(normalized, source);
  } else {
    normalized.url = source;
  }
  return applyDownloadName(normalized, nameOrOptions);
}

function downloadBase64Options(nameOrOptions, base64, options) {
  var normalized;
  if (nameOrOptions && typeof nameOrOptions === "object" && !Array.isArray(nameOrOptions)) {
    normalized = cloneSerializable(nameOrOptions) || {};
    if (typeof base64 === "string") {
      applyBase64DownloadSource(normalized, base64);
    } else if (base64 && typeof base64 === "object" && !Array.isArray(base64)) {
      Object.assign(normalized, cloneSerializable(base64) || {});
    }
    return normalized;
  }

  normalized = cloneSerializable(options || {}) || {};
  applyDownloadName(normalized, String(nameOrOptions || ""));
  return applyBase64DownloadSource(normalized, base64);
}

function downloadLocalFileOptions(fileOrOptions, nameOrOptions, options) {
  var normalized;
  var source;

  if (fileOrOptions && typeof fileOrOptions === "object" && !Array.isArray(fileOrOptions)) {
    normalized = cloneSerializable(fileOrOptions) || {};
    applyDownloadName(normalized, nameOrOptions);
    if (options && typeof options === "object" && !Array.isArray(options)) {
      Object.assign(normalized, cloneSerializable(options) || {});
    }
    return normalized;
  }

  normalized = cloneSerializable(options || {}) || {};
  source = String(fileOrOptions || "").trim();
  if (/^(content|file):\/\//.test(source)) {
    normalized.uri = source;
    normalized.contentUri = source;
  } else if (/^[A-Za-z]:[\\/]/.test(source) || source.charAt(0) === "/" || source.charAt(0) === "\\") {
    normalized.path = source;
    normalized.caminho = source;
  } else {
    normalized.sourceName = source;
    normalized.arquivoOrigem = source;
  }
  return applyDownloadName(normalized, nameOrOptions);
}

function ocrOptions(sourceOrOptions) {
  if (sourceOrOptions && typeof sourceOrOptions === "object" && !Array.isArray(sourceOrOptions)) {
    return cloneSerializable(sourceOrOptions) || {};
  }
  var source = String(sourceOrOptions || "").trim();
  if (source.indexOf("data:") === 0) {
    return { base64: source };
  }
  if (/^(content|file):\/\//.test(source)) {
    return { uri: source, contentUri: source };
  }
  if (/^[A-Za-z]:[\\/]/.test(source) || source.charAt(0) === "/" || source.charAt(0) === "\\") {
    return { path: source, caminho: source };
  }
  return { name: source, nome: source };
}

function normalizeReceivedShare(detail) {
  var normalized = cloneSerializable(detail || {}) || {};
  var kind = normalized.tipoConteudo || normalized.contentType || normalized.tipo || normalized.type;
  if (kind) {
    normalized.tipo = kind;
    normalized.type = kind;
  }
  return normalized;
}

function bluetoothReceivedData(detail) {
  if (!detail || typeof detail !== "object") {
    return detail;
  }
  if (Object.prototype.hasOwnProperty.call(detail, "dados")) {
    return detail.dados;
  }
  if (Object.prototype.hasOwnProperty.call(detail, "data")) {
    return detail.data;
  }
  return detail;
}

function bluetoothErrorDetail(errorOrDetail) {
  var detail = errorOrDetail && typeof errorOrDetail === "object"
    ? cloneSerializable(errorOrDetail) || {}
    : {};
  var message = detail.message || detail.mensagem || detail.error || detail.erro ||
    (errorOrDetail && (errorOrDetail.message || errorOrDetail.mensagem || errorOrDetail.error || errorOrDetail.erro)) ||
    String(errorOrDetail || "");
  detail.ok = false;
  detail.message = message;
  detail.mensagem = message;
  detail.error = message;
  detail.erro = message;
  detail.timestamp = detail.timestamp || Date.now();
  return detail;
}

function startBluetoothServerSilently() {
  if (bluetoothServerStartPromise) {
    return bluetoothServerStartPromise;
  }

  bluetoothServerStartPromise = call("startBluetoothServer").catch(function (error) {
    bluetoothServerStartPromise = null;
    emitEvent("bluetooth:erro", bluetoothErrorDetail(error));
  });
  return bluetoothServerStartPromise;
}

function wifiReceivedData(detail) {
  if (!detail || typeof detail !== "object") {
    return detail;
  }
  if (Object.prototype.hasOwnProperty.call(detail, "dados")) {
    return detail.dados;
  }
  if (Object.prototype.hasOwnProperty.call(detail, "data")) {
    return detail.data;
  }
  return detail;
}

function wifiErrorDetail(errorOrDetail) {
  var detail = errorOrDetail && typeof errorOrDetail === "object"
    ? cloneSerializable(errorOrDetail) || {}
    : {};
  var message = detail.message || detail.mensagem || detail.error || detail.erro ||
    (errorOrDetail && (errorOrDetail.message || errorOrDetail.mensagem || errorOrDetail.error || errorOrDetail.erro)) ||
    String(errorOrDetail || "");
  detail.ok = false;
  detail.message = message;
  detail.mensagem = message;
  detail.error = message;
  detail.erro = message;
  detail.timestamp = detail.timestamp || Date.now();
  return detail;
}

function startWifiServerSilently() {
  if (wifiServerStartPromise) {
    return wifiServerStartPromise;
  }

  wifiServerStartPromise = call("startWifiServer").catch(function (error) {
    wifiServerStartPromise = null;
    emitEvent("wifi:erro", wifiErrorDetail(error));
  });
  return wifiServerStartPromise;
}

function wallpaperOptions(sourceOrOptions, options) {
  var normalized;
  var source;
  var comma;
  var header;
  var mimeType;

  if (sourceOrOptions && typeof sourceOrOptions === "object" && !Array.isArray(sourceOrOptions)) {
    normalized = cloneSerializable(sourceOrOptions) || {};
  } else {
    normalized = cloneSerializable(options || {}) || {};
    source = String(sourceOrOptions || "").trim();
    if (source.indexOf("data:") === 0) {
      comma = source.indexOf(",");
      header = comma >= 0 ? source.slice(5, comma) : "";
      mimeType = header.split(";")[0];
      normalized.base64 = comma >= 0 ? source.slice(comma + 1) : source;
      if (mimeType) {
        normalized.mimeType = normalized.mimeType || mimeType;
        normalized.tipoMime = normalized.tipoMime || mimeType;
      }
    } else if (/^(content|file):\/\//.test(source)) {
      normalized.uri = source;
      normalized.contentUri = source;
    } else if (/^[A-Za-z]:[\\/]/.test(source) || source.charAt(0) === "/" || source.charAt(0) === "\\") {
      normalized.path = source;
      normalized.caminho = source;
    } else {
      normalized.name = source;
      normalized.nome = source;
      normalized.fileName = source;
      normalized.nomeArquivo = source;
    }
  }

  if (normalized.alvo && !normalized.target) {
    normalized.target = normalized.alvo;
  }
  if (normalized.target && !normalized.alvo) {
    normalized.alvo = normalized.target;
  }
  return normalized;
}

function volumeOptions(streamOrOptions, value, options) {
  var normalized = {};
  if (streamOrOptions && typeof streamOrOptions === "object" && !Array.isArray(streamOrOptions)) {
    normalized = cloneSerializable(streamOrOptions) || {};
  } else {
    if (typeof streamOrOptions === "number") {
      normalized.value = streamOrOptions;
      normalized.valor = streamOrOptions;
    } else if (typeof streamOrOptions === "string") {
      normalized.stream = streamOrOptions;
      normalized.tipo = streamOrOptions;
    }
    if (typeof value !== "undefined" && value !== null && typeof value !== "object") {
      normalized.value = value;
      normalized.valor = value;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(normalized, cloneSerializable(value) || {});
    }
    if (options && typeof options === "object" && !Array.isArray(options)) {
      Object.assign(normalized, cloneSerializable(options) || {});
    }
  }
  return normalized;
}

function adjustVolumeOptions(streamOrOptions, amountOrOptions, options, direction) {
  var normalized = volumeOptions(streamOrOptions);
  if (typeof amountOrOptions === "number") {
    normalized.amount = amountOrOptions;
    normalized.quantidade = amountOrOptions;
  } else if (amountOrOptions && typeof amountOrOptions === "object" && !Array.isArray(amountOrOptions)) {
    Object.assign(normalized, cloneSerializable(amountOrOptions) || {});
  }
  if (options && typeof options === "object" && !Array.isArray(options)) {
    Object.assign(normalized, cloneSerializable(options) || {});
  }
  normalized.direction = direction;
  normalized.direcao = direction;
  return normalized;
}

function floatingIconOptions(optionsOrOpacity) {
  if (optionsOrOpacity && typeof optionsOrOpacity === "object" && !Array.isArray(optionsOrOpacity)) {
    return cloneSerializable(optionsOrOpacity) || {};
  }
  if (typeof optionsOrOpacity === "number" || typeof optionsOrOpacity === "string") {
    return {
      opacity: Number(optionsOrOpacity),
      opacidade: Number(optionsOrOpacity)
    };
  }
  return {};
}

function secureItemOptions(keyOrOptions, value, options) {
  var normalized;
  if (keyOrOptions && typeof keyOrOptions === "object" && !Array.isArray(keyOrOptions)) {
    return cloneSerializable(keyOrOptions) || {};
  }
  normalized = cloneSerializable(options || {}) || {};
  normalized.key = String(keyOrOptions || "");
  normalized.chave = normalized.key;
  normalized.value = cloneSerializable(value);
  normalized.valor = normalized.value;
  if (typeof value !== "string" && !hasOwn(normalized, "json")) {
    normalized.json = true;
  }
  return normalized;
}

function secureKeyOptions(keyOrOptions, options) {
  var normalized;
  if (keyOrOptions && typeof keyOrOptions === "object" && !Array.isArray(keyOrOptions)) {
    return cloneSerializable(keyOrOptions) || {};
  }
  normalized = cloneSerializable(options || {}) || {};
  normalized.key = String(keyOrOptions || "");
  normalized.chave = normalized.key;
  return normalized;
}

function unwrapStoredValue(result) {
  if (!result || result.exists === false || result.existe === false) {
    return null;
  }
  if (hasOwn(result, "value")) {
    return result.value;
  }
  if (hasOwn(result, "valor")) {
    return result.valor;
  }
  if (hasOwn(result, "base64")) {
    return result.base64;
  }
  if (hasOwn(result, "content")) {
    return result.content;
  }
  if (hasOwn(result, "conteudo")) {
    return result.conteudo;
  }
  return result;
}

function detectQRCodeFromPhoto(photo) {
  var source;
  var detector;

  if (!photo || !photo.base64) {
    return null;
  }
  if (typeof BarcodeDetector !== "function" || typeof createImageBitmap !== "function" || typeof fetch !== "function") {
    throw new Error("QR code scanning requires BarcodeDetector support in this Android WebView.");
  }

  detector = new BarcodeDetector({ formats: ["qr_code"] });
  source = "data:" + (photo.mimeType || "image/jpeg") + ";base64," + photo.base64;
  return fetch(source)
    .then(function (response) {
      return response.blob();
    })
    .then(function (blob) {
      return createImageBitmap(blob);
    })
    .then(function (image) {
      return detector.detect(image);
    })
    .then(function (codes) {
      var first = codes && codes[0];
      if (!first) {
        return null;
      }
      return {
        text: first.rawValue || "",
        texto: first.rawValue || "",
        rawValue: first.rawValue || "",
        valorBruto: first.rawValue || "",
        format: first.format || "qr_code",
        formato: first.format || "qr_code",
        codes: codes,
        codigos: codes,
        photo: photo,
        foto: photo
      };
    });
}

var api = {
  notificar: function (messageOrOptions) {
    return call("notify", [normalizeNotificationOptions(messageOrOptions)]);
  },
  agendarNotificacao: function (options) {
    if (Array.isArray(options)) {
      return scheduleNotifications(options);
    }

    return scheduleNotification(options);
  },
  agendarNotificacoes: function (items) {
    return scheduleNotifications(items);
  },
  agendarLoopNotificacoes: function (options) {
    return scheduleNotificationLoop(options);
  },
  cancelarNotificacao: function (id) {
    return call("cancelNotification", [notificationId(id)]);
  },
  cancelarLoopNotificacoes: function (id) {
    return call("cancelNotification", [notificationId(id)]);
  },
  vibrar: function (ms) {
    return call("vibrate", [Number(ms) || 200]);
  },
  toast: function (message) {
    return call("toast", [String(message || "")]);
  },
  aguardar: function (ms) {
    var delay = Math.max(0, Math.min(Number(ms) || 0, 2147483647));
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ ok: true, ms: delay });
      }, delay);
    });
  },
  fullscreen: function (enabled) {
    return call("fullscreen", [Boolean(enabled)]);
  },
  manterTelaAcordada: function (enabled) {
    return call("keepScreenAwake", [Boolean(enabled)]);
  },
  brilhoTela: function (value) {
    return call("setScreenBrightness", [Number(value)]);
  },
  definirCorTema: function (optionsOrColor) {
    return call("setSystemBarsColor", [optionsOrColor || "#126fff"]);
  },
  definirCorBarrasSistema: function (optionsOrColor) {
    return call("setSystemBarsColor", [optionsOrColor || "#126fff"]);
  },
  lanterna: function (enabled) {
    return call("flashlight", [Boolean(enabled)]);
  },
  alternarLanterna: function () {
    return call("toggleFlashlight");
  },
  statusLanterna: function () {
    return call("flashlightStatus");
  },
  tirarFoto: function (options) {
    return call("capturePhoto", [options || {}]);
  },
  capturarVideo: function (options) {
    return call("captureVideo", [options || {}]);
  },
  escanearQRCode: function (options) {
    return api.tirarFoto(Object.assign({ base64: true }, options || {})).then(detectQRCodeFromPhoto);
  },
  solicitarPermissaoCamera: function () {
    return call("requestCameraPermission");
  },
  solicitarPermissaoMicrofone: function () {
    return call("requestMicrophonePermission");
  },
  statusMicrofone: function () {
    return call("microphoneStatus");
  },
  ouvirMic: function () {
    return call("startMic");
  },
  pararMic: function () {
    return call("stopMic");
  },
  copiarTexto: function (text) {
    return call("copyText", [String(text || "")]);
  },
  lerTextoCopiado: function () {
    return call("readText");
  },
  compartilharTexto: function (text) {
    return call("shareText", [String(text || "")]);
  },
  compartilhar: function (options) {
    return call("share", [options || {}]);
  },
  compartilharApp: function (options) {
    return call("shareCurrentApp", [options || {}]);
  },
  procurarBT: function (options) {
    return call("scanBluetooth", [options || {}]);
  },
  conectarBT: function (idDispositivo) {
    return call("connectBluetooth", [String(idDispositivo || "")]);
  },
  enviarBT: function (data) {
    return call("sendBluetooth", [data]);
  },
  aoConectarBT: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    startBluetoothServerSilently();
    return onEvent("bluetooth:conectado", listener);
  },
  aoReceberDadosBT: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    startBluetoothServerSilently();
    return onEvent("bluetooth:dados", function (detail) {
      listener(bluetoothReceivedData(detail));
    });
  },
  aoDarErroBT: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    return onEvent("bluetooth:erro", function (detail) {
      listener(bluetoothErrorDetail(detail));
    });
  },
  procurarWiFi: function (options) {
    return call("scanWifi", [options || {}]);
  },
  conectarWiFi: function (idDispositivo) {
    return call("connectWifi", [String(idDispositivo || "")]);
  },
  enviarWiFi: function (data) {
    return call("sendWifi", [data]);
  },
  aoConectarWiFi: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    startWifiServerSilently();
    return onEvent("wifi:conectado", listener);
  },
  aoReceberDadosWiFi: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    startWifiServerSilently();
    return onEvent("wifi:dados", function (detail) {
      listener(wifiReceivedData(detail));
    });
  },
  aoDarErroWiFi: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    return onEvent("wifi:erro", function (detail) {
      listener(wifiErrorDetail(detail));
    });
  },
  ocr: function (sourceOrOptions) {
    return call("ocr", [ocrOptions(sourceOrOptions)]);
  },
  falar: function (text, options) {
    return call("speakText", [String(text || ""), options || {}]);
  },
  pararFala: function () {
    return call("stopSpeaking");
  },
  ouvir: function (options) {
    return call("recognizeSpeech", [options || {}]);
  },
  abrirUrl: function (url) {
    return call("openUrl", [String(url || "")]);
  },
  abrirUrlExterno: function (url) {
    return call("openUrl", [String(url || "")]);
  },
  abrirPacote: function (pacote) {
    return call("openPackage", [String(pacote || "")]);
  },
  verificarPacote: function (pacote) {
    return call("checkPackage", [String(pacote || "")]);
  },
  apontarArquivo: function (nome, tipo, executar) {
    return call("pointFile", [String(nome || ""), String(tipo || ""), Boolean(executar)]);
  },
  abrirForaDoApp: function (url) {
    return call("openUrl", [String(url || "")]);
  },
  abrirNoApp: function (url, options) {
    return openInAppUrl(url, options || {});
  },
  discar: function (phone) {
    return call("dial", [String(phone || "")]);
  },
  abrirMapa: function (query) {
    return call("openMap", [String(query || "")]);
  },
  abrirWhatsapp: function (phone, message) {
    return call("openWhatsapp", [String(phone || ""), String(message || "")]);
  },
  escolherArquivo: function (options) {
    return call("pickFile", [options || {}]).then(firstOrNull);
  },
  escolherArquivos: function (options) {
    var nextOptions = options || {};
    nextOptions.multiplo = nextOptions.multiplo !== false;
    nextOptions.multiple = nextOptions.multiple !== false;
    return call("pickFile", [nextOptions]);
  },
  escolherImagem: function (options) {
    return call("pickFile", [Object.assign({ tipo: "image", kind: "image" }, options || {})]).then(firstOrNull);
  },
  escolherImagens: function (options) {
    return call("pickFile", [Object.assign({ tipo: "image", kind: "image", multiplo: true, multiple: true }, options || {})]);
  },
  escolherVideo: function (options) {
    return call("pickFile", [Object.assign({ tipo: "video", kind: "video" }, options || {})]).then(firstOrNull);
  },
  escolherPasta: function () {
    return call("pickFolder");
  },
  salvarArquivo: function (nameOrOptions, value, options) {
    if (typeof nameOrOptions === "string") {
      return call("saveStoredFile", [storedFileOptions(nameOrOptions, value, options)]);
    }
    return call("saveFile", [nameOrOptions || {}]);
  },
  lerArquivo: function (nameOrOptions, options) {
    return call("readStoredFile", [storedFileNameOptions(nameOrOptions, options)]).then(unwrapStoredValue);
  },
  lerArquivoCompleto: function (nameOrOptions, options) {
    return call("readStoredFile", [storedFileNameOptions(nameOrOptions, options)]);
  },
  excluirArquivo: function (nameOrOptions, options) {
    return call("deleteStoredFile", [storedFileNameOptions(nameOrOptions, options)]);
  },
  infoArquivo: function (nameOrOptions, options) {
    return call("storedFileInfo", [storedFileNameOptions(nameOrOptions, options)]);
  },
  arquivoExiste: function (nameOrOptions, options) {
    return api.infoArquivo(nameOrOptions, options).then(function (info) {
      return Boolean(info && (info.exists || info.existe));
    });
  },
  listarArquivos: function () {
    return call("listStoredFiles");
  },
  abrirArquivo: function (nameOrOptions, options) {
    return call("openStoredFile", [storedFileNameOptions(nameOrOptions, options)]);
  },
  compartilharArquivo: function (nameOrOptions, options) {
    return call("shareStoredFile", [storedFileNameOptions(nameOrOptions, options)]);
  },
  solicitarPermissaoInstalacao: function () {
    return call("requestInstallPermission");
  },
  solicitarPermissaoArmazenamento: function () {
    return call("requestStoragePermission");
  },
  statusPermissaoArmazenamento: function () {
    return call("storagePermissionStatus");
  },
  instalarAtualizacao: function (url, options) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("A URL do APK e obrigatoria"));
    }
    return call("installUpdate", [url, options || {}]);
  },
  baixarArquivo: function (urlOrOptions, nameOrOptions, options) {
    return call("downloadFile", [downloadFileOptions(urlOrOptions, nameOrOptions, options)]);
  },
  baixarBase64: function (nameOrOptions, base64, options) {
    return call("downloadFile", [downloadBase64Options(nameOrOptions, base64, options)]);
  },
  baixarArquivoLocal: function (fileOrOptions, nameOrOptions, options) {
    return call("downloadFile", [downloadLocalFileOptions(fileOrOptions, nameOrOptions, options)]);
  },
  definirPapelParede: function (sourceOrOptions, options) {
    return call("setWallpaper", [wallpaperOptions(sourceOrOptions, options)]);
  },
  infoPapelParede: function () {
    return call("wallpaperInfo");
  },
  abrirConfiguracaoPapelParede: function () {
    return call("openWallpaperSettings");
  },
  capturarTela: function (options) {
    return call("captureScreen", [options || {}]);
  },
  tirarPrint: function (options) {
    return call("captureScreen", [options || {}]);
  },
  infoDispositivo: function () {
    return call("deviceInfo");
  },
  infoRede: function () {
    return call("networkInfo");
  },
  infoBateria: function () {
    return call("batteryInfo");
  },
  infoMemoria: function () {
    return call("memoryInfo");
  },
  infoArmazenamento: function () {
    return call("storageInfo");
  },
  infoDesempenho: function () {
    return call("performanceInfo");
  },
  volumeAtual: function () {
    return call("getVolume");
  },
  definirVolume: function (streamOrOptions, value, options) {
    return call("setVolume", [volumeOptions(streamOrOptions, value, options)]);
  },
  aumentarVolume: function (streamOrOptions, amountOrOptions, options) {
    return call("adjustVolume", [adjustVolumeOptions(streamOrOptions, amountOrOptions, options, "up")]);
  },
  diminuirVolume: function (streamOrOptions, amountOrOptions, options) {
    return call("adjustVolume", [adjustVolumeOptions(streamOrOptions, amountOrOptions, options, "down")]);
  },
  appsAbertos: function () {
    return call("openAppsMemory");
  },
  infoAppsAbertos: function () {
    return call("openAppsMemory");
  },
  obterLocalizacao: function (options) {
    return call("getLocation", [options || {}]);
  },
  acompanharLocalizacao: function (options) {
    return call("watchLocation", [options || {}]);
  },
  pararLocalizacao: function (id) {
    return call("stopLocationWatch", [id || ""]);
  },
  aoMudarLocalizacao: function (listener) {
    return onEvent("localizacao:mudou", listener);
  },
  medirVelocidade: function (callback, options) {
    var listener = function (local) {
      if (typeof callback !== "function") return;
      var ms = typeof local.velocidade === "number" ? local.velocidade : 0;
      var kmh = ms * 3.6;
      callback(kmh, local);
    };
    var stopEvent = api.aoMudarLocalizacao(listener);
    return api.acompanharLocalizacao(Object.assign({ altaPrecisao: true, intervaloMs: 2000 }, options || {}))
      .then(function (result) {
        var watchId = result && result.watchId;
        return function pararMedicao() {
          stopEvent();
          if (watchId) {
            return api.pararLocalizacao(watchId);
          }
          return Promise.resolve();
        };
      });
  },
  autenticarBiometria: function (options) {
    return call("authenticateBiometric", [options || {}]);
  },
  solicitarBloqueio: function (options) {
    return call("requestDeviceLock", [options || {}]);
  },
  solicitarSegundoPlano: function (options) {
    return call("requestBackgroundExecution", [options || {}]);
  },
  configurarInicioAutomatico: function (enable) {
    return call("setAutoStartOnBoot", [{ ativar: !!enable }]);
  },
  aoLigarDispositivo: function (callback) {
    if (typeof callback === "function") {
      call("getInitialLink").then(function(link) {
        if (link === "html2apk://boot") {
          callback();
        }
      });
    }
  },
  salvarSeguro: function (keyOrOptions, value, options) {
    return call("saveSecureItem", [secureItemOptions(keyOrOptions, value, options)]);
  },
  lerSeguro: function (keyOrOptions, options) {
    return call("readSecureItem", [secureKeyOptions(keyOrOptions, options)]).then(unwrapStoredValue);
  },
  lerSeguroCompleto: function (keyOrOptions, options) {
    return call("readSecureItem", [secureKeyOptions(keyOrOptions, options)]);
  },
  removerSeguro: function (keyOrOptions, options) {
    return call("deleteSecureItem", [secureKeyOptions(keyOrOptions, options)]);
  },
  listarSeguro: function () {
    return call("listSecureKeys");
  },
  limparSeguro: function () {
    return call("clearSecureStorage");
  },
  statusPermissoes: function (permissions) {
    return call("permissionStatus", [permissions || []]);
  },
  solicitarPermissaoNotificacoes: function () {
    return call("requestNotificationPermission");
  },
  statusPermissaoNotificacoes: function () {
    return call("notificationPermissionStatus");
  },
  podeAgendarNotificacaoExata: function () {
    return call("canScheduleExactAlarms");
  },
  abrirConfiguracaoAlarmeExato: function () {
    return call("openExactAlarmSettings");
  },
  statusPermissaoSobreposicao: function () {
    return call("overlayPermissionStatus");
  },
  solicitarPermissaoSobreposicao: function () {
    return call("requestOverlayPermission");
  },
  abrirConfiguracaoSobreposicao: function () {
    return call("openOverlaySettings");
  },
  iniciarIconeFlutuante: function (options) {
    return call("startFloatingIcon", [floatingIconOptions(options)]);
  },
  pararIconeFlutuante: function () {
    return call("stopFloatingIcon");
  },
  configurarIconeFlutuante: function (options) {
    return call("configureFloatingIcon", [floatingIconOptions(options)]);
  },
  definirOpacidadeIconeFlutuante: function (opacity) {
    return call("configureFloatingIcon", [floatingIconOptions(opacity)]);
  },
  minimizarApp: function () {
    return call("minimizeApp");
  },
  fecharApp: function () {
    return call("closeApp");
  },
  salvarNaSessao: function (key, value) {
    return call("sessionSet", [String(key || ""), value === undefined ? null : String(value)]);
  },
  lerDaSessao: function (key) {
    return call("sessionGet", [String(key || "")]);
  },
  removerDaSessao: function (key) {
    return call("sessionRemove", [String(key || "")]);
  },
  limparSessao: function () {
    return call("sessionClear");
  },
  listarSessao: function () {
    return call("sessionGetAll");
  },
  obterNotificacaoInicial: function () {
    return call("getInitialNotification").then(function (notification) {
      initialNotification = notification && notification.id ? notification : null;
      return initialNotification;
    });
  },
  obterLinkInicial: function () {
    return call("getInitialLink").then(function (link) {
      initialLink = link && link.url ? link : null;
      return initialLink;
    });
  },
  obterCompartilhamentoInicial: function () {
    return call("getInitialShare").then(function (share) {
      initialShare = share && (share.text || share.texto || share.uri || (share.items && share.items.length)) ? normalizeReceivedShare(share) : null;
      return initialShare;
    });
  },
  aoEvento: onEvent,
  aoMinimizar: function (listener) {
    return onEvent("app:background", listener);
  },
  aoVoltarParaApp: function (listener) {
    return onEvent("app:voltou", listener);
  },
  aoAbrirLink: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    if (initialLink) {
      setTimeout(function () {
        listener(initialLink);
      }, 0);
    }
    return onEvent("link:aberto", listener);
  },
  aoReceberCompartilhamento: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }
    if (initialShare) {
      setTimeout(function () {
        listener(normalizeReceivedShare(initialShare));
      }, 0);
    }
    return onEvent("compartilhamento:recebido", function (detail) {
      listener(normalizeReceivedShare(detail));
    });
  },
  aoMudarRede: function (listener) {
    return onEvent("rede:mudou", listener);
  },
  aoMudarBateria: function (listener) {
    return onEvent("bateria:mudou", listener);
  },
  aoConectarUSB: function (listener) {
    return onEvent("usb:conectado", listener);
  },
  aoDesconectarUSB: function (listener) {
    return onEvent("usb:desconectado", listener);
  },
  aoConectarFone: function (listener) {
    return onEvent("fone:conectado", listener);
  },
  aoDesconectarFone: function (listener) {
    return onEvent("fone:desconectado", listener);
  },
  aoMudarVolume: function (listener) {
    return onEvent("volume:mudou", listener);
  },
  aoAbrirTeclado: function (listener) {
    return onEvent("teclado:abriu", listener);
  },
  aoFecharTeclado: function (listener) {
    return onEvent("teclado:fechou", listener);
  },
  aoSacudirCelular: function (listener) {
    return onEvent("celular:sacudido", listener);
  },
  aoVirarCelularParaBaixo: function (listener) {
    return onEvent("celular:tela_para_baixo", listener);
  },
  aoAproximarObjeto: function (listener) {
    return onEvent("proximidade:perto", listener);
  },
  aoTirarPrint: function (listener) {
    return onEvent("print:tela", listener);
  },
  aoMudarOrientacao: function (listener) {
    return onEvent("orientacao:mudou", listener);
  },
  aoNFC: function (listener) {
    return onEvent("nfc:recebido", listener);
  },
  aoReceberNotificacao: function (listener) {
    return onEvent("notificacao:recebida", listener);
  },
  aoClicarNotificacao: function (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }

    notificationListeners.push(listener);
    if (initialNotification) {
      listener(initialNotification);
    }

    return function unsubscribe() {
      notificationListeners = notificationListeners.filter(function (item) {
        return item !== listener;
      });
    };
  },
  __emitNotificationClick: function (detail) {
    emitNotificationClick(detail);
  },
  __emitEvent: function (type, detail) {
    emitEvent(type, detail);
  }
};

Object.assign(api, {
  notify: api.notificar,
  scheduleNotification: api.agendarNotificacao,
  scheduleNotifications: api.agendarNotificacoes,
  scheduleNotificationLoop: api.agendarLoopNotificacoes,
  cancelNotification: api.cancelarNotificacao,
  cancelNotificationLoop: api.cancelarLoopNotificacoes,
  vibrate: api.vibrar,
  loading: api.aguardar,
  manterTelaLigada: api.manterTelaAcordada,
  keepScreenAwake: api.manterTelaAcordada,
  keepScreenOn: api.manterTelaAcordada,
  setScreenBrightness: api.brilhoTela,
  setThemeColor: api.definirCorTema,
  setSystemBarsColor: api.definirCorBarrasSistema,
  flashlight: api.lanterna,
  toggleFlashlight: api.alternarLanterna,
  flashlightStatus: api.statusLanterna,
  takePhoto: api.tirarFoto,
  capturePhoto: api.tirarFoto,
  captureVideo: api.capturarVideo,
  scanQRCode: api.escanearQRCode,
  scanQrCode: api.escanearQRCode,
  requestCameraPermission: api.solicitarPermissaoCamera,
  requestMicrophonePermission: api.solicitarPermissaoMicrofone,
  microphoneStatus: api.statusMicrofone,
  listenMic: api.ouvirMic,
  startMic: api.ouvirMic,
  startMicRecording: api.ouvirMic,
  stopMic: api.pararMic,
  stopMicRecording: api.pararMic,
  copyText: api.copiarTexto,
  readText: api.lerTextoCopiado,
  shareText: api.compartilharTexto,
  share: api.compartilhar,
  shareApp: api.compartilharApp,
  share_me: api.compartilharApp,
  scanBluetooth: api.procurarBT,
  procurarBluetooth: api.procurarBT,
  buscarBT: api.procurarBT,
  connectBluetooth: api.conectarBT,
  conectarBluetooth: api.conectarBT,
  sendBluetooth: api.enviarBT,
  onBluetoothConnect: api.aoConectarBT,
  onBluetoothConnected: api.aoConectarBT,
  onBluetoothData: api.aoReceberDadosBT,
  onBTData: api.aoReceberDadosBT,
  onBluetoothError: api.aoDarErroBT,
  onBTError: api.aoDarErroBT,
  scanWiFi: api.procurarWiFi,
  scanWifi: api.procurarWiFi,
  procurarWifi: api.procurarWiFi,
  connectWiFi: api.conectarWiFi,
  connectWifi: api.conectarWiFi,
  conectarWifi: api.conectarWiFi,
  sendWiFi: api.enviarWiFi,
  sendWifi: api.enviarWiFi,
  enviarWifi: api.enviarWiFi,
  onWiFiConnect: api.aoConectarWiFi,
  onWifiConnect: api.aoConectarWiFi,
  onWiFiConnected: api.aoConectarWiFi,
  onWifiConnected: api.aoConectarWiFi,
  onWiFiData: api.aoReceberDadosWiFi,
  onWifiData: api.aoReceberDadosWiFi,
  onWiFiError: api.aoDarErroWiFi,
  onWifiError: api.aoDarErroWiFi,
  recognizeText: api.ocr,
  textFromImage: api.ocr,
  speak: api.falar,
  textToSpeech: api.falar,
  stopSpeaking: api.pararFala,
  stopSpeech: api.pararFala,
  listen: api.ouvir,
  recognizeSpeech: api.ouvir,
  speechToText: api.ouvir,
  openUrl: api.abrirUrl,
  openExternalUrl: api.abrirUrlExterno,
  openOutsideApp: api.abrirForaDoApp,
  openInApp: api.abrirNoApp,
  dial: api.discar,
  openMap: api.abrirMapa,
  openWhatsapp: api.abrirWhatsapp,
  pickFile: api.escolherArquivo,
  pickFiles: api.escolherArquivos,
  pickImage: api.escolherImagem,
  pickImages: api.escolherImagens,
  pickVideo: api.escolherVideo,
  pickFolder: api.escolherPasta,
  saveFile: api.salvarArquivo,
  readFile: api.lerArquivo,
  readStoredFile: api.lerArquivo,
  readStoredFileInfo: api.lerArquivoCompleto,
  deleteFile: api.excluirArquivo,
  removeFile: api.excluirArquivo,
  excluirArquivoArmazenado: api.excluirArquivo,
  removerArquivo: api.excluirArquivo,
  apagarArquivo: api.excluirArquivo,
  fileInfo: api.infoArquivo,
  storedFileInfo: api.infoArquivo,
  fileExists: api.arquivoExiste,
  listFiles: api.listarArquivos,
  listStoredFiles: api.listarArquivos,
  openFile: api.abrirArquivo,
  openStoredFile: api.abrirArquivo,
  shareFile: api.compartilharArquivo,
  shareStoredFile: api.compartilharArquivo,
  solicitarPermissaoInstalacao: api.solicitarPermissaoInstalacao,
  requestInstallPermission: api.solicitarPermissaoInstalacao,
  solicitarPermissaoArmazenamento: api.solicitarPermissaoArmazenamento,
  requestStoragePermission: api.solicitarPermissaoArmazenamento,
  statusPermissaoArmazenamento: api.statusPermissaoArmazenamento,
  storagePermissionStatus: api.statusPermissaoArmazenamento,
  installUpdate: api.instalarAtualizacao,
  downloadFile: api.baixarArquivo,
  downloadBase64: api.baixarBase64,
  downloadFromBase64: api.baixarBase64,
  baixarArquivoBase64: api.baixarBase64,
  downloadLocalFile: api.baixarArquivoLocal,
  downloadFromFile: api.baixarArquivoLocal,
  baixarArquivoNormal: api.baixarArquivoLocal,
  setWallpaper: api.definirPapelParede,
  setPhoneWallpaper: api.definirPapelParede,
  wallpaper: api.definirPapelParede,
  wallpaperInfo: api.infoPapelParede,
  openWallpaperSettings: api.abrirConfiguracaoPapelParede,
  captureScreen: api.capturarTela,
  takeScreenshot: api.capturarTela,
  screenshot: api.capturarTela,
  deviceInfo: api.infoDispositivo,
  networkInfo: api.infoRede,
  batteryInfo: api.infoBateria,
  memoryInfo: api.infoMemoria,
  storageInfo: api.infoArmazenamento,
  performanceInfo: api.infoDesempenho,
  currentVolume: api.volumeAtual,
  getVolume: api.volumeAtual,
  setVolume: api.definirVolume,
  increaseVolume: api.aumentarVolume,
  decreaseVolume: api.diminuirVolume,
  openAppsMemory: api.appsAbertos,
  openAppsInfo: api.infoAppsAbertos,
  getLocation: api.obterLocalizacao,
  watchLocation: api.acompanharLocalizacao,
  stopLocationWatch: api.pararLocalizacao,
  onLocationChange: api.aoMudarLocalizacao,
  measureSpeed: api.medirVelocidade,
  authenticateBiometric: api.autenticarBiometria,
  requestDeviceLock: api.solicitarBloqueio,
  requestBackgroundExecution: api.solicitarSegundoPlano,
  setAutoStartOnBoot: api.configurarInicioAutomatico,
  onDeviceBoot: api.aoLigarDispositivo,
  saveSecure: api.salvarSeguro,
  secureSet: api.salvarSeguro,
  readSecure: api.lerSeguro,
  secureGet: api.lerSeguro,
  readSecureItem: api.lerSeguroCompleto,
  deleteSecure: api.removerSeguro,
  removeSecure: api.removerSeguro,
  secureDelete: api.removerSeguro,
  listSecureKeys: api.listarSeguro,
  clearSecureStorage: api.limparSeguro,
  sessionSet: api.salvarNaSessao,
  sessionGet: api.lerDaSessao,
  sessionRemove: api.removerDaSessao,
  sessionClear: api.limparSessao,
  sessionGetAll: api.listarSessao,
  permissionStatus: api.statusPermissoes,
  requestNotificationPermission: api.solicitarPermissaoNotificacoes,
  notificationPermissionStatus: api.statusPermissaoNotificacoes,
  canScheduleExactAlarms: api.podeAgendarNotificacaoExata,
  openExactAlarmSettings: api.abrirConfiguracaoAlarmeExato,
  overlayPermissionStatus: api.statusPermissaoSobreposicao,
  requestOverlayPermission: api.solicitarPermissaoSobreposicao,
  openOverlaySettings: api.abrirConfiguracaoSobreposicao,
  startFloatingIcon: api.iniciarIconeFlutuante,
  configureFloatingIcon: api.configurarIconeFlutuante,
  setFloatingIconOpacity: api.definirOpacidadeIconeFlutuante,
  stopFloatingIcon: api.pararIconeFlutuante,
  minimizeApp: api.minimizarApp,
  closeApp: api.fecharApp,
  exitApp: api.fecharApp,
  getInitialNotification: api.obterNotificacaoInicial,
  getInitialLink: api.obterLinkInicial,
  getInitialShare: api.obterCompartilhamentoInicial,
  onShareReceived: api.aoReceberCompartilhamento,
  onReceiveShare: api.aoReceberCompartilhamento,
  onEvent: api.aoEvento,
  onMinimize: api.aoMinimizar,
  onAppResume: api.aoVoltarParaApp,
  onOpenLink: api.aoAbrirLink,
  onNetworkChange: api.aoMudarRede,
  onBatteryChange: api.aoMudarBateria,
  onUSBConnect: api.aoConectarUSB,
  onUsbConnect: api.aoConectarUSB,
  onUSBDisconnect: api.aoDesconectarUSB,
  onUsbDisconnect: api.aoDesconectarUSB,
  onHeadphoneConnect: api.aoConectarFone,
  onHeadphoneConnected: api.aoConectarFone,
  onHeadphoneDisconnect: api.aoDesconectarFone,
  onHeadphoneDisconnected: api.aoDesconectarFone,
  onVolumeChange: api.aoMudarVolume,
  onKeyboardOpen: api.aoAbrirTeclado,
  onKeyboardOpened: api.aoAbrirTeclado,
  onKeyboardClose: api.aoFecharTeclado,
  onKeyboardClosed: api.aoFecharTeclado,
  onPhoneShake: api.aoSacudirCelular,
  onShake: api.aoSacudirCelular,
  onPhoneFaceDown: api.aoVirarCelularParaBaixo,
  onFaceDown: api.aoVirarCelularParaBaixo,
  onProximityNear: api.aoAproximarObjeto,
  onObjectNear: api.aoAproximarObjeto,
  onScreenshot: api.aoTirarPrint,
  onScreenshotTaken: api.aoTirarPrint,
  onOrientationChange: api.aoMudarOrientacao,
  onNFC: api.aoNFC,
  onNfc: api.aoNFC,
  onNFCReceived: api.aoNFC,
  onNfcReceived: api.aoNFC,
  onNotificationReceived: api.aoReceberNotificacao,
  onReceiveNotification: api.aoReceberNotificacao,
  onNotificationClick: api.aoClicarNotificacao
});

if (typeof window !== "undefined") {
  window.notificar = api.notificar;
  window.agendarNotificacao = api.agendarNotificacao;
  window.vibrar = api.vibrar;
  window.toast = api.toast;
  window.fullscreen = api.fullscreen;
  window.manterTelaAcordada = api.manterTelaAcordada;
  window.manterTelaLigada = api.manterTelaAcordada;
  window.brilhoTela = api.brilhoTela;
  window.lanterna = api.lanterna;
  window.alternarLanterna = api.alternarLanterna;
  window.statusLanterna = api.statusLanterna;
  window.solicitarPermissaoCamera = api.solicitarPermissaoCamera;
  window.solicitarPermissaoMicrofone = api.solicitarPermissaoMicrofone;
  window.statusMicrofone = api.statusMicrofone;
  window.ouvirMic = api.ouvirMic;
  window.pararMic = api.pararMic;
  window.copiarTexto = api.copiarTexto;
  window.lerTextoCopiado = api.lerTextoCopiado;
  window.compartilhar = api.compartilhar;
  window.compartilharTexto = api.compartilharTexto;
  window.abrirUrl = api.abrirUrl;
  window.abrirUrlExterno = api.abrirUrlExterno;
  window.abrirWhatsapp = api.abrirWhatsapp;
  window.discar = api.discar;
  window.abrirMapa = api.abrirMapa;
  window.escolherArquivo = api.escolherArquivo;
  window.escolherArquivos = api.escolherArquivos;
  window.escolherImagem = api.escolherImagem;
  window.escolherImagens = api.escolherImagens;
  window.escolherVideo = api.escolherVideo;
  window.escolherPasta = api.escolherPasta;
  window.salvarArquivo = api.salvarArquivo;
  window.definirPapelParede = api.definirPapelParede;
  window.infoPapelParede = api.infoPapelParede;
  window.abrirConfiguracaoPapelParede = api.abrirConfiguracaoPapelParede;
  window.infoDispositivo = api.infoDispositivo;
  window.infoRede = api.infoRede;
  window.infoBateria = api.infoBateria;
  window.infoMemoria = api.infoMemoria;
  window.infoArmazenamento = api.infoArmazenamento;
  window.infoDesempenho = api.infoDesempenho;
  window.appsAbertos = api.appsAbertos;
  window.infoAppsAbertos = api.infoAppsAbertos;
  window.statusPermissoes = api.statusPermissoes;
  window.solicitarPermissaoNotificacoes = api.solicitarPermissaoNotificacoes;
  window.statusPermissaoNotificacoes = api.statusPermissaoNotificacoes;
  window.podeAgendarNotificacaoExata = api.podeAgendarNotificacaoExata;
  window.abrirConfiguracaoAlarmeExato = api.abrirConfiguracaoAlarmeExato;
  window.statusPermissaoSobreposicao = api.statusPermissaoSobreposicao;
  window.solicitarPermissaoSobreposicao = api.solicitarPermissaoSobreposicao;
  window.abrirConfiguracaoSobreposicao = api.abrirConfiguracaoSobreposicao;
  window.iniciarIconeFlutuante = api.iniciarIconeFlutuante;
  window.pararIconeFlutuante = api.pararIconeFlutuante;
  window.obterNotificacaoInicial = api.obterNotificacaoInicial;
  window.obterLinkInicial = api.obterLinkInicial;
  window.aoEvento = api.aoEvento;
  window.aoMinimizar = api.aoMinimizar;
  window.aoVoltarParaApp = api.aoVoltarParaApp;
  window.aoAbrirLink = api.aoAbrirLink;
  window.aoMudarRede = api.aoMudarRede;
  window.aoMudarBateria = api.aoMudarBateria;
  window.aoClicarNotificacao = api.aoClicarNotificacao;
  window.salvarNaSessao = api.salvarNaSessao;
  window.lerDaSessao = api.lerDaSessao;
  window.removerDaSessao = api.removerDaSessao;
  window.limparSessao = api.limparSessao;
  window.listarSessao = api.listarSessao;

  Object.keys(api).forEach(function (key) {
    if (key.indexOf("__") === 0) {
      return;
    }

    window[key] = api[key];
  });

  window.Html2Apk = api;

  window.addEventListener("html2apk:notification", function (event) {
    emitNotificationClick(event.detail);
  });

  window.addEventListener("html2apk:event", function (event) {
    emitEvent(event.detail && event.detail.type, event.detail);
  });

  document.addEventListener("backbutton", function () {
    emitEvent("botao:voltar", { type: "botao:voltar", timestamp: Date.now() });
  }, false);

  document.addEventListener("deviceready", function () {
    emitEvent("app:pronto", { type: "app:pronto", timestamp: Date.now() });
    api.obterNotificacaoInicial().then(function (notification) {
      if (notification) {
        emitNotificationClick(notification);
        emitEvent("notificacao:clicada", notification);
      }
    });
    api.obterLinkInicial().then(function (link) {
      if (link) {
        initialLink = link;
        emitEvent("link:aberto", link);
      }
    });
    api.obterCompartilhamentoInicial().then(function (share) {
      if (share) {
        initialShare = share;
        emitEvent("compartilhamento:recebido", share);
      }
    });
  }, false);
}

module.exports = api;
