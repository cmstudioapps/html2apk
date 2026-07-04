"use strict";

const fs = require("fs/promises");
const path = require("path");
const {
  DEFAULT_ANDROID_MIN_SDK_VERSION,
  MAX_ANDROID_MIN_SDK_VERSION
} = require("../core/defaults");

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function androidPermissionName(permission) {
  const value = String(permission).trim();
  return value.includes(".") ? value : `android.permission.${value}`;
}

function renderPermissions(permissions) {
  const uniquePermissions = Array.from(new Set((permissions || [])
    .map((permission) => String(permission).trim())
    .filter(Boolean)
    .map(androidPermissionName)));
  if (!uniquePermissions.length) {
    return "";
  }

  const items = uniquePermissions
    .map((permission) => `      <uses-permission android:name="${xmlEscape(permission)}" />`)
    .join("\n");

  return `    <config-file target="AndroidManifest.xml" parent="/manifest">
${items}
    </config-file>`;
}

function renderIcon(icon) {
  if (!icon) {
    return "";
  }
  return `    <icon src="${xmlEscape(icon)}" />`;
}

function renderPreference(name, value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return `    <preference name="${xmlEscape(name)}" value="${xmlEscape(value)}" />`;
}

function normalizeMinSdkVersion(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed)
    && parsed >= DEFAULT_ANDROID_MIN_SDK_VERSION
    && parsed <= MAX_ANDROID_MIN_SDK_VERSION
    ? parsed
    : DEFAULT_ANDROID_MIN_SDK_VERSION;
}

function renderAndroidSplashPreferences(options) {
  const splashIcon = options.androidSplashScreenAnimatedIcon || options.splash || options.icon;
  if (!splashIcon) {
    return "";
  }

  const themeColor = options.themeColor || options.splashBackgroundColor || options.backgroundColor || "#FFFFFF";

  return [
    renderPreference("AndroidWindowSplashScreenAnimatedIcon", splashIcon),
    renderPreference("AndroidWindowSplashScreenBackground", themeColor),
    renderPreference("AndroidWindowSplashScreenAnimationDuration", options.splashAnimationDuration || "200")
  ].filter(Boolean).join("\n");
}

function renderDeepLinkData(pathItem) {
  if (!pathItem || pathItem === "*" || pathItem === "/*") {
    return "";
  }

  if (pathItem.includes("*")) {
    return ` android:pathPattern="${xmlEscape(pathItem.replace(/\*/g, ".*"))}"`;
  }

  return ` android:pathPrefix="${xmlEscape(pathItem)}"`;
}

function renderDeepLinkIntentFilters(deepLinks = {}) {
  const filters = [];
  const schemes = Array.isArray(deepLinks.schemes) ? deepLinks.schemes : [];
  const appLinks = Array.isArray(deepLinks.appLinks) ? deepLinks.appLinks : [];

  for (const scheme of schemes) {
    filters.push(`    <config-file target="AndroidManifest.xml" parent="/manifest/application/activity">
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="${xmlEscape(scheme)}" />
      </intent-filter>
    </config-file>`);
  }

  for (const link of appLinks) {
    if (!link || !link.host) {
      continue;
    }

    const scheme = link.scheme || "https";
    const paths = Array.isArray(link.paths) && link.paths.length ? link.paths : [""];
    const dataItems = paths
      .map((pathItem) => `        <data android:scheme="${xmlEscape(scheme)}" android:host="${xmlEscape(link.host)}"${renderDeepLinkData(pathItem)} />`)
      .join("\n");
    const verify = link.autoVerify ? " android:autoVerify=\"true\"" : "";

    filters.push(`    <config-file target="AndroidManifest.xml" parent="/manifest/application/activity">
      <intent-filter${verify}>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
${dataItems}
      </intent-filter>
    </config-file>`);
  }

  return filters.join("\n");
}

function renderConfigXml(options) {
  const fullscreen = options.mode === "fullscreen" ? "true" : "false";
  const permissionsList = options.mode === "floating"
    ? [...(options.permissions || []), "SYSTEM_ALERT_WINDOW"]
    : (options.permissions || []);
  const permissions = renderPermissions(permissionsList);
  const icon = renderIcon(options.icon);
  const splashPreferences = renderAndroidSplashPreferences(options);
  const deepLinkIntentFilters = renderDeepLinkIntentFilters(options.deepLinks);
  const platformItems = [permissions, deepLinkIntentFilters, icon, splashPreferences].filter(Boolean).join("\n");
  const backgroundPreference = renderPreference("BackgroundColor", options.themeColor || options.backgroundColor);
  const themeModePreference = renderPreference("Html2ApkThemeMode", options.themeMode || options.theme || "fixed");
  const oneSignalPreference = renderPreference("Html2ApkOneSignalAppId", options.oneSignalAppId);
  const modePreference = renderPreference("Html2ApkMode", options.mode || "standalone");
  const minSdkPreference = renderPreference(
    "android-minSdkVersion",
    normalizeMinSdkVersion(options.minSdkVersion || options.androidMinSdkVersion)
  );
  const orientationPreference = ["portrait", "landscape"].includes(options.orientation)
    ? renderPreference("Orientation", options.orientation)
    : "";
  const isWeb2ApkPreference = options.url ? renderPreference("Html2ApkIsWeb2Apk", "true") : "";

  const contentSrc = options.url ? xmlEscape(options.url) : xmlEscape(options.entryFile || "index.html");

  return `<?xml version="1.0" encoding="UTF-8"?>
<widget id="${xmlEscape(options.packageId)}"
        version="${xmlEscape(options.version)}"
        xmlns="http://www.w3.org/ns/widgets"
        xmlns:cdv="http://cordova.apache.org/ns/1.0"
        xmlns:android="http://schemas.android.com/apk/res/android">
  <name>${xmlEscape(options.appName)}</name>
  <description>Generated by html2apk.</description>
  <author email="support@example.com" href="https://example.com">html2apk</author>

  <content src="${contentSrc}" />
  <access origin="*" />
  <allow-navigation href="*" />
  <allow-intent href="http://*/*" />
  <allow-intent href="https://*/*" />
  <allow-intent href="tel:*" />
  <allow-intent href="sms:*" />
  <allow-intent href="mailto:*" />
  <allow-intent href="geo:*" />

  <preference name="Fullscreen" value="${fullscreen}" />
  <preference name="AndroidXEnabled" value="true" />
  <preference name="AndroidPersistentFileLocation" value="Compatibility" />
  <preference name="AndroidLaunchMode" value="singleTop" />
  <preference name="DisallowOverscroll" value="true" />
  <preference name="GradlePluginKotlinEnabled" value="true" />
${minSdkPreference}
${modePreference}
${themeModePreference}
${oneSignalPreference}
${isWeb2ApkPreference}
${orientationPreference ? `${orientationPreference}\n` : ""}${backgroundPreference ? `${backgroundPreference}\n` : ""}

  <platform name="android">
${platformItems || "    <!-- Extra Android options are generated here. -->"}
  </platform>
</widget>
`;
}

async function writeConfigXml(configPath, options) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, renderConfigXml(options), "utf8");
}

module.exports = {
  renderConfigXml,
  writeConfigXml
};
