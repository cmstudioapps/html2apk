#!/usr/bin/env node
"use strict";

const { runCli } = require("../src/cli");

runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.stack ? error.stack : String(error);
  console.error(message);
  if (error && Array.isArray(error.logs) && error.logs.length > 0) {
    console.error("\nhtml2apk logs:");
    for (const line of error.logs) {
      console.error(line);
    }
  }
  if (error && error.buildDir) {
    console.error(`\nBuild directory kept: ${error.buildDir}`);
  }
  process.exitCode = 1;
});
