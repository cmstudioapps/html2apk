"use strict";

(function () {
  var appId = __HTML2APK_ONESIGNAL_APP_ID__;
  var ready = false;
  var initError = null;

  function oneSignal() {
    return (window.plugins && window.plugins.OneSignal) || window.OneSignal || null;
  }

  function requireOneSignal() {
    var sdk = oneSignal();
    if (!sdk) {
      throw new Error("OneSignal is not available. Check whether onesignal-cordova-plugin was installed.");
    }
    return sdk;
  }

  function dispatch(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail: detail || {} }));
  }

  function asPromise(action) {
    return new Promise(function (resolve, reject) {
      try {
        resolve(action(requireOneSignal()));
      } catch (error) {
        reject(error);
      }
    });
  }

  function status() {
    return {
      enabled: Boolean(appId),
      habilitado: Boolean(appId),
      ready: ready,
      pronto: ready,
      appId: appId,
      error: initError,
      erro: initError
    };
  }

  function initialize() {
    if (!appId || ready) {
      return;
    }

    try {
      var sdk = requireOneSignal();
      sdk.initialize(appId);
      ready = true;

      if (sdk.Notifications && sdk.Notifications.addEventListener) {
        sdk.Notifications.addEventListener("click", function (event) {
          dispatch("html2apk:push-click", event);
          dispatch("html2apk:onesignal-click", event);
        });
      }

      dispatch("html2apk:onesignal-ready", status());
    } catch (error) {
      initError = error && error.message ? error.message : String(error);
      dispatch("html2apk:onesignal-error", status());
    }
  }

  function requestPushPermission(fallbackToSettings) {
    return asPromise(function (sdk) {
      if (!sdk.Notifications || !sdk.Notifications.requestPermission) {
        throw new Error("OneSignal notification permission API is not available.");
      }
      return sdk.Notifications.requestPermission(fallbackToSettings !== false);
    });
  }

  function onPushClick(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }

    var sdk = requireOneSignal();
    if (!sdk.Notifications || !sdk.Notifications.addEventListener) {
      throw new Error("OneSignal click listener API is not available.");
    }

    sdk.Notifications.addEventListener("click", listener);
    return function unsubscribe() {
      if (sdk.Notifications.removeEventListener) {
        sdk.Notifications.removeEventListener("click", listener);
      }
    };
  }

  function loginPushUser(externalId) {
    return asPromise(function (sdk) {
      if (!externalId) {
        throw new Error("External user id is required.");
      }
      sdk.login(String(externalId));
      return { externalId: String(externalId), loggedIn: true, logado: true };
    });
  }

  function logoutPushUser() {
    return asPromise(function (sdk) {
      if (sdk.logout) {
        sdk.logout();
      }
      return { loggedOut: true, deslogado: true };
    });
  }

  function addPushTag(key, value) {
    return asPromise(function (sdk) {
      if (!sdk.User || !sdk.User.addTag) {
        throw new Error("OneSignal user tag API is not available.");
      }
      sdk.User.addTag(String(key), String(value));
      return { key: String(key), value: String(value), saved: true, salvo: true };
    });
  }

  function addPushTags(tags) {
    return asPromise(function (sdk) {
      if (!tags || typeof tags !== "object" || Array.isArray(tags)) {
        throw new TypeError("tags must be an object.");
      }
      if (!sdk.User || !sdk.User.addTags) {
        throw new Error("OneSignal user tag API is not available.");
      }
      sdk.User.addTags(tags);
      return { tags: tags, saved: true, salvo: true };
    });
  }

  window.statusOneSignal = status;
  window.oneSignalStatus = status;
  window.solicitarPermissaoPush = requestPushPermission;
  window.requestPushPermission = requestPushPermission;
  window.aoClicarPush = onPushClick;
  window.onPushClick = onPushClick;
  window.identificarUsuarioPush = loginPushUser;
  window.loginPushUser = loginPushUser;
  window.sairUsuarioPush = logoutPushUser;
  window.logoutPushUser = logoutPushUser;
  window.adicionarTagPush = addPushTag;
  window.addPushTag = addPushTag;
  window.adicionarTagsPush = addPushTags;
  window.addPushTags = addPushTags;

  document.addEventListener("deviceready", initialize, false);
})();
