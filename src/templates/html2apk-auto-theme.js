(function () {
  "use strict";

  var lastPayload = "";
  var scheduled = false;
  var observer = null;

  function clamp(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }
    return Math.max(0, Math.min(255, Math.round(number)));
  }

  function toHex(red, green, blue) {
    return "#" + [red, green, blue].map(function (part) {
      return clamp(part).toString(16).padStart(2, "0");
    }).join("");
  }

  function parseColor(value) {
    var color = String(value || "").trim();
    var match;
    var parts;

    if (!color || color === "transparent") {
      return null;
    }

    if (/^#[0-9a-f]{3}$/i.test(color)) {
      return "#" + color.slice(1).split("").map(function (part) {
        return part + part;
      }).join("").toLowerCase();
    }

    if (/^#[0-9a-f]{6}$/i.test(color)) {
      return color.toLowerCase();
    }

    match = color.match(/^rgba?\((.+)\)$/i);
    if (!match) {
      return null;
    }

    parts = match[1].split(",").map(function (part) {
      return part.trim();
    });
    if (parts.length < 3 || (parts.length > 3 && Number(parts[3]) === 0)) {
      return null;
    }

    return toHex(parts[0], parts[1], parts[2]);
  }

  function fallbackColor() {
    return parseColor(window.getComputedStyle(document.body).backgroundColor)
      || parseColor(window.getComputedStyle(document.documentElement).backgroundColor)
      || "#126fff";
  }

  function colorAt(x, y) {
    var maxX = Math.max(0, window.innerWidth - 1);
    var maxY = Math.max(0, window.innerHeight - 1);
    var element = document.elementFromPoint(Math.max(0, Math.min(maxX, x)), Math.max(0, Math.min(maxY, y)));

    while (element && element.nodeType === 1) {
      var color = parseColor(window.getComputedStyle(element).backgroundColor);
      if (color) {
        return color;
      }
      element = element.parentElement;
    }

    return fallbackColor();
  }

  function isLight(hex) {
    var value = String(hex || "").replace("#", "");
    var red = parseInt(value.slice(0, 2), 16) / 255;
    var green = parseInt(value.slice(2, 4), 16) / 255;
    var blue = parseInt(value.slice(4, 6), 16) / 255;
    var luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    return luminance > 0.62;
  }

  function applyTheme() {
    var setSystemBarsColor = window.setSystemBarsColor || window.definirCorTema;
    var statusBarColor = colorAt(window.innerWidth / 2, 8);
    var navigationBarColor = colorAt(window.innerWidth / 2, window.innerHeight - 8);
    var payload = {
      statusBarColor: statusBarColor,
      navigationBarColor: navigationBarColor,
      color: statusBarColor,
      darkIcons: isLight(statusBarColor),
      darkNavigationIcons: isLight(navigationBarColor),
      source: "auto"
    };
    var nextPayload = JSON.stringify(payload);

    scheduled = false;
    if (nextPayload === lastPayload || typeof setSystemBarsColor !== "function") {
      return;
    }

    lastPayload = nextPayload;
    setSystemBarsColor(payload).catch(function () {});
  }

  function scheduleThemeUpdate() {
    if (scheduled) {
      return;
    }

    scheduled = true;
    window.requestAnimationFrame(applyTheme);
  }

  function startAutoTheme() {
    scheduleThemeUpdate();
    window.addEventListener("scroll", scheduleThemeUpdate, { passive: true });
    window.addEventListener("resize", scheduleThemeUpdate);
    document.addEventListener("visibilitychange", scheduleThemeUpdate);

    if (window.MutationObserver && !observer) {
      observer = new MutationObserver(scheduleThemeUpdate);
      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    window.setInterval(scheduleThemeUpdate, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleThemeUpdate);
  } else {
    scheduleThemeUpdate();
  }

  document.addEventListener("deviceready", startAutoTheme, false);
}());
