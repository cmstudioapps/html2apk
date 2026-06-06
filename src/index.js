"use strict";

const { buildApk } = require("./core/build-apk");
const { loadProjectConfig, resolveBuildOptions } = require("./core/config");
const { runDoctor } = require("./runtime-manager/doctor");

module.exports = {
  buildApk,
  loadProjectConfig,
  resolveBuildOptions,
  runDoctor
};
