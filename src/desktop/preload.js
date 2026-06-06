"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("html2apkDesktop", {
  appInfo: () => ipcRenderer.invoke("app:info"),
  selectFolder: () => ipcRenderer.invoke("dialog:select-folder"),
  selectIcon: () => ipcRenderer.invoke("dialog:select-icon"),
  selectKeystore: () => ipcRenderer.invoke("dialog:select-keystore"),
  inspectProject: (projectRoot) => ipcRenderer.invoke("project:inspect", projectRoot),
  listProjectFiles: (projectRoot) => ipcRenderer.invoke("project:list-files", projectRoot),
  readProjectFile: (projectRoot, relativePath) => ipcRenderer.invoke("project:read-file", projectRoot, relativePath),
  writeProjectFile: (projectRoot, relativePath, content) => ipcRenderer.invoke("project:write-file", projectRoot, relativePath, content),
  createProjectFile: (projectRoot, relativePath) => ipcRenderer.invoke("project:create-file", projectRoot, relativePath),
  watchProject: (projectRoot) => ipcRenderer.invoke("project:watch", projectRoot),
  unwatchProject: () => ipcRenderer.invoke("project:unwatch"),
  runDoctor: (projectRoot) => ipcRenderer.invoke("doctor:run", projectRoot),
  installAndroidRequirements: () => ipcRenderer.invoke("install:android-requirements"),
  runBuild: (options) => ipcRenderer.invoke("build:run", options),
  runUsbDebugBuild: (options) => ipcRenderer.invoke("build:run-usb-debug", options),
  runNativeFunctionLab: () => ipcRenderer.invoke("codes:run-function-lab"),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),
  showItem: (targetPath) => ipcRenderer.invoke("shell:show-item", targetPath),
  openExternalUrl: (targetUrl) => ipcRenderer.invoke("shell:open-external", targetUrl),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  setWindowTheme: (theme) => ipcRenderer.invoke("window:set-theme", theme),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onBuildLog: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("build:log", handler);
    return () => ipcRenderer.removeListener("build:log", handler);
  },
  onInstallLog: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("install:log", handler);
    return () => ipcRenderer.removeListener("install:log", handler);
  },
  onProjectChanged: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("project:changed", handler);
    return () => ipcRenderer.removeListener("project:changed", handler);
  },
  onProjectWatchError: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("project:watch-error", handler);
    return () => ipcRenderer.removeListener("project:watch-error", handler);
  }
});
