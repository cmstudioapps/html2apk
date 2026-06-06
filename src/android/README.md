# Android Native Layer

The production Android implementation is generated as a local Cordova plugin from:

`src/templates/cordova-plugin-html2apk-bridge/src/android`

Keeping the Android source inside the template lets each build copy a self-contained plugin into the temporary Cordova project. This directory exists as the top-level Android ownership boundary for future native modules, build hooks, signing helpers, and Android-specific orchestration.
