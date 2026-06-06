"use strict";

const path = require("path");
const { copyDirectory, removePath } = require("../utils/fs-extra");

async function installBridgePlugin(buildDir) {
  const source = path.resolve(__dirname, "..", "templates", "cordova-plugin-html2apk-bridge");
  const destination = path.join(buildDir, "html2apk-bridge-plugin");
  await removePath(destination);
  await copyDirectory(source, destination, () => false);
  return destination;
}

module.exports = {
  installBridgePlugin
};
