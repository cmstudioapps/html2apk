"use strict";

const { spawn } = require("child_process");
const path = require("path");

function pathDelimiter() {
  return process.platform === "win32" ? ";" : ":";
}

function packageBinPath() {
  return path.resolve(__dirname, "..", "..", "node_modules", ".bin");
}

function withLocalBin(env) {
  const nextEnv = { ...env };
  const key = Object.prototype.hasOwnProperty.call(nextEnv, "Path") ? "Path" : "PATH";
  const current = nextEnv[key] || "";
  const localBin = packageBinPath();
  const parts = current.split(pathDelimiter()).filter(Boolean);

  if (!parts.includes(localBin)) {
    nextEnv[key] = [localBin, ...parts].join(pathDelimiter());
  }

  return nextEnv;
}

function quoteForCmd(value) {
  const text = String(value);
  if (text.length === 0) {
    return "\"\"";
  }

  if (/^[a-zA-Z0-9_@./:\\=+\-]+$/.test(text)) {
    return text;
  }

  return `"${text.replace(/(["^&|<>])/g, "^$1")}"`;
}

function createSpawnSpec(command, args) {
  const needsCmdShim = process.platform === "win32" && new Set(["cordova", "gradle"]).has(command);
  if (!needsCmdShim) {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args.map(quoteForCmd)].join(" ")]
  };
}

function createCommandRunner({ logs = [], env = process.env, onLog } = {}) {
  const baseEnv = withLocalBin(env);

  function log(line) {
    logs.push(line);
    if (typeof onLog === "function") {
      onLog(line);
    }
  }

  async function run(command, args = [], options = {}) {
    const pretty = `${command} ${args.join(" ")}`.trim();
    log(`$ ${pretty}`);
    const spawnSpec = createSpawnSpec(command, args);

    return new Promise((resolve, reject) => {
      const child = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: options.cwd,
        env: { ...baseEnv, ...(options.env || {}) },
        stdio: ["ignore", "pipe", "pipe"],
        shell: false
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        if (options.pipeOutput) {
          process.stdout.write(text);
        }
      });

      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (options.pipeOutput) {
          process.stderr.write(text);
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to run "${pretty}": ${error.message}`));
      });

      child.on("close", (code) => {
        const summary = [stdout, stderr].join("\n").trim();
        if (summary) {
          log(summary.slice(-4000));
        }

        if (code === 0) {
          resolve({ code, stdout, stderr });
          return;
        }

        const error = new Error(`Command failed (${code}): ${pretty}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        if (summary) {
          error.message = `${error.message}\n${summary.slice(-4000)}`;
        }
        reject(error);
      });
    });
  }

  return { run, logs };
}

module.exports = {
  createCommandRunner
};
