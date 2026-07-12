"use strict";

const api = window.html2apkDesktop;

const i18n = {
  pt: {
    creditTitle: "Creditos iniciais",
    creditText: "Criado por Dev Caio Multiversando",
    navHome: "Inicio",
    navSettings: "Configuracoes",
    navAppearance: "Aparencia",
    navBuild: "Build",
    navFiles: "Arquivos",
    navCodes: "Codigos",
    navLogs: "Logs",
    navLogcat: "Android",
    navHelp: "Ajuda",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Escuro",
    homeEyebrow: "Comece aqui",
    homeTitle: "Arraste a pasta do projeto para o html2apk",
    chooseFolder: "Escolher pasta",
    dropTitle: "Solte a pasta do seu projeto HTML aqui",
    dropText: "Depois confirme o build. O APK sera salvo em dist.",
    indexHint: "A pasta deve conter index.html ou configurar entryFile no app.json",
    project: "Projeto",
    configHint: "Configuracao detectada",
    runDoctor: "Verificar ambiente",
    confirmBuild: "Confirmar e gerar APK",
    continueSettings: "Continuar para configuracoes",
    settingsEyebrow: "Antes de compilar",
    settingsTitle: "Configuracoes do build",
    appName: "Nome do app",
    packageId: "Package ID",
    appVersion: "Versao do app",
    url: "URL do Site (Web2Apk)",
    urlHint: "Se preenchido, o app ira carregar este site em vez de arquivos locais.",
    buildFormat: "Formato",
    formatApk: "APK",
    formatAab: "AAB",
    buildFormatHint: "APK para instalar direto; AAB para loja.",
    mode: "Modo",
    chooseMode: "Escolha o modo",
    modeFullscreen: "Tela cheia",
    modeStandalone: "Normal",
    modeFloating: "Flutuante",
    orientation: "Orientacao",
    orientationDefault: "Automatico",
    orientationPortrait: "Vertical",
    orientationLandscape: "Horizontal",
    minSdkVersion: "Android minimo",
    endpointNotification: "Endpoint de Notificacao (Opcional)",
    endpointNotificationHint: "O APK vai checar este link para baixar push notifications.",
    timeNotification: "Intervalo de Polling (Segundos)",
    timeNotificationHint: "Tempo em segundos (Minimo: 30s) para o App consultar novas notificacoes.",
    appIcon: "Icone do app",
    appThemeColor: "Cor do tema/fallback",
    themeMode: "Tema do APK",
    themeModeFixed: "Cor fixa",
    themeModeAuto: "Automatico pela tela",
    oneSignalAppId: "OneSignal App ID",
    oneSignalAppIdHint: "Opcional. Use o App ID do OneSignal, nao a REST API Key.",
    androidPermissions: "Permissoes Android",
    chooseIcon: "Trocar icone PNG",
    keystoreTitle: "Assinatura / keystore",
    keystoreFile: "Arquivo keystore",
    chooseKeystore: "Escolher",
    keystoreAlias: "Alias",
    keystoreStorePassword: "Senha da store",
    keystoreKeyPassword: "Senha da key",
    keystoreHint: "Opcional para APK debug. Para AAB/release, preencha para assinar o arquivo.",
    reviewBuild: "Revisar build",
    debugBuild: "Debug tecnico",
    debugBuildText: "Mantem a pasta Cordova temporaria para inspecao.",
    runtimeLogsBuild: "Console no APK",
    runtimeLogsBuildText: "Mostra um modal Console no app gerado para depurar erros e funcoes interpretadas.",
    releaseBuild: "Release",
    releaseBuildText: "Usa configuracao de assinatura se houver keystore.",
    appearanceEyebrow: "Preferencias",
    appearanceTitle: "Idioma e tema",
    filesEyebrow: "Editor visual",
    filesTitle: "Arquivos do projeto",
    fileTreeTitle: "Pastas e arquivos",
    newFile: "Novo arquivo",
    saveFile: "Salvar",
    noFileSelected: "Nenhum arquivo selecionado",
    syntaxPreview: "Previa com sintaxe",
    newFilePrompt: "Digite o caminho do novo arquivo dentro do projeto:",
    fileSaved: "Arquivo salvo",
    fileCreated: "Arquivo criado",
    fileOpenFail: "Nao foi possivel abrir o arquivo",
    fileSaveFail: "Nao foi possivel salvar o arquivo",
    unsavedFileConfirm: "Ha alteracoes nao salvas. Deseja trocar de arquivo mesmo assim?",
    language: "Idioma",
    languageText: "Escolha como os feedbacks aparecem durante o build.",
    themeText: "O botao tambem fica na barra lateral para acesso rapido.",
    toggleTheme: "Alternar tema",
    buildEyebrow: "Revisao",
    buildTitle: "Confirme as informacoes e gere o APK",
    startBuild: "Gerar APK",
    startUsbDebug: "Testar no USB",
    stepFolder: "Pasta recebida",
    stepSettings: "Configuracoes completas",
    stepDoctor: "Ambiente verificado",
    stepBuild: "APK gerado",
    apkReady: "APK pronto",
    openDist: "Abrir dist",
    showApk: "Mostrar APK",
    logsEyebrow: "Ao vivo",
    logsTitle: "Logs do processo",
    codesEyebrow: "Bridge nativa",
    codesTitle: "Codigos interpretados",
    codesIntro: "Use estes blocos no JavaScript do seu projeto. O html2apk espera o Android ficar pronto, pede permissoes quando precisar e abre a configuracao certa quando o Android bloquear o pop-up.",
    testNativeFunctions: "Testar funcoes",
    functionLabRunning: "Gerando app de teste e abrindo no USB",
    functionLabOk: "App de teste aberto no celular",
    functionLabFail: "Nao foi possivel testar as funcoes",
    functionLabProject: "App de teste criado",
    functionLabSettings: "Configuracao de teste pronta",
    functionLabUsbCheck: "Conferindo celular USB",
    functionLabSuccessTitle: "App de teste aberto no celular",
    functionLabSuccessText: "Use o celular conectado para experimentar as funcoes interpretadas e ver os retornos no proprio app.",
    codesAll: "Tudo",
    codesAllText: "Todas as funcoes interpretadas disponiveis no APK.",
    codesFeedback: "Feedback",
    codesFeedbackText: "Mensagens rapidas, vibracao e retornos simples.",
    codesNotifications: "Notificacoes",
    codesNotificationsText: "Notificacoes locais, agendamentos, loops e push remoto.",
    codesPermissionsEvents: "Permissoes e eventos",
    codesPermissionsEventsText: "Permissoes manuais, ciclo de vida, deep links e listeners nativos.",
    codesMedia: "Midia e hardware",
    codesMediaText: "Camera, QR Code, microfone, lanterna, imagens e videos.",
    codesFiles: "Arquivos e dados",
    codesFilesText: "Seletores, salvamento, CRUD interno, downloads e abertura de arquivos.",
    codesShareNav: "Compartilhar e abrir",
    codesShareNavText: "Compartilhamento, clipboard, URLs, WhatsApp, discador e mapas.",
    codesDevice: "Tela e diagnostico",
    codesDeviceText: "Tela ligada, brilho, tema, aparelho, rede, bateria, memoria e modo flutuante.",
    codesSecurity: "Localizacao e seguranca",
    codesSecurityText: "GPS, biometria e dados cifrados pelo Android Keystore.",
    codesShowing: "Mostrando",
    codesItems: "funcoes",
    javaLabel: "Motor nativo",
    doesLabel: "O que faz",
    whenUseLabel: "Quando usar",
    returnsLabel: "Retorno",
    handlingLabel: "Como tratar",
    exampleLabel: "Exemplo copiavel",
    copyCode: "Copiar",
    copiedCode: "Copiado",
    copyFailed: "Nao foi possivel copiar",
    clearLogs: "Limpar logs",
    helpEyebrow: "Sem misterio",
    helpTitle: "Doctor, build e dependencias",
    helpDoctor: "Verifica se Java, Gradle, Cordova e Android SDK estao prontos. Nao gera APK.",
    helpBuild: "Cria um projeto Cordova temporario, copia seu app web e gera o arquivo APK em dist.",
    helpDepsTitle: "Dependencias no EXE",
    helpDeps: "O executavel empacota html2apk, a interface e dependencias Node/Cordova. Se faltarem pacotes Android, ele pede permissao e tenta instalar; JDK/Gradle podem exigir instalacao do sistema.",
    helpCreatorTitle: "Criador",
    helpCreatorText: "Conheca o Dev Caio Multiversando, criador desta linda aplicacao html2apk.",
    openInstagram: "Conhecer o dev",
    ready: "Pronto",
    selected: "Selecionado",
    missing: "Nao encontrado",
    detected: "Detectado",
    notDetected: "Nao detectado",
    folderReady: "Pasta pronta para build",
    urlReady: "URL definida",
    missingUrl: "Aguardando URL",
    importJsonTitle: "Importar app.json",
    chooseProjectFirst: "Escolha uma pasta primeiro",
    doctorRunning: "Verificando ambiente",
    doctorOk: "Ambiente pronto",
    doctorFail: "Ambiente incompleto",
    buildRunning: "Gerando APK",
    buildOk: "APK gerado com sucesso",
    buildFail: "Build falhou",
    usbDebugRunning: "Gerando e instalando no celular USB",
    usbDebugOk: "APK instalado no celular USB",
    usbDebugFail: "Teste USB falhou",
    droppedFolder: "Pasta recebida",
    noFolderDrop: "Solte uma pasta do projeto",
    projectLoaded: "Projeto carregado",
    projectAutoUpdated: "Projeto atualizado automaticamente",
    projectConfigReloaded: "Configuracoes recarregadas do projeto",
    projectWatcherFail: "Nao foi possivel acompanhar alteracoes da pasta",
    logsCleared: "Logs limpos",
    settingsOk: "Configuracoes completas",
    settingsMissing: "Complete as configuracoes obrigatorias",
    requiredFieldsTitle: "Antes de gerar o APK, corrija:",
    missingProject: "Escolha a pasta do projeto.",
    missingAppName: "Informe o nome do app.",
    invalidPackageId: "Informe um Package ID valido, exemplo: com.seuapp.meuapp.",
    invalidVersion: "Informe a versao no formato 1.0.0.",
    missingMode: "Escolha o modo do app.",
    defaultIcon: "Icone padrao do html2apk",
    invalidIconType: "Use um icone PNG para evitar falhas no Android.",
    invalidThemeColor: "Use uma cor hexadecimal valida, exemplo: #126fff.",
    invalidOneSignalAppId: "Use um OneSignal App ID valido ou deixe vazio.",
    invalidMinSdkVersion: "Escolha uma versao minima do Android entre API 24 e API 36.",
    missingKeystoreForAab: "Para gerar AAB, informe o arquivo keystore, alias e senhas.",
    incompleteKeystore: "Complete arquivo keystore, alias, senha da store e senha da key.",
    iconSelected: "Icone selecionado",
    keystoreSelected: "Keystore selecionado",
    progressLabel: "Progresso",
    progressIdle: "Aguardando pasta",
    progressFolder: "Pasta recebida",
    progressSettings: "Configuracoes prontas",
    progressDoctor: "Verificando ambiente",
    progressBuild: "Gerando APK",
    progressDone: "APK pronto",
    progressError: "Algo precisa de atencao",
    environmentPreparing: "Verificando ambiente antes de avancar",
    environmentNeedsInstall: "Pacotes Android ausentes. O app vai pedir permissao para instalar.",
    environmentInstalling: "Instalando pacotes Android",
    environmentInstallOk: "Pacotes Android instalados",
    environmentInstallFail: "Nao foi possivel instalar os pacotes Android",
    environmentCanceled: "Instalacao cancelada",
    environmentBlocked: "Corrija o ambiente para continuar",
    bottomLogsTitle: "Logs ao vivo",
    showLogs: "Mostrar logs",
    hideLogs: "Ocultar logs",
    successEyebrow: "Concluido",
    successTitle: "APK gerado com sucesso",
    successText: "Seu arquivo Android esta pronto na pasta dist.",
    usbSuccessTitle: "APK instalado no celular",
    usbSuccessText: "O build debug foi enviado por USB. O app deve abrir no aparelho conectado.",
    newBuild: "Novo build",
    logcatEyebrow: "Dispositivo USB",
    logcatTitle: "Logs do Android",
    startLogcat: "Iniciar Captura"
  },
  en: {
    creditTitle: "Opening credits",
    creditText: "Created by Dev Caio Multiversando",
    navHome: "Home",
    navSettings: "Settings",
    navAppearance: "Appearance",
    navBuild: "Build",
    navFiles: "Files",
    navCodes: "Code",
    navLogs: "Logs",
    navLogcat: "Android",
    navHelp: "Help",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    homeEyebrow: "Start here",
    homeTitle: "Drag your project folder into html2apk",
    chooseFolder: "Choose folder",
    dropTitle: "Drop your HTML project folder here",
    dropText: "Then confirm the build. The APK will be saved in dist.",
    indexHint: "The folder must contain index.html or configure entryFile in app.json",
    project: "Project",
    configHint: "Configuration detected",
    runDoctor: "Check environment",
    confirmBuild: "Confirm and build APK",
    continueSettings: "Continue to settings",
    settingsEyebrow: "Before compiling",
    settingsTitle: "Build settings",
    appName: "App name",
    packageId: "Package ID",
    appVersion: "App version",
    url: "Website URL (Web2Apk)",
    urlHint: "If set, the app will load this remote site instead of local files.",
    buildFormat: "Format",
    formatApk: "APK",
    formatAab: "AAB",
    buildFormatHint: "APK to install directly; AAB for stores.",
    mode: "Mode",
    chooseMode: "Choose mode",
    modeFullscreen: "Fullscreen",
    modeStandalone: "Normal",
    modeFloating: "Floating",
    orientation: "Orientation",
    orientationDefault: "Automatic",
    orientationPortrait: "Portrait",
    orientationLandscape: "Landscape",
    minSdkVersion: "Minimum Android",
    endpointNotification: "Notification Endpoint (Optional)",
    endpointNotificationHint: "The APK will check this link to download push notifications.",
    timeNotification: "Polling Interval (Seconds)",
    timeNotificationHint: "Time in seconds (Min: 30s) for the App to fetch new notifications.",
    appIcon: "App icon",
    appThemeColor: "Theme/fallback color",
    themeMode: "APK theme",
    themeModeFixed: "Fixed color",
    themeModeAuto: "Auto from screen",
    oneSignalAppId: "OneSignal App ID",
    oneSignalAppIdHint: "Optional. Use the OneSignal App ID, not the REST API Key.",
    androidPermissions: "Android permissions",
    chooseIcon: "Change PNG icon",
    keystoreTitle: "Signing / keystore",
    keystoreFile: "Keystore file",
    chooseKeystore: "Choose",
    keystoreAlias: "Alias",
    keystoreStorePassword: "Store password",
    keystoreKeyPassword: "Key password",
    keystoreHint: "Optional for debug APK. For AAB/release, fill this to sign the file.",
    reviewBuild: "Review build",
    debugBuild: "Technical debug",
    debugBuildText: "Keeps the temporary Cordova folder for inspection.",
    runtimeLogsBuild: "APK console",
    runtimeLogsBuildText: "Shows a Console modal in the generated app to debug errors and interpreted functions.",
    releaseBuild: "Release",
    releaseBuildText: "Uses signing configuration when a keystore exists.",
    appearanceEyebrow: "Preferences",
    appearanceTitle: "Language and theme",
    filesEyebrow: "Visual editor",
    filesTitle: "Project files",
    fileTreeTitle: "Folders and files",
    newFile: "New file",
    saveFile: "Save",
    noFileSelected: "No file selected",
    syntaxPreview: "Syntax preview",
    newFilePrompt: "Enter the new file path inside the project:",
    fileSaved: "File saved",
    fileCreated: "File created",
    fileOpenFail: "Could not open the file",
    fileSaveFail: "Could not save the file",
    unsavedFileConfirm: "There are unsaved changes. Switch files anyway?",
    language: "Language",
    languageText: "Choose how feedback appears during the build.",
    themeText: "The button also stays in the sidebar for quick access.",
    toggleTheme: "Toggle theme",
    buildEyebrow: "Review",
    buildTitle: "Confirm the information and build the APK",
    startBuild: "Build APK",
    startUsbDebug: "Test on USB",
    stepFolder: "Folder received",
    stepSettings: "Settings complete",
    stepDoctor: "Environment checked",
    stepBuild: "APK generated",
    apkReady: "APK ready",
    openDist: "Open dist",
    showApk: "Show APK",
    logsEyebrow: "Live",
    logsTitle: "Process logs",
    codesEyebrow: "Native bridge",
    codesTitle: "Interpreted code",
    codesIntro: "Use these blocks in your project JavaScript. html2apk waits for Android to be ready, asks permissions when needed and opens the right settings screen when Android blocks the prompt.",
    testNativeFunctions: "Test functions",
    functionLabRunning: "Generating test app and opening it over USB",
    functionLabOk: "Test app opened on the phone",
    functionLabFail: "Could not test the functions",
    functionLabProject: "Test app created",
    functionLabSettings: "Test settings ready",
    functionLabUsbCheck: "Checking USB phone",
    functionLabSuccessTitle: "Test app opened on the phone",
    functionLabSuccessText: "Use the connected phone to try the interpreted functions and see the results inside the app.",
    codesAll: "All",
    codesAllText: "All interpreted functions available in the APK.",
    codesFeedback: "Feedback",
    codesFeedbackText: "Short messages, vibration and simple native feedback.",
    codesNotifications: "Notifications",
    codesNotificationsText: "Local notifications, schedules, loops and remote push.",
    codesPermissionsEvents: "Permissions and events",
    codesPermissionsEventsText: "Manual permissions, lifecycle, deep links and native listeners.",
    codesMedia: "Media and hardware",
    codesMediaText: "Camera, QR Code, microphone, flashlight, images and videos.",
    codesFiles: "Files and data",
    codesFilesText: "Pickers, saving, internal CRUD, downloads and file opening.",
    codesShareNav: "Share and open",
    codesShareNavText: "Sharing, clipboard, URLs, WhatsApp, dialer and maps.",
    codesDevice: "Screen and diagnostics",
    codesDeviceText: "Keep awake, brightness, theme, device, network, battery, memory and floating mode.",
    codesSecurity: "Location and security",
    codesSecurityText: "GPS, biometrics and Android Keystore encrypted data.",
    codesShowing: "Showing",
    codesItems: "functions",
    javaLabel: "Native engine",
    doesLabel: "What it does",
    whenUseLabel: "When to use",
    returnsLabel: "Returns",
    handlingLabel: "How to handle",
    exampleLabel: "Copyable example",
    copyCode: "Copy",
    copiedCode: "Copied",
    copyFailed: "Could not copy",
    clearLogs: "Clear logs",
    helpEyebrow: "Plain and simple",
    helpTitle: "Doctor, build and dependencies",
    helpDoctor: "Checks whether Java, Gradle, Cordova and Android SDK are ready. It does not generate an APK.",
    helpBuild: "Creates a temporary Cordova project, copies your web app and generates the APK in dist.",
    helpDepsTitle: "Dependencies in the EXE",
    helpDeps: "The executable bundles html2apk, the interface and Node/Cordova dependencies. If Android packages are missing, it asks permission and tries to install them; JDK/Gradle may still require system installation.",
    helpCreatorTitle: "Creator",
    helpCreatorText: "Meet Dev Caio Multiversando, creator of this lovely html2apk app.",
    openInstagram: "Meet the dev",
    ready: "Ready",
    selected: "Selected",
    missing: "Missing",
    detected: "Detected",
    notDetected: "Not detected",
    folderReady: "Folder ready for build",
    urlReady: "URL set",
    missingUrl: "Waiting for URL",
    importJsonTitle: "Import app.json",
    chooseProjectFirst: "Choose a folder first",
    doctorRunning: "Checking environment",
    doctorOk: "Environment ready",
    doctorFail: "Environment incomplete",
    buildRunning: "Building APK",
    buildOk: "APK generated successfully",
    buildFail: "Build failed",
    usbDebugRunning: "Building and installing on USB phone",
    usbDebugOk: "APK installed on USB phone",
    usbDebugFail: "USB test failed",
    droppedFolder: "Folder received",
    noFolderDrop: "Drop a project folder",
    projectLoaded: "Project loaded",
    projectAutoUpdated: "Project updated automatically",
    projectConfigReloaded: "Settings reloaded from project",
    projectWatcherFail: "Could not watch folder changes",
    logsCleared: "Logs cleared",
    settingsOk: "Settings complete",
    settingsMissing: "Complete the required settings",
    requiredFieldsTitle: "Before building the APK, fix:",
    missingProject: "Choose the project folder.",
    missingAppName: "Enter the app name.",
    invalidPackageId: "Enter a valid Package ID, example: com.yourapp.name.",
    invalidVersion: "Enter the version as 1.0.0.",
    missingMode: "Choose the app mode.",
    defaultIcon: "Default html2apk icon",
    invalidIconType: "Use a PNG icon to avoid Android build failures.",
    invalidThemeColor: "Use a valid hex color, example: #126fff.",
    invalidOneSignalAppId: "Use a valid OneSignal App ID or leave it empty.",
    invalidMinSdkVersion: "Choose a minimum Android version between API 24 and API 36.",
    missingKeystoreForAab: "To build AAB, enter the keystore file, alias and passwords.",
    incompleteKeystore: "Complete keystore file, alias, store password and key password.",
    iconSelected: "Icon selected",
    keystoreSelected: "Keystore selected",
    progressLabel: "Progress",
    progressIdle: "Waiting for folder",
    progressFolder: "Folder received",
    progressSettings: "Settings ready",
    progressDoctor: "Checking environment",
    progressBuild: "Building APK",
    progressDone: "APK ready",
    progressError: "Something needs attention",
    environmentPreparing: "Checking the environment before continuing",
    environmentNeedsInstall: "Android packages are missing. The app will ask permission to install them.",
    environmentInstalling: "Installing Android packages",
    environmentInstallOk: "Android packages installed",
    environmentInstallFail: "Could not install Android packages",
    environmentCanceled: "Installation canceled",
    environmentBlocked: "Fix the environment to continue",
    bottomLogsTitle: "Live logs",
    showLogs: "Show logs",
    hideLogs: "Hide logs",
    successEyebrow: "Complete",
    successTitle: "APK generated successfully",
    successText: "Your Android file is ready in the dist folder.",
    usbSuccessTitle: "APK installed on phone",
    usbSuccessText: "Debug build was sent via USB. The app should open on the connected device.",
    newBuild: "New build",
    logcatEyebrow: "USB Device",
    logcatTitle: "Android Logs",
    startLogcat: "Start Capture"
  }
};

const animatedBuildLines = [
  "Preparando projeto / Preparing project",
  "Conferindo app.json / Reading app.json",
  "Montando projeto Cordova / Creating Cordova project",
  "Copiando HTML, CSS e JS / Copying HTML, CSS and JS",
  "Instalando bridge nativa / Installing native bridge",
  "Chamando Gradle / Calling Gradle",
  "Procurando APK final / Finding final APK"
];

const DEFAULT_PERMISSIONS = ["INTERNET", "POST_NOTIFICATIONS", "VIBRATE"];
const DEFAULT_MIN_SDK_VERSION = 24;
const MIN_SDK_OPTIONS = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
const DEVELOPER_INSTAGRAM_URL = "https://www.instagram.com/caiomutiversando?igsh=MWFpcmYzZDB3YTNzZQ==";

const permissionOptions = [
  {
    value: "INTERNET",
    label: { pt: "Internet", en: "Internet" },
    detail: { pt: "Acesso a rede", en: "Network access" }
  },
  {
    value: "POST_NOTIFICATIONS",
    label: { pt: "Notificacoes", en: "Notifications" },
    detail: { pt: "Android 13+", en: "Android 13+" }
  },
  {
    value: "VIBRATE",
    label: { pt: "Vibracao", en: "Vibration" },
    detail: { pt: "Permite vibrar", en: "Allows vibration" }
  },
  {
    value: "SET_WALLPAPER",
    label: { pt: "Papel de parede", en: "Wallpaper" },
    detail: { pt: "Permite definir imagem estatica", en: "Allows setting a static image" }
  },
  {
    value: "CAMERA",
    label: { pt: "Camera", en: "Camera" },
    detail: { pt: "Captura de imagem", en: "Image capture" }
  },
  {
    value: "RECORD_AUDIO",
    label: { pt: "Microfone", en: "Microphone" },
    detail: { pt: "Captura de audio", en: "Audio capture" }
  },
  {
    value: "ACCESS_FINE_LOCATION",
    label: { pt: "Localizacao precisa", en: "Precise location" },
    detail: { pt: "GPS e rede", en: "GPS and network" }
  },
  {
    value: "ACCESS_COARSE_LOCATION",
    label: { pt: "Localizacao aproximada", en: "Approximate location" },
    detail: { pt: "Rede", en: "Network" }
  },
  {
    value: "SYSTEM_ALERT_WINDOW",
    label: { pt: "Sobrepor apps", en: "Draw over apps" },
    detail: { pt: "Necessaria para icone flutuante", en: "Required for floating icon" }
  }
];

const nativeCodeCategories = [
  { id: "all", title: { pt: "Tudo", en: "All" }, description: { pt: "Todas as funcoes interpretadas disponiveis no APK.", en: "All interpreted functions available in the APK." } },
  { id: "feedback", title: { pt: "Feedback", en: "Feedback" }, description: { pt: "Mensagens rapidas, vibracao e retornos simples.", en: "Short messages, vibration and simple native feedback." } },
  { id: "notifications", title: { pt: "Notificacoes", en: "Notifications" }, description: { pt: "Notificacoes locais, agendamentos, loops e push remoto.", en: "Local notifications, schedules, loops and remote push." } },
  { id: "permissions", title: { pt: "Permissoes e eventos", en: "Permissions and events" }, description: { pt: "Permissoes manuais, ciclo de vida, deep links e listeners nativos.", en: "Manual permissions, lifecycle, deep links and native listeners." } },
  { id: "media", title: { pt: "Midia e hardware", en: "Media and hardware" }, description: { pt: "Camera, QR Code, microfone, lanterna, imagens e videos.", en: "Camera, QR Code, microphone, flashlight, images and videos." } },
  { id: "wallpaper", title: { pt: "Papel de parede", en: "Wallpaper" }, description: { pt: "Imagem estatica na tela inicial/bloqueio e atalho para ajustes nativos.", en: "Static images for home/lock screen and shortcut to native settings." } },
  { id: "files", title: { pt: "Arquivos e dados", en: "Files and data" }, description: { pt: "Seletores, salvamento, CRUD interno, downloads e abertura de arquivos.", en: "Pickers, saving, internal CRUD, downloads and file opening." } },
  { id: "share", title: { pt: "Compartilhar e abrir", en: "Share and open" }, description: { pt: "Compartilhamento, clipboard, URLs, WhatsApp, discador e mapas.", en: "Sharing, clipboard, URLs, WhatsApp, dialer and maps." } },
  { id: "device", title: { pt: "Tela e diagnostico", en: "Screen and diagnostics" }, description: { pt: "Tela ligada, brilho, tema, aparelho, rede, bateria, memoria e modo flutuante.", en: "Keep awake, brightness, theme, device, network, battery, memory and floating mode." } },
  { id: "security", title: { pt: "Localizacao e seguranca", en: "Location and security" }, description: { pt: "GPS, biometria e dados cifrados pelo Android Keystore.", en: "GPS, biometrics and Android Keystore encrypted data." } }
];

const nativeCodeEntries = [
  {
    syntax: { pt: "toast('Mensagem')", en: "toast('Message')" },
    java: "toast",
    description: { pt: "Mostra uma mensagem rapida nativa.", en: "Shows a native short message." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "Use com `await` quando a proxima acao depender do feedback; coloque em `try/catch` se quiser mostrar erro ao usuario.", en: "Use `await` when the next action depends on the feedback; wrap in `try/catch` if you want to show an error to the user." }
  },
  {
    syntax: { pt: "vibrar(250)", en: "vibrate(250)" },
    java: "vibrate",
    description: { pt: "Aciona a vibracao do aparelho por milissegundos.", en: "Vibrates the device for milliseconds." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "Limite duracoes longas e deixe a permissao `VIBRATE` no app; se falhar, siga sem bloquear o fluxo principal.", en: "Keep long durations under control and include the `VIBRATE` permission; if it fails, continue without blocking the main flow." }
  },
  {
    syntax: { pt: "aguardar(5000) / loading(5000)", en: "loading(5000)" },
    java: "JavaScript timer",
    description: { pt: "Cria uma pausa assincrona entre linhas de codigo usando Promise.", en: "Creates an asynchronous pause between code lines using a Promise." },
    returns: { pt: "{ ok, ms } depois do intervalo.", en: "{ ok, ms } after the interval." },
    handling: { pt: "Use com `await` para esperar sem travar a WebView. O tempo e em milissegundos.", en: "Use with `await` to wait without blocking the WebView. The time is in milliseconds." }
  },
  {
    syntax: { pt: "notificar({ titulo, texto, aoClicar?, acoes?, open? })", en: "notify({ title, text, onClick?, actions?, open? })" },
    java: "notify",
    description: { pt: "Cria notificacao Android imediata. So `titulo` e `texto` ja bastam; `aoClicar`, `acoes` e `open` sao opcionais.", en: "Creates an immediate Android notification. `title` and `text` are enough; `onClick`, `actions` and `open` are optional." },
    returns: { pt: "Promise<void>; cliques chegam em `aoEvento('notificacao:clicada')` ou `aoClicarNotificacao()` e tambem podem executar `aoClicar` automaticamente.", en: "Promise<void>; clicks arrive through `onEvent('notification:clicked')` or `onNotificationClick()` and can also run `onClick` automatically." },
    handling: { pt: "Use `aoClicar: () => funcao()` enquanto o app esta vivo. Para agendada ou app fechado, prefira `aoClicar: { funcao, argumentos }`. `open:false` evita abrir a tela; JavaScript so roda assim se o app ainda estiver vivo, mas acoes externas como `abrirForaDoApp` funcionam por fallback nativo.", en: "Use `onClick: () => functionName()` while the app process is alive. For scheduled notifications or a closed app, prefer `onClick: { functionName, args }`. `open:false` avoids opening the screen; JavaScript only runs this way if the app is still alive, but external actions like `openOutsideApp` work through a native fallback." }
  },
  {
    syntax: { pt: "agendarNotificacao({ titulo, texto, quando }) / agendarNotificacoes([...])", en: "scheduleNotification({ title, text, when }) / scheduleNotifications([...])" },
    java: "scheduleNotification",
    description: { pt: "Agenda uma notificacao ou uma lista de notificacoes mesmo com o app fechado.", en: "Schedules one notification or a list of notifications even when the app is closed." },
    returns: { pt: "Uma notificacao retorna { id, when }; varias retornam Promise<Array> com esses objetos.", en: "One notification returns { id, when }; multiple notifications return Promise<Array> with those objects." },
    handling: { pt: "`quando`/`when` deve ser timestamp em ms. Para varias, passe array; cada item ganha `id` automatico se voce nao informar. Se precisar de horario exato, confira `podeAgendarNotificacaoExata()`.", en: "`when`/`quando` must be a millisecond timestamp. For multiple, pass an array; each item gets an automatic `id` if you do not provide one. For exact timing, check `canScheduleExactAlarms()`." }
  },
  {
    syntax: { pt: "agendarLoopNotificacoes({ aCada: '12h', notificacoes: [...] })", en: "scheduleNotificationLoop({ every: '12h', notifications: [...] })" },
    java: "AlarmManager + NotificationStore",
    description: { pt: "Cria um loop de notificacoes que continua funcionando com o app fechado e alterna os itens da lista.", en: "Creates a notification loop that keeps working with the app closed and rotates through the list items." },
    returns: { pt: "{ id, when, repeating, loop }. Guarde o `id` para cancelar depois.", en: "{ id, when, repeating, loop }. Store the `id` to cancel later." },
    handling: { pt: "Cancele com `cancelarNotificacao(id)`. Se o clique precisar chamar funcao automaticamente mesmo apos o Android reabrir o app, use `funcao` + `argumentos` no `aoClicar`.", en: "Cancel with `cancelNotification(id)`. If the click must call a function automatically after Android reopens the app, use `functionName` + `args` in `onClick`." }
  },
  {
    syntax: { pt: "solicitarPermissaoNotificacoes()", en: "requestNotificationPermission()" },
    java: "requestNotificationPermission",
    description: { pt: "Pede permissao para mostrar notificacoes quando o Android exigir.", en: "Requests permission to show notifications when Android requires it." },
    returns: { pt: "{ permission, required, granted, requiresSettings, settingsOpened }.", en: "{ permission, required, granted, requiresSettings, settingsOpened }." },
    handling: { pt: "Se `granted` for falso, desative botoes de notificacao ou explique ao usuario como habilitar depois.", en: "If `granted` is false, disable notification buttons or explain how the user can enable it later." }
  },
  {
    syntax: { pt: "solicitarPermissaoPush() / aoClicarPush(fn)", en: "requestPushPermission() / onPushClick(fn)" },
    java: "onesignal-cordova-plugin",
    description: { pt: "Ativa push remoto via OneSignal quando o OneSignal App ID foi preenchido nas configuracoes.", en: "Enables remote push through OneSignal when the OneSignal App ID was filled in settings." },
    returns: { pt: "`solicitarPermissaoPush` retorna boolean. `aoClicarPush` retorna funcao para parar de escutar.", en: "`requestPushPermission` returns boolean. `onPushClick` returns an unsubscribe function." },
    handling: { pt: "Use esse caminho para notificacoes enviadas pelo painel/API do OneSignal. Nao coloque REST API Key dentro do APK; use `identificarUsuarioPush(id)` e `adicionarTagPush(chave, valor)` para segmentar usuarios.", en: "Use this path for notifications sent from the OneSignal dashboard/API. Do not put a REST API Key inside the APK; use `loginPushUser(id)` and `addPushTag(key, value)` to target users." }
  },
  {
    syntax: { pt: "statusPermissoes(['CAMERA'])", en: "permissionStatus(['CAMERA'])" },
    java: "permissionStatus",
    description: { pt: "Consulta se permissoes Android estao liberadas.", en: "Checks whether Android permissions are granted." },
    returns: { pt: "Objeto com permissao Android como chave e boolean como valor.", en: "Object with Android permission names as keys and booleans as values." },
    handling: { pt: "Use apenas para consultar. Para pedir permissao, chame a funcao real (`lanterna`, `ouvirMic`, `notificar`) ou a API manual correspondente.", en: "Use only to check. To request permission, call the real function (`flashlight`, `listenMic`, `notify`) or the matching manual API." }
  },
  {
    syntax: { pt: "aoEvento('app:background', fn)", en: "onEvent('app:background', fn)" },
    java: "dispatchEvent",
    description: { pt: "Escuta eventos nativos: app:pronto, app:background, app:voltou, botao:voltar, link:aberto, rede:mudou, bateria:mudou, usb:conectado, fone:conectado, volume:mudou, teclado:abriu, orientacao:mudou, celular:sacudido, print:tela, nfc:recebido, notificacao:recebida e notificacao:clicada.", en: "Listens to native events: app:ready, app:background, app:resumed, back:button, link:opened, network:changed, battery:changed, usb:connected, headphone:connected, volume:changed, keyboard:opened, orientation:changed, phone:shaken, screenshot:taken, nfc:received, notification:received and notification:clicked." },
    returns: { pt: "Funcao para cancelar a escuta.", en: "Unsubscribe function." },
    handling: { pt: "Guarde o retorno em `parar` e chame quando a tela/componente for desmontado para evitar escutas duplicadas.", en: "Store the return value as `stop` and call it when the screen/component unmounts to avoid duplicate listeners." }
  },
  {
    syntax: { pt: "aoMinimizar(fn) / aoVoltarParaApp(fn)", en: "onMinimize(fn) / onAppResume(fn)" },
    java: "lifecycle",
    description: { pt: "Atalhos para saber quando o app saiu da frente ou voltou.", en: "Shortcuts for knowing when the app left the foreground or resumed." },
    returns: { pt: "Funcao para cancelar a escuta.", en: "Unsubscribe function." },
    handling: { pt: "Pause timers, audio ou leitura pesada ao minimizar; ao voltar, confira se dados precisam ser recarregados.", en: "Pause timers, audio or heavy reads on minimize; on resume, check whether data should be refreshed." }
  },
  {
    syntax: { pt: "aoConectarUSB(fn) / aoDesconectarUSB(fn)", en: "onUSBConnect(fn) / onUSBDisconnect(fn)" },
    java: "UsbManager + BatteryManager",
    description: { pt: "Escuta conexão/desconexão USB por energia USB ou dispositivo USB/OTG anexado ao Android.", en: "Listens for USB connect/disconnect from USB power or USB/OTG devices attached to Android." },
    returns: { pt: "Callback recebe { conectado, origem, dispositivo? }. Retorna função para cancelar.", en: "Callback receives { connected, source, device? }. Returns an unsubscribe function." },
    handling: { pt: "Para cabo no computador, o evento vem como origem `power`; para OTG, vem com dados do dispositivo quando o Android entregar.", en: "For a computer cable, the event source is `power`; for OTG, device data is included when Android provides it." }
  },
  {
    syntax: { pt: "aoConectarFone(fn) / aoDesconectarFone(fn)", en: "onHeadphoneConnect(fn) / onHeadphoneDisconnect(fn)" },
    java: "AudioManager",
    description: { pt: "Escuta fone com fio, Bluetooth, USB headset e aparelhos de áudio reconhecidos pelo Android.", en: "Listens for wired, Bluetooth, USB headset and other Android audio output devices." },
    returns: { pt: "Callback recebe { conectado, dispositivo? }. Retorna função para cancelar.", en: "Callback receives { connected, device? }. Returns an unsubscribe function." },
    handling: { pt: "Bluetooth pode chegar pelo callback de áudio quando vira saída de som; pare a escuta ao sair da tela.", en: "Bluetooth may arrive through the audio callback when it becomes an output device; stop listening when the screen unmounts." }
  },
  {
    syntax: { pt: "aoMudarVolume(fn)", en: "onVolumeChange(fn)" },
    java: "AudioManager + Settings Observer",
    description: { pt: "Escuta mudanças nos volumes de mídia, toque, notificação, alarme e chamada.", en: "Listens for changes in media, ring, notification, alarm and voice-call volumes." },
    returns: { pt: "Callback recebe volumes atuais e máximos por stream. Retorna função para cancelar.", en: "Callback receives current and max volumes by stream. Returns an unsubscribe function." },
    handling: { pt: "O Android pode agrupar streams dependendo do modo de som do aparelho; trate como estado atual, não como histórico completo.", en: "Android may group streams depending on device sound mode; treat it as current state, not complete history." }
  },
  {
    syntax: { pt: "volumeAtual() / definirVolume('midia', 0.5)", en: "getVolume() / setVolume('music', 0.5)" },
    java: "AudioManager",
    description: { pt: "Consulta e controla volumes de mídia, toque, notificação, alarme, chamada e sistema.", en: "Reads and controls media, ring, notification, alarm, voice-call and system volumes." },
    returns: { pt: "`volumeAtual` retorna volumes atuais/máximos por stream. `definirVolume`, `aumentarVolume` e `diminuirVolume` retornam o novo estado.", en: "`getVolume` returns current/max volumes by stream. `setVolume`, `increaseVolume` and `decreaseVolume` return the new state." },
    handling: { pt: "Use valores entre 0 e 1 para porcentagem ou inteiros para passos absolutos. Passe `{ mostrarUI: true }` se quiser exibir a barra nativa.", en: "Use values from 0 to 1 for percentage or integers for absolute steps. Pass `{ showUi: true }` to show the native volume panel." }
  },
  {
    syntax: { pt: "aoAbrirTeclado(fn) / aoFecharTeclado(fn)", en: "onKeyboardOpen(fn) / onKeyboardClose(fn)" },
    java: "ViewTreeObserver",
    description: { pt: "Detecta abertura/fechamento do teclado pela área visível da WebView.", en: "Detects keyboard open/close through the visible WebView area." },
    returns: { pt: "Callback recebe { aberto, alturaTeclado }. Retorna função para cancelar.", en: "Callback receives { open, keyboardHeight }. Returns an unsubscribe function." },
    handling: { pt: "É uma heurística visual; modo tela cheia, teclado flutuante ou fabricante podem alterar a altura detectada.", en: "This is a visual heuristic; fullscreen mode, floating keyboards or vendors may change detected height." }
  },
  {
    syntax: { pt: "aoMudarOrientacao(fn)", en: "onOrientationChange(fn)" },
    java: "ViewTreeObserver + Configuration",
    description: { pt: "Escuta troca entre portrait e landscape enquanto a WebView muda de tamanho.", en: "Listens for portrait/landscape changes while the WebView changes size." },
    returns: { pt: "Callback recebe { orientacao, largura, altura }. Retorna função para cancelar.", en: "Callback receives { orientation, width, height }. Returns an unsubscribe function." },
    handling: { pt: "Se o app travar orientação no config, o evento naturalmente não muda.", en: "If the app locks orientation in config, the event naturally does not change." }
  },
  {
    syntax: { pt: "aoSacudirCelular(fn) / aoVirarCelularParaBaixo(fn)", en: "onPhoneShake(fn) / onPhoneFaceDown(fn)" },
    java: "SensorManager",
    description: { pt: "Escuta acelerômetro para detectar sacudida forte e tela virada para baixo.", en: "Uses the accelerometer to detect a strong shake and face-down posture." },
    returns: { pt: "Callback recebe leituras x/y/z e força quando fizer sentido. Retorna função para cancelar.", en: "Callback receives x/y/z readings and force when relevant. Returns an unsubscribe function." },
    handling: { pt: "Sensores variam por aparelho; use para interações leves e sempre mantenha um botão alternativo.", en: "Sensors vary by device; use for lightweight interactions and always keep a button fallback." }
  },
  {
    syntax: { pt: "aoAproximarObjeto(fn)", en: "onProximityNear(fn)" },
    java: "SensorManager",
    description: { pt: "Escuta o sensor de proximidade quando algo se aproxima da tela.", en: "Listens to the proximity sensor when something gets near the screen." },
    returns: { pt: "Callback recebe { perto, distancia, alcanceMaximo }. Retorna função para cancelar.", en: "Callback receives { near, distance, maximumRange }. Returns an unsubscribe function." },
    handling: { pt: "Nem todo aparelho tem sensor de proximidade; trate ausência simplesmente como evento que nunca dispara.", en: "Not every device has a proximity sensor; treat absence as an event that simply never fires." }
  },
  {
    syntax: { pt: "aoTirarPrint(fn)", en: "onScreenshot(fn)" },
    java: "MediaStore Observer",
    description: { pt: "Tenta detectar captura de tela observando novas imagens com nome/pasta de screenshot.", en: "Tries to detect screenshots by observing new images with screenshot-like names/folders." },
    returns: { pt: "Callback recebe { uri, nome, caminho? }. Retorna função para cancelar.", en: "Callback receives { uri, name, path? }. Returns an unsubscribe function." },
    handling: { pt: "Android moderno limita leitura de midia; alguns fabricantes mudam o nome da pasta, então esse evento é melhor esforço.", en: "Modern Android limits media reads; some vendors rename folders, so this event is best-effort." }
  },
  {
    syntax: { pt: "capturarTela() / tirarPrint()", en: "captureScreen() / takeScreenshot()" },
    java: "View.draw + Bitmap",
    description: { pt: "Captura a tela atual do próprio app/WebView e devolve imagem em base64.", en: "Captures the current app/WebView screen and returns a base64 image." },
    returns: { pt: "{ base64, dataUrl, width, height, mimeType, formato }.", en: "{ base64, dataUrl, width, height, mimeType, format }." },
    handling: { pt: "Não captura outros apps nem áreas protegidas do sistema. Use depois da tela renderizar para evitar imagem vazia.", en: "Does not capture other apps or protected system areas. Call it after the screen renders to avoid an empty image." }
  },
  {
    syntax: { pt: "aoNFC(fn)", en: "onNFC(fn)" },
    java: "NfcAdapter",
    description: { pt: "Escuta tags NFC enquanto o app está aberto em primeiro plano.", en: "Listens for NFC tags while the app is open in the foreground." },
    returns: { pt: "Callback recebe { id, tecnologias, mensagens }. Retorna função para cancelar.", en: "Callback receives { id, technologies, messages }. Returns an unsubscribe function." },
    handling: { pt: "Exige aparelho com NFC ligado. Tags que abrem o app enquanto ele estava fechado podem precisar de fluxo inicial em uma evolução futura.", en: "Requires a device with NFC enabled. Tags that launch the app from closed state may need an initial-flow helper in a future iteration." }
  },
  {
    syntax: { pt: "aoReceberNotificacao(fn)", en: "onNotificationReceived(fn)" },
    java: "dispatchEvent",
    description: { pt: "Escuta quando uma notificação local do app é emitida pela bridge.", en: "Listens when a local app notification is emitted by the bridge." },
    returns: { pt: "Callback recebe os dados da notificação. Retorna função para cancelar.", en: "Callback receives the notification data. Returns an unsubscribe function." },
    handling: { pt: "Use para atualizar tela/estado quando `notificar()` ou uma notificacao agendada passar pela bridge. Para clique, use `aoClicarNotificacao()`.", en: "Use it to update UI/state when `notify()` or a scheduled notification goes through the bridge. For clicks, use `onNotificationClick()`." }
  },
  {
    syntax: { pt: "obterLinkInicial()", en: "getInitialLink()" },
    java: "Intent / Activity",
    description: { pt: "Retorna a URL que abriu o aplicativo (Deep Link), se houver.", en: "Returns the URL that opened the application (Deep Link), if any." },
    returns: { pt: "String (ex: 'meuapp://conteudo/123').", en: "String (e.g. 'myapp://content/123')." },
    handling: { pt: "Util para repassar campanhas de marketing no inicio do app.", en: "Useful for passing marketing campaigns at app startup." }
  },
  {
    syntax: { pt: "aoLigarDispositivo(callback)", en: "onDeviceBoot(callback)" },
    java: "Intent / BootReceiver",
    description: { pt: "Executa uma funcao caso o aplicativo tenha sido aberto silenciosamente pelo boot do celular.", en: "Executes a function if the application was silently opened by the device boot." },
    returns: { pt: "Nenhum.", en: "None." },
    handling: { pt: "Depende de `configurarInicioAutomatico(true)` e permissao de sobreposicao no Android 10+.", en: "Depends on `setAutoStartOnBoot(true)` and overlay permission on Android 10+." }
  },
  {
    syntax: { pt: "obterLinkInicial() / aoAbrirLink(fn)", en: "getInitialLink() / onOpenLink(fn)" },
    java: "getInitialLink",
    description: { pt: "Lida com deep links/app links que abriram o APK.", en: "Handles deep links/app links that opened the APK." },
    returns: { pt: "{ url, scheme, host, path, query } ou null; o listener recebe o mesmo objeto.", en: "{ url, scheme, host, path, query } or null; the listener receives the same object." },
    handling: { pt: "No inicio do app, leia `obterLinkInicial()` e tambem registre `aoAbrirLink()` para links recebidos com o app ja aberto.", en: "At app startup, read `getInitialLink()` and also register `onOpenLink()` for links received while the app is already open." }
  },
  {
    syntax: { pt: "solicitarPermissaoCamera()", en: "requestCameraPermission()" },
    java: "requestCameraPermission",
    description: { pt: "Pede permissao de camera manualmente, se voce quiser preparar a experiencia antes da lanterna.", en: "Requests camera permission manually, if you want to prepare the experience before flashlight." },
    returns: { pt: "{ permission, required, granted, requiresSettings, settingsOpened }.", en: "{ permission, required, granted, requiresSettings, settingsOpened }." },
    handling: { pt: "`lanterna()` ja pede permissao sozinha. Use esta funcao apenas se quiser explicar antes e controlar a UI pelo `granted`.", en: "`flashlight()` already requests permission by itself. Use this only if you want to explain first and control the UI from `granted`." }
  },
  {
    syntax: { pt: "await ouvirMic(); const audio = await pararMic()", en: "await listenMic(); const audio = await stopMic()" },
    java: "MediaRecorder",
    description: { pt: "Comeca a gravar pelo microfone e finaliza retornando o audio em base64.", en: "Starts recording from the microphone and finishes by returning the audio as base64." },
    returns: { pt: "`ouvirMic`: { recording, startedAt, granted, settingsOpened }. `pararMic`: { base64, mimeType, extension, durationMs, size }.", en: "`listenMic`: { recording, startedAt, granted, settingsOpened }. `stopMic`: { base64, mimeType, extension, durationMs, size }." },
    handling: { pt: "`ouvirMic()` pede microfone sozinho. Se `settingsOpened` vier true, o Android abriu as configuracoes; quando o usuario voltar, chame `ouvirMic()` de novo.", en: "`listenMic()` requests the microphone by itself. If `settingsOpened` is true, Android opened settings; when the user returns, call `listenMic()` again." }
  },
  {
    syntax: { pt: "lanterna(true) / statusLanterna()", en: "flashlight(true) / flashlightStatus()" },
    java: "flashlight",
    description: { pt: "Liga, desliga e consulta a lanterna do aparelho.", en: "Turns the device flashlight on/off and reads its status." },
    returns: { pt: "{ available, enabled, permissionGranted }.", en: "{ available, enabled, permissionGranted }." },
    handling: { pt: "Ao chamar, o html2apk pede CAMERA automaticamente. Se `settingsOpened` vier true, o Android abriu as configuracoes porque o pop-up estava bloqueado.", en: "When called, html2apk automatically requests CAMERA. If `settingsOpened` is true, Android opened settings because the prompt was blocked." }
  },
  {
    syntax: { pt: "alternarLanterna()", en: "toggleFlashlight()" },
    java: "toggleFlashlight",
    description: { pt: "Inverte o estado atual da lanterna.", en: "Toggles the current flashlight state." },
    returns: { pt: "{ available, enabled, permissionGranted }.", en: "{ available, enabled, permissionGranted }." },
    handling: { pt: "Atualize o botao usando `enabled` retornado, sem assumir que o toggle sempre conseguiu mudar o estado.", en: "Update the button from the returned `enabled` value instead of assuming the toggle always succeeded." }
  },
  {
    syntax: { pt: "escolherImagem()", en: "pickImage()" },
    java: "Photo Picker / ACTION_OPEN_DOCUMENT",
    description: { pt: "Abre o Photo Picker moderno no Android 13+ e usa SAF automaticamente nos Androids antigos.", en: "Opens the modern Photo Picker on Android 13+ and automatically falls back to SAF on older Android versions." },
    returns: { pt: "{ uri, name, nome, size, tamanho, mimeType } ou null.", en: "{ uri, name, nome, size, tamanho, mimeType } or null." },
    handling: { pt: "Nao pede permissao ampla de armazenamento quando o Photo Picker esta disponivel. Use `uri`, nao caminho absoluto.", en: "Does not request broad storage permission when Photo Picker is available. Use `uri`, not an absolute file path." }
  },
  {
    syntax: { pt: "escolherImagens({ multiplas: true })", en: "pickImages({ multiple: true })" },
    java: "Photo Picker / ACTION_OPEN_DOCUMENT",
    description: { pt: "Abre selecao multipla de imagens usando Photo Picker moderno quando possivel.", en: "Opens multiple image selection using the modern Photo Picker when possible." },
    returns: { pt: "Array de arquivos; vazio se o usuario cancelar.", en: "Array of files; empty when the user cancels." },
    handling: { pt: "Sempre trate como array. Limite quantidade/tamanho antes de enviar ou processar.", en: "Always handle it as an array. Limit quantity/size before uploading or processing." }
  },
  {
    syntax: { pt: "escolherArquivo({ tipos: ['application/pdf'] })", en: "pickFile({ types: ['application/pdf'] })" },
    java: "pickFile",
    description: { pt: "Abre o seletor nativo para PDF, ZIP, TXT ou qualquer MIME.", en: "Opens the native picker for PDF, ZIP, TXT or any MIME." },
    returns: { pt: "{ uri, name, nome, size, tamanho, mimeType } ou null.", en: "{ uri, name, nome, size, tamanho, mimeType } or null." },
    handling: { pt: "Valide `mimeType` e `size` antes de aceitar. Cancelamento retorna `null` na funcao de arquivo unico.", en: "Validate `mimeType` and `size` before accepting. Cancel returns `null` for the single-file function." }
  },
  {
    syntax: { pt: "escolherArquivos({ multiplo: true })", en: "pickFiles({ multiple: true })" },
    java: "pickFile",
    description: { pt: "Seleciona varios arquivos de qualquer tipo ou dos MIME informados.", en: "Selects multiple files of any type or the MIME types you provide." },
    returns: { pt: "Array de arquivos.", en: "Array of files." },
    handling: { pt: "Itere sobre o array e trate item por item; nao bloqueie a UI se muitos arquivos forem escolhidos.", en: "Iterate over the array and handle each item; avoid blocking the UI if many files are selected." }
  },
  {
    syntax: { pt: "escolherVideo()", en: "pickVideo()" },
    java: "pickFile",
    description: { pt: "Abre o seletor nativo filtrando videos.", en: "Opens the native picker filtered to videos." },
    returns: { pt: "{ uri, name, size, mimeType } ou null.", en: "{ uri, name, size, mimeType } or null." },
    handling: { pt: "Videos podem ser grandes: confira `size` e mostre progresso se for fazer upload.", en: "Videos can be large: check `size` and show progress if you upload them." }
  },
  {
    syntax: { pt: "escolherPasta()", en: "pickFolder()" },
    java: "pickFolder",
    description: { pt: "Abre o seletor nativo de pasta quando o Android permitir.", en: "Opens the native folder picker when Android allows it." },
    returns: { pt: "{ uri, nome } ou objeto vazio se cancelar.", en: "{ uri, name } or an empty object when canceled." },
    handling: { pt: "Confira se `uri` existe antes de salvar. Android moderno entrega URI de documento, nao caminho real.", en: "Check that `uri` exists before saving. Modern Android returns a document URI, not a real path." }
  },
  {
    syntax: { pt: "salvarArquivo({ nome, conteudo })", en: "saveFile({ name, content })" },
    java: "saveFile",
    description: { pt: "Abre o modal nativo para o usuario escolher onde salvar.", en: "Opens the native modal so the user chooses where to save." },
    returns: { pt: "{ uri, name, size, mimeType, saved } ou objeto vazio se cancelar.", en: "{ uri, name, size, mimeType, saved } or an empty object when canceled." },
    handling: { pt: "Depois do retorno, confira `saved === true`. Para binario, envie `base64`; para texto, use `conteudo`/`content`.", en: "After the return, check `saved === true`. For binary data, send `base64`; for text, use `content`/`conteudo`." }
  },
  {
    syntax: { pt: "compartilhar({ texto, url, arquivo, arquivos })", en: "share({ text, url, file, files })" },
    java: "share",
    description: { pt: "Abre a folha nativa para texto, link, imagem, video, PDF, arquivo unico ou multiplos arquivos.", en: "Opens the native share sheet for text, link, image, video, PDF, one file or multiple files." },
    returns: { pt: "{ ok, shared, items, mimeType }.", en: "{ ok, shared, items, mimeType }." },
    handling: { pt: "Aceita objeto retornado por `escolherArquivo()`, URI ou nome salvo no armazenamento do app.", en: "Accepts an object returned by `pickFile()`, a URI or a file name saved in app storage." }
  },
  {
    syntax: { pt: "aoReceberCompartilhamento(callback)", en: "onShareReceived(callback)" },
    java: "ACTION_SEND / ACTION_SEND_MULTIPLE",
    description: { pt: "Permite que o app criado apareca no menu Compartilhar do Android e receba texto, imagem, video, PDF ou arquivo.", en: "Lets the generated app appear in Android's Share menu and receive text, image, video, PDF or file data." },
    returns: { pt: "Callback recebe { tipo, uri, mimeType, texto, items }.", en: "Callback receives { type, uri, mimeType, text, items }." },
    handling: { pt: "Use `obterCompartilhamentoInicial()` no boot e `aoReceberCompartilhamento()` para intents recebidas com o app aberto.", en: "Use `getInitialShare()` on boot and `onShareReceived()` for intents received while the app is open." }
  },
  {
    syntax: { pt: "procurarBT() / conectarBT(id) / enviarBT(objeto) / aoDarErroBT(callback)", en: "scanBluetooth() / connectBluetooth(id) / sendBluetooth(object) / onBluetoothError(callback)" },
    java: "Bluetooth RFCOMM",
    description: { pt: "Comunica dois apps html2apk por Bluetooth classico usando JSON.", en: "Communicates two html2apk apps over classic Bluetooth using JSON." },
    returns: { pt: "`procurarBT` retorna lista de dispositivos; `conectarBT` retorna o dispositivo conectado; `enviarBT` retorna { ok, enviado }; `aoDarErroBT` recebe o erro.", en: "`scanBluetooth` returns a device list; `connectBluetooth` returns the connected device; `sendBluetooth` returns { ok, sent }; `onBluetoothError` receives the error." },
    handling: { pt: "No aparelho que recebe, registre `aoConectarBT()`, `aoReceberDadosBT()` e `aoDarErroBT()`. Para descoberta, o outro aparelho precisa estar pareado ou visivel no Bluetooth do Android.", en: "On the receiving device, register `onBluetoothConnect()`, `onBluetoothData()` and `onBluetoothError()`. For discovery, the other device must be paired or visible in Android Bluetooth." }
  },
  {
    syntax: { pt: "procurarWiFi() / conectarWiFi(id) / enviarWiFi(objeto) / aoDarErroWiFi(callback)", en: "scanWiFi() / connectWiFi(id) / sendWiFi(object) / onWiFiError(callback)" },
    java: "NSD + Socket TCP local",
    description: { pt: "Comunica dois apps html2apk pela mesma rede Wi-Fi ou hotspot usando JSON.", en: "Communicates two html2apk apps on the same Wi-Fi network or hotspot using JSON." },
    returns: { pt: "`procurarWiFi` retorna lista de dispositivos; `conectarWiFi` retorna o dispositivo conectado; `enviarWiFi` retorna { ok, enviado }; `aoDarErroWiFi` recebe o erro.", en: "`scanWiFi` returns a device list; `connectWiFi` returns the connected device; `sendWiFi` returns { ok, sent }; `onWiFiError` receives the error." },
    handling: { pt: "No aparelho que recebe, registre `aoConectarWiFi()`, `aoReceberDadosWiFi()` e `aoDarErroWiFi()`. Os dois aparelhos precisam estar na mesma rede local ou hotspot.", en: "On the receiving device, register `onWiFiConnect()`, `onWiFiData()` and `onWiFiError()`. Both devices must be on the same local network or hotspot." }
  },
  {
    syntax: { pt: "ocr(imagem)", en: "recognizeText(image)" },
    java: "ML Kit TextRecognition local",
    description: { pt: "Reconhece texto em imagem usando ML Kit local, sem enviar dados para servidor.", en: "Recognizes text in an image using local ML Kit, without sending data to a server." },
    returns: { pt: "{ texto, text, offline, blocks }.", en: "{ texto, text, offline, blocks }." },
    handling: { pt: "Aceita objeto de `escolherImagem()`, URI, base64 ou nome salvo. O modelo latino atende portugues.", en: "Accepts a `pickImage()` object, URI, base64 or saved file name. The Latin model supports Portuguese." }
  },
  {
    syntax: { pt: "falar('Ola', { idioma: 'pt-BR', velocidade: 1 }) / pararFala()", en: "speak('Hello', { language: 'en-US', speed: 1 }) / stopSpeaking()" },
    java: "TextToSpeech",
    description: { pt: "Usa o motor TTS instalado no Android para falar texto.", en: "Uses Android's installed TTS engine to speak text." },
    returns: { pt: "{ ok, speaking, idioma, velocidade }.", en: "{ ok, speaking, language, speed }." },
    handling: { pt: "Se o idioma nao estiver instalado/suportado, a Promise rejeita. Use `pararFala()` para interromper.", en: "If the language is not installed/supported, the Promise rejects. Use `stopSpeaking()` to interrupt." }
  },
  {
    syntax: { pt: "ouvir({ idioma: 'pt-BR' })", en: "recognizeSpeech({ language: 'en-US' })" },
    java: "RecognizerIntent",
    description: { pt: "Abre o reconhecimento de voz nativo do Android e retorna o texto reconhecido.", en: "Opens Android native speech recognition and returns recognized text." },
    returns: { pt: "{ texto, resultados, confidence }.", en: "{ text, results, confidence }." },
    handling: { pt: "Use `idioma: 'auto'` ou omita idioma para deixar o Android escolher. Depende do servico de voz disponivel no aparelho.", en: "Use `language: 'auto'` or omit language to let Android choose. Depends on the voice service available on the device." }
  },
  {
    syntax: { pt: "share_me() / compartilharApp()", en: "share_me() / shareApp()" },
    java: "shareCurrentApp",
    description: { pt: "Compartilha o APK do proprio app aberto usando a folha nativa do Android.", en: "Shares the APK of the currently open app through the native Android share sheet." },
    returns: { pt: "{ shared, name, uri, size, packageName, splitApks, installableAsSingleApk }.", en: "{ shared, name, uri, size, packageName, splitApks, installableAsSingleApk }." },
    handling: { pt: "Funciona melhor em APK unico gerado pelo html2apk. Se o app veio de AAB/loja com split APKs, o retorno avisa que compartilhar apenas o APK base pode nao reinstalar tudo.", en: "Works best with a single APK generated by html2apk. If the app came from an AAB/store with split APKs, the return warns that sharing only the base APK may not reinstall everything." }
  },
  {
    syntax: { pt: "copiarTexto('texto') / lerTextoCopiado()", en: "copyText('text') / readText()" },
    java: "copyText/readText",
    description: { pt: "Escreve e le a area de transferencia.", en: "Writes and reads the clipboard." },
    returns: { pt: "`copiarTexto` retorna void; `lerTextoCopiado` retorna string.", en: "`copyText` returns void; `readText` returns string." },
    handling: { pt: "Apos copiar, confirme com um toast. Ao ler, aceite string vazia porque a area de transferencia pode estar vazia.", en: "After copying, confirm with a toast. When reading, accept an empty string because the clipboard may be empty." }
  },
  {
    syntax: { pt: "manterTelaLigada(true)", en: "keepScreenOn(true)" },
    java: "keepScreenAwake",
    description: { pt: "Impede a tela de apagar enquanto o app esta aberto.", en: "Keeps the screen awake while the app is open." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "Ative so em telas de leitura, video ou monitoramento; desligue com `false` ao sair da tela.", en: "Enable only on reading, video or monitoring screens; turn it off with `false` when leaving the screen." }
  },
  {
    syntax: { pt: "brilhoTela(0.8)", en: "setScreenBrightness(0.8)" },
    java: "setScreenBrightness",
    description: { pt: "Ajusta o brilho apenas da janela do app.", en: "Adjusts only this app window brightness." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "Use valor entre 0 e 1. Guarde o valor anterior se quiser restaurar a experiencia do usuario.", en: "Use a value between 0 and 1. Store the previous value if you want to restore the user experience." }
  },
  {
    syntax: { pt: "definirCorTema({ statusBarColor, navigationBarColor })", en: "setThemeColor({ statusBarColor, navigationBarColor })" },
    java: "setSystemBarsColor",
    description: { pt: "Muda as cores da barra de status e navegacao Android em tempo real.", en: "Changes Android status and navigation bar colors at runtime." },
    returns: { pt: "{ statusBarColor, navigationBarColor, darkIcons, applied }.", en: "{ statusBarColor, navigationBarColor, darkIcons, applied }." },
    handling: { pt: "Use quando quiser controlar manualmente. Com `themeMode: 'auto'`, o html2apk chama isso sozinho conforme a cor visivel na tela.", en: "Use when you want manual control. With `themeMode: 'auto'`, html2apk calls this automatically from the visible screen color." }
  },
  {
    syntax: { pt: "abrirNoApp('/pagina.html')", en: "openInApp('/page.html')" },
    java: "window.location",
    description: { pt: "Navega dentro do proprio APK/WebView, bom para rotas locais, hashes ou paginas do app.", en: "Navigates inside the APK/WebView, useful for local routes, hashes or app pages." },
    returns: { pt: "{ url, target: 'app', opened, replace }.", en: "{ url, target: 'app', opened, replace }." },
    handling: { pt: "Use para telas internas. Passe `{ substituir: true }` se nao quiser manter a pagina anterior no historico.", en: "Use for internal screens. Pass `{ replace: true }` if you do not want to keep the previous page in history." }
  },
  {
    syntax: { pt: "abrirForaDoApp('https://...')", en: "openOutsideApp('https://...')" },
    java: "openUrl",
    description: { pt: "Abre URL fora do APK, em navegador ou outro app Android. `abrirUrlExterno()` continua como alias.", en: "Opens a URL outside the APK, in a browser or another Android app. `openExternalUrl()` remains an alias." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "Valide a URL antes de chamar e trate erro caso nenhum app consiga abrir o endereco.", en: "Validate the URL before calling and handle errors if no app can open the address." }
  },
  {
    syntax: { pt: "abrirWhatsapp('559999999999')", en: "openWhatsapp('559999999999')" },
    java: "openWhatsapp",
    description: { pt: "Abre conversa do WhatsApp pelo numero.", en: "Opens a WhatsApp conversation by phone number." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "Envie numero com DDI e apenas digitos. Tenha fallback para navegador se WhatsApp nao estiver disponivel.", en: "Send the phone number with country code and digits only. Keep a browser fallback if WhatsApp is unavailable." }
  },
  {
    syntax: { pt: "discar('11999999999') / abrirMapa('Sao Paulo')", en: "dial('11999999999') / openMap('Sao Paulo')" },
    java: "dial/openMap",
    description: { pt: "Abre discador ou mapa nativo sem executar acao sensivel sozinho.", en: "Opens dialer or native map without performing sensitive action alone." },
    returns: { pt: "Promise<void>.", en: "Promise<void>." },
    handling: { pt: "O usuario ainda confirma chamada/rota. Mostre erro se nao houver app de telefone ou mapa.", en: "The user still confirms the call/route. Show an error if no phone or map app is available." }
  },
  {
    syntax: { pt: "infoDispositivo()", en: "deviceInfo()" },
    java: "deviceInfo",
    description: { pt: "Retorna fabricante, modelo, Android, SDK e package name.", en: "Returns manufacturer, model, Android, SDK and package name." },
    returns: { pt: "{ manufacturer, fabricante, model, modelo, androidVersion, sdkInt, packageName }.", en: "{ manufacturer, fabricante, model, modelo, androidVersion, sdkInt, packageName }." },
    handling: { pt: "Use para diagnostico e ajustes de compatibilidade; nao dependa de modelo especifico para liberar recurso essencial.", en: "Use for diagnostics and compatibility tweaks; do not depend on a specific model for essential features." }
  },
  {
    syntax: { pt: "infoRede() / infoBateria()", en: "networkInfo() / batteryInfo()" },
    java: "networkInfo/batteryInfo",
    description: { pt: "Consulta conexão atual e bateria.", en: "Reads current connection and battery." },
    returns: { pt: "rede: { online, tipo/type }; bateria: { level, charging }.", en: "network: { online, tipo/type }; battery: { level, charging }." },
    handling: { pt: "Combine com `aoEvento('rede:mudou')` e `aoEvento('bateria:mudou')` para atualizar a tela sem ficar consultando em loop.", en: "Combine with `onEvent('network:changed')` and `onEvent('battery:changed')` to update the UI without polling." }
  },
  {
    syntax: { pt: "infoMemoria()", en: "memoryInfo()" },
    java: "memoryInfo",
    description: { pt: "Monitora RAM disponivel, total, baixa memoria e heap do app.", en: "Monitors available RAM, total RAM, low-memory state and app heap." },
    returns: { pt: "{ availableBytes, totalBytes, lowMemory, appUsedBytes, appMaxBytes }.", en: "{ availableBytes, totalBytes, lowMemory, appUsedBytes, appMaxBytes }." },
    handling: { pt: "Converta bytes para MB/GB na UI. Se `lowMemory` vier true, reduza cache, imagens grandes ou tarefas em segundo plano.", en: "Convert bytes to MB/GB in the UI. If `lowMemory` is true, reduce cache, large images or background tasks." }
  },
  {
    syntax: { pt: "infoArmazenamento()", en: "storageInfo()" },
    java: "storageInfo",
    description: { pt: "Retorna armazenamento interno/cache disponivel e usado.", en: "Returns available and used internal/cache storage." },
    returns: { pt: "{ internal, cache, appExternal } com bytes.", en: "{ internal, cache, appExternal } in bytes." },
    handling: { pt: "Antes de salvar arquivos grandes, compare o tamanho com `availableBytes` e mostre aviso se faltar espaco.", en: "Before saving large files, compare size with `availableBytes` and warn when there is not enough space." }
  },
  {
    syntax: { pt: "infoDesempenho()", en: "performanceInfo()" },
    java: "performanceInfo",
    description: { pt: "Agrupa memoria, armazenamento, bateria, rede e timestamp.", en: "Groups memory, storage, battery, network and timestamp." },
    returns: { pt: "{ timestamp, memory, storage, battery, network }.", en: "{ timestamp, memory, storage, battery, network }." },
    handling: { pt: "Ideal para uma tela de diagnostico. Atualize com intervalo moderado, por exemplo a cada 5 ou 10 segundos.", en: "Ideal for a diagnostics screen. Refresh at a moderate interval, for example every 5 or 10 seconds." }
  },
  {
    syntax: { pt: "appsAbertos()", en: "openAppsMemory()" },
    java: "openAppsMemory",
    description: { pt: "Lista processos/apps que o Android permite ver e estima RAM por app. Android moderno pode retornar apenas o proprio app por privacidade.", en: "Lists processes/apps Android allows this app to see and estimates RAM per app. Modern Android may only return this app for privacy." },
    returns: { pt: "{ apps: [{ name, packageName, ramBytes, ramMb }], porNome, limited, observacao }.", en: "{ apps: [{ name, packageName, ramBytes, ramMb }], byName, limited, note }." },
    handling: { pt: "Use como diagnostico aproximado. Se `limited` vier true ou `apps` vier pequeno, explique que o Android bloqueou visao completa.", en: "Use it as approximate diagnostics. If `limited` is true or `apps` is small, explain that Android blocked full visibility." }
  },
  {
    syntax: { pt: "iniciarIconeFlutuante() / pararIconeFlutuante()", en: "startFloatingIcon() / stopFloatingIcon()" },
    java: "FloatingIconService",
    description: { pt: "Controla o ícone flutuante e permite ajustar opacidade quando a sobreposição estiver liberada no Android.", en: "Controls the floating icon and allows opacity changes when draw-over-apps is allowed on Android." },
    returns: { pt: "{ granted, requiresSettings, opacity } para iniciar/configurar; `pararIconeFlutuante` finaliza o serviço.", en: "{ granted, requiresSettings, opacity } for start/configure; `stopFloatingIcon` stops the service." },
    handling: { pt: "`iniciarIconeFlutuante()` abre a tela de permissão automaticamente se faltar sobreposição. Use `definirOpacidadeIconeFlutuante(0.6)` para mudar sem recriar outro fluxo.", en: "`startFloatingIcon()` opens the permission screen automatically if draw-over-apps is missing. Use `setFloatingIconOpacity(0.6)` to change it without creating another flow." }
  },
  {
    syntax: { pt: "minimizarApp() / fecharApp()", en: "minimizeApp() / closeApp()" },
    java: "Activity",
    description: { pt: "Envia o app para segundo plano ou fecha a Activity atual.", en: "Sends the app to the background or closes the current Activity." },
    returns: { pt: "`minimizarApp`: { minimizado }. `fecharApp`: { fechado } antes de finalizar.", en: "`minimizeApp`: { minimized }. `closeApp`: { closed } before finishing." },
    handling: { pt: "Use com uma ação clara do usuário. `fecharApp()` encerra a tela do APK, então salve estado antes.", en: "Use from an explicit user action. `closeApp()` finishes the APK screen, so save state first." }
  },
  {
    syntax: { pt: "tirarFoto() / capturarVideo()", en: "takePhoto() / captureVideo()" },
    java: "ACTION_IMAGE_CAPTURE / ACTION_VIDEO_CAPTURE",
    description: { pt: "Abre a camera nativa para capturar foto ou video e retorna um arquivo app-scoped.", en: "Opens the native camera to capture a photo or video and returns an app-scoped file." },
    returns: { pt: "{ uri, name, size, mimeType, kind }. Com `{ base64: true }`, tambem retorna base64.", en: "{ uri, name, size, mimeType, kind }. With `{ base64: true }`, it also returns base64." },
    handling: { pt: "A permissao de camera e pedida automaticamente. Trate objeto vazio como cancelamento do usuario.", en: "Camera permission is requested automatically. Treat an empty object as user cancellation." }
  },
  {
    syntax: { pt: "escanearQRCode()", en: "scanQRCode()" },
    java: "BarcodeDetector + camera",
    description: { pt: "Tira uma foto e tenta ler QR Code pelo WebView quando `BarcodeDetector` estiver disponivel.", en: "Takes a photo and tries to read a QR code through the WebView when `BarcodeDetector` is available." },
    returns: { pt: "{ text, rawValue, format, photo } ou null se nenhum QR for encontrado.", en: "{ text, rawValue, format, photo } or null when no QR is found." },
    handling: { pt: "Se o WebView do aparelho nao tiver `BarcodeDetector`, a Promise rejeita; mantenha fallback para digitar/colar o codigo.", en: "If the device WebView does not have `BarcodeDetector`, the Promise rejects; keep a fallback to type/paste the code." }
  },
  {
    syntax: { pt: "salvarArquivo('nome.json', minhaVariavel) / lerArquivo('nome.json')", en: "saveFile('name.json', myValue) / readFile('name.json')" },
    java: "app-scoped external files",
    description: { pt: "CRUD de arquivos persistentes no armazenamento app-scoped, sem abrir seletor de documento.", en: "Persistent file CRUD in app-scoped storage, without opening a document picker." },
    returns: { pt: "`salvarArquivo` retorna metadados; `lerArquivo` retorna o valor salvo; `listarArquivos` retorna a lista.", en: "`saveFile` returns metadata; `readFile` returns the saved value; `listFiles` returns the list." },
    handling: { pt: "A chamada antiga `salvarArquivo({ nome, conteudo })` continua abrindo o seletor nativo. Use string no primeiro argumento para o CRUD interno.", en: "The old `saveFile({ name, content })` call still opens the native picker. Use a string first argument for internal CRUD." }
  },
  {
    syntax: { pt: "baixarArquivo(url, 'foto.png', { galeria: true }) / abrirArquivo('foto.png')", en: "downloadFile(url, 'photo.png', { gallery: true }) / openFile('photo.png')" },
    java: "HttpURLConnection + NotificationCompat",
    description: { pt: "Baixa por URL para o armazenamento persistente do app e mostra notificacao Android com barra de progresso.", en: "Downloads from a URL to the app's persistent storage and shows an Android progress notification." },
    returns: { pt: "`baixarArquivo` retorna metadados, tamanho, origem, notificacao e, com `{ galeria: true }`, `publicUri`.", en: "`downloadFile` returns metadata, size, source, notification state and, with `{ gallery: true }`, `publicUri`." },
    handling: { pt: "Sem `{ galeria: true }`, imagens ficam privadas do app e nao aparecem na galeria. No Android 13+, se a permissao de notificacao for negada, o download continua.", en: "Without `{ gallery: true }`, images stay private to the app and do not appear in the gallery. On Android 13+, if notification permission is denied, the download continues." }
  },
  {
    syntax: { pt: "baixarBase64('foto.png', base64, { galeria: true }) / baixarArquivoLocal(arquivo, 'copia.pdf')", en: "downloadBase64('photo.png', base64, { gallery: true }) / downloadLocalFile(file, 'copy.pdf')" },
    java: "InputStream + NotificationCompat",
    description: { pt: "Cria um download a partir de base64, data URL, URI/caminho de arquivo ou objeto retornado por `escolherArquivo()`.", en: "Creates a download from base64, data URL, file URI/path or an object returned by `pickFile()`." },
    returns: { pt: "Metadados do arquivo salvo, `sourceType`, `notificationShown`, permissao de notificacao e publicacao opcional.", en: "Saved file metadata, `sourceType`, `notificationShown`, notification permission and optional public publication." },
    handling: { pt: "Para imagem/video aparecer na galeria, passe `{ galeria: true }`. Para esconder a notificacao, passe `{ notificacao: false }`.", en: "For image/video to appear in the gallery, pass `{ gallery: true }`. To hide the notification, pass `{ notification: false }`." }
  },
  {
    syntax: { pt: "solicitarPermissaoInstalacao() / requestInstallPermission()", en: "requestInstallPermission() / solicitarPermissaoInstalacao()" },
    java: "Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES",
    description: { pt: "Abre a tela de configuracoes para o usuario permitir instalacao de apps de fontes desconhecidas (Android 8+).", en: "Opens the settings screen for the user to allow installing apps from unknown sources (Android 8+)." },
    returns: { pt: "Objeto informando se e `suportado` e se foi `solicitado` (abriu config) ou ja `permitido`.", en: "Object stating if `supported` and if it was `requested` (opened config) or already `granted`." },
    handling: { pt: "Ideal chamar antes de `instalarAtualizacao` para evitar falha silenciosa.", en: "Ideal to call before `installUpdate` to avoid silent failure." }
  },
  {
    syntax: { pt: "obterLocalizacao() / acompanharLocalizacao()", en: "getLocation() / watchLocation()" },
    java: "LocationManager",
    description: { pt: "Le a localizacao atual ou inicia acompanhamento por evento `localizacao:mudou`.", en: "Reads current location or starts watching through the `location:changed` event." },
    returns: { pt: "{ latitude, longitude, accuracy, provider } ou { watchId }.", en: "{ latitude, longitude, accuracy, provider } or { watchId }." },
    handling: { pt: "A permissao e pedida automaticamente. Pare acompanhamento com `pararLocalizacao(watchId)` quando sair da tela.", en: "Permission is requested automatically. Stop watching with `stopLocationWatch(watchId)` when leaving the screen." }
  },
  {
    syntax: { pt: "autenticarBiometria({ titulo })", en: "authenticateBiometric({ title })" },
    java: "BiometricPrompt",
    description: { pt: "Abre a biometria/tela segura do Android para confirmar identidade.", en: "Opens Android biometric/secure prompt to confirm identity." },
    returns: { pt: "{ supported, authenticated, canceled, message }.", en: "{ supported, authenticated, canceled, message }." },
    handling: { pt: "Funciona em Android 9+. Se `supported` vier falso, use PIN/senha do proprio app como fallback.", en: "Works on Android 9+. If `supported` is false, use your app's own PIN/password fallback." }
  },
  {
    syntax: { pt: "solicitarBloqueio({ titulo })", en: "requestDeviceLock({ title })" },
    java: "KeyguardManager",
    description: { pt: "Abre a tela de bloqueio do Android (PIN, padrao, senha).", en: "Opens Android device lock screen (PIN, pattern, password)." },
    returns: { pt: "{ supported, authenticated, canceled, message }.", en: "{ supported, authenticated, canceled, message }." },
    handling: { pt: "Funciona se o usuario tiver senha cadastrada.", en: "Works if the user has a secure lock screen configured." }
  },
  {
    syntax: { pt: "solicitarSegundoPlano()", en: "requestBackgroundExecution()" },
    java: "Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    description: { pt: "Solicita ao sistema que o app funcione ativamente no background e inicie junto com o aparelho.", en: "Requests the system to run the app actively in the background and autostart on boot." },
    returns: { pt: "{ ok, openedAutoStart, openedBatteryOptimization }.", en: "{ ok, openedAutoStart, openedBatteryOptimization }." },
    handling: { pt: "Usa permissoes restritas. Play Store pode rejeitar apps sem justificativa valida para manter CPU ligada.", en: "Uses restricted permissions. Play Store might reject apps without a valid reason to keep CPU awake." }
  },
  {
    syntax: { pt: "configurarInicioAutomatico(true/false)", en: "setAutoStartOnBoot(true/false)" },
    java: "BootReceiver -> Intent",
    description: { pt: "Define se o aplicativo deve ser aberto automaticamente quando o celular for ligado.", en: "Sets whether the app should automatically open when the device boots." },
    returns: { pt: "{ ok, enabled }.", en: "{ ok, enabled }." },
    handling: { pt: "Exige permissao de sobrepor a outros apps no Android 10+.", en: "Requires draw over other apps permission on Android 10+." }
  },
  {
    syntax: { pt: "salvarSeguro('token', valor) / lerSeguro('token')", en: "saveSecure('token', value) / readSecure('token')" },
    java: "Android Keystore",
    description: { pt: "Guarda pequenos segredos cifrados com chave do Android Keystore.", en: "Stores small secrets encrypted with an Android Keystore key." },
    returns: { pt: "`lerSeguro` retorna o valor salvo; `listarSeguro` retorna chaves; `removerSeguro` apaga.", en: "`readSecure` returns the saved value; `listSecureKeys` returns keys; `deleteSecure` removes." },
    handling: { pt: "Use para tokens e dados pequenos. Nao use para arquivos grandes; para isso, use o CRUD de arquivos.", en: "Use it for tokens and small data. Do not use it for large files; use file CRUD for that." }
  },
  {
    syntax: { pt: "salvarNaSessao('chave', valor) / lerDaSessao('chave')", en: "sessionSet('key', value) / sessionGet('key')" },
    java: "Memory HashMap",
    description: { pt: "Guarda dados em memória RAM nativa que sobrevivem a reloads do HTML/WebView enquanto o app estiver aberto.", en: "Stores data in native RAM that survives HTML/WebView reloads while the app remains open." },
    returns: { pt: "`lerDaSessao` retorna o valor em string salvo; `listarSessao` retorna tudo; `removerDaSessao` apaga.", en: "`sessionGet` returns the saved string value; `sessionGetAll` returns all; `sessionRemove` deletes." },
    handling: { pt: "Como a memória RAM é limpa ao fechar o app, use apenas para estados e sessões temporárias.", en: "Since RAM is cleared when closing the app, use this only for temporary state and sessions." }
  },
  {
    syntax: { pt: "definirPapelParede('foto.jpg', { alvo: 'inicio' })", en: "setWallpaper('photo.jpg', { target: 'home' })" },
    java: "WallpaperManager",
    description: { pt: "Define imagem estatica como papel de parede da tela inicial, bloqueio ou ambas.", en: "Sets a static image as home, lock or both wallpapers." },
    returns: { pt: "{ applied, systemApplied, lockApplied, lockSupported, mimeType }.", en: "{ applied, systemApplied, lockApplied, lockSupported, mimeType }." },
    handling: { pt: "Aceita nome salvo por `salvarArquivo`, `content://`/`file://` ou `{ base64, mimeType }`. Video retorna aviso e deve seguir pelo ajuste/live wallpaper do Android.", en: "Accepts a name saved by `saveFile`, `content://`/`file://` or `{ base64, mimeType }`. Video returns a warning and must use Android settings/live wallpaper flow." },
    recipe: {
      when: { pt: "Para aplicar uma imagem ja salva no armazenamento do app como papel de parede inicial.", en: "To apply an image already saved in app storage as the home wallpaper." },
      example: {
        pt: `const resultado = await definirPapelParede("foto.jpg", {
  alvo: "inicio"
});

if (!resultado.applied) {
  console.log(resultado);
}`,
        en: `const result = await setWallpaper("photo.jpg", {
  target: "home"
});

if (!result.applied) {
  console.log(result);
}`
      }
    }
  },
  {
    syntax: { pt: "infoPapelParede() / abrirConfiguracaoPapelParede()", en: "wallpaperInfo() / openWallpaperSettings()" },
    java: "android.settings.WALLPAPER_SETTINGS",
    description: { pt: "Consulta capacidades do aparelho e abre a tela nativa para escolhas manuais.", en: "Checks device capabilities and opens the native screen for manual choices." },
    returns: { pt: "`infoPapelParede` retorna suporte a imagem/bloqueio/video. `abrirConfiguracaoPapelParede` retorna se a tela abriu.", en: "`wallpaperInfo` returns image/lock/video support. `openWallpaperSettings` returns whether the screen opened." },
    handling: { pt: "Use para casos fora do caminho simples, como video wallpaper ou aparelhos que exigem confirmacao do usuario.", en: "Use it for cases outside the simple path, such as video wallpaper or devices that require user confirmation." },
    recipe: {
      when: { pt: "Para lidar com video wallpaper ou aparelhos que pedem escolha manual do usuario.", en: "To handle video wallpaper or devices that require a manual user choice." },
      example: {
        pt: `const info = await infoPapelParede();

if (!info.videoSupported) {
  await abrirConfiguracaoPapelParede();
}`,
        en: `const info = await wallpaperInfo();

if (!info.videoSupported) {
  await openWallpaperSettings();
}`
      }
    }
  }
];

[
  "feedback",
  "feedback",
  "feedback",
  "notifications",
  "notifications",
  "notifications",
  "notifications",
  "notifications",
  "permissions",
  "permissions",
  "permissions",
  "permissions",
  "permissions",
  "media",
  "media",
  "media",
  "media",
  "media",
  "files",
  "files",
  "media",
  "files",
  "files",
  "share",
  "share",
  "share",
  "media",
  "media",
  "media",
  "share",
  "share",
  "device",
  "device",
  "device",
  "share",
  "share",
  "share",
  "share",
  "device",
  "device",
  "device",
  "device",
  "device",
  "device",
  "device",
  "media",
  "media",
  "files",
  "files",
  "files",
  "security",
  "security",
  "security",
  "wallpaper",
  "wallpaper"
].forEach((category, index) => {
  if (nativeCodeEntries[index]) {
    nativeCodeEntries[index].category = category;
  }
});

const nativeCodeRecipes = [
  {
    when: { pt: "Para avisos curtos dentro do app, como sucesso, erro simples ou confirmacao.", en: "For short in-app feedback such as success, simple errors or confirmations." },
    example: {
      pt: `try {
  await toast("Salvo com sucesso");
} catch (erro) {
  console.error("Toast falhou", erro);
}`,
      en: `try {
  await toast("Saved successfully");
} catch (error) {
  console.error("Toast failed", error);
}`
    }
  },
  {
    when: { pt: "Para dar feedback fisico em botoes, alertas ou acoes importantes.", en: "For physical feedback on buttons, alerts or important actions." },
    example: {
      pt: `await vibrar(250);`,
      en: `await vibrate(250);`
    }
  },
  {
    when: { pt: "Para esperar entre duas linhas sem bloquear a interface.", en: "To wait between two lines without blocking the interface." },
    example: {
      pt: `await toast("Comecando");
await aguardar(5000);
await toast("Continuando");`,
      en: `await toast("Starting");
await loading(5000);
await toast("Continuing");`
    }
  },
  {
    when: { pt: "Para mostrar uma notificacao simples agora. `aoClicar`, `acoes` e `open` sao opcionais.", en: "To show a simple notification now. `onClick`, `actions` and `open` are optional." },
    example: {
      pt: `await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir o app"
});`,
      en: `await notify({
  title: "Order approved",
  text: "Tap to open the app"
});`
    }
  },
  {
    when: { pt: "Para executar algo quando a notificacao for clicada.", en: "To run something when the notification is clicked." },
    example: {
      pt: `await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  aoClicar: () => abrirForaDoApp("https://exemplo.com/pedidos/123")
});`,
      en: `await notify({
  title: "Order approved",
  text: "Tap to open details",
  onClick: () => openOutsideApp("https://example.com/orders/123")
});`
    }
  },
  {
    when: { pt: "Para colocar botoes na notificacao, cada um chamando uma funcao.", en: "To add buttons to the notification, each one calling a function." },
    example: {
      pt: `window.marcarPedidoLido = (id) => {
  localStorage.setItem("pedido:" + id, "lido");
};

await notificar({
  titulo: "Pedido aprovado",
  texto: "Escolha uma acao",
  acoes: [
    {
      id: "abrir",
      titulo: "Abrir",
      open: true,
      aoClicar: { funcao: "abrirNoApp", argumentos: ["#/pedido/123"] }
    },
    {
      id: "lido",
      titulo: "Marcar lido",
      open: false,
      aoClicar: { funcao: "marcarPedidoLido", argumentos: [123], open: false }
    }
  ]
});`,
      en: `window.markOrderRead = (id) => {
  localStorage.setItem("order:" + id, "read");
};

await notify({
  title: "Order approved",
  text: "Choose an action",
  actions: [
    {
      id: "open",
      title: "Open",
      open: true,
      onClick: { functionName: "openInApp", args: ["#/order/123"] }
    },
    {
      id: "read",
      title: "Mark read",
      open: false,
      onClick: { functionName: "markOrderRead", args: [123], open: false }
    }
  ]
});`
    }
  },
  {
    when: { pt: "Para clique de notificacao agendada ou com app fechado.", en: "For scheduled notification clicks or when the app is closed." },
    example: {
      pt: `await agendarNotificacao({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  quando: Date.now() + 60 * 1000,
  aoClicar: {
    funcao: "abrirForaDoApp",
    argumentos: ["https://exemplo.com/pedidos/123"]
  }
});`,
      en: `await scheduleNotification({
  title: "Order approved",
  text: "Tap to open details",
  when: Date.now() + 60 * 1000,
  onClick: {
    functionName: "openOutsideApp",
    args: ["https://example.com/orders/123"]
  }
});`
    }
  },
  {
    when: { pt: "Para lembrar o usuario depois, mesmo se o app nao estiver aberto.", en: "To remind the user later, even if the app is not open." },
    example: {
      pt: `const aviso = await agendarNotificacao({
  titulo: "Lembrete",
  texto: "Volte ao app daqui 1 minuto",
  quando: Date.now() + 60 * 1000
});

console.log("ID para cancelar depois:", aviso.id);`,
      en: `const reminder = await scheduleNotification({
  title: "Reminder",
  text: "Come back in 1 minute",
  when: Date.now() + 60 * 1000
});

console.log("ID to cancel later:", reminder.id);`
    }
  },
  {
    when: { pt: "Para uma sequencia recorrente de notificacoes, como a cada 12 horas.", en: "For a repeating sequence of notifications, such as every 12 hours." },
    example: {
      pt: `const loop = await agendarLoopNotificacoes({
  aCada: "12h",
  notificacoes: [
    { titulo: "Agua", texto: "Beba agua agora" },
    { titulo: "Alongar", texto: "Faca uma pausa rapida" }
  ]
});

// Depois, se quiser parar:
// await cancelarNotificacao(loop.id);`,
      en: `const loop = await scheduleNotificationLoop({
  every: "12h",
  notifications: [
    { title: "Water", text: "Drink water now" },
    { title: "Stretch", text: "Take a quick break" }
  ]
});

// Later, to stop it:
// await cancelNotification(loop.id);`
    }
  },
  {
    when: { pt: "Opcional: use se quiser pedir a permissao antes de chamar notificacoes.", en: "Optional: use it if you want to ask permission before calling notifications." },
    example: {
      pt: `const permissao = await solicitarPermissaoNotificacoes();

if (!permissao.granted) {
  if (permissao.settingsOpened) {
    console.log("O Android abriu as configuracoes do app");
  }
}`,
      en: `const permission = await requestNotificationPermission();

if (!permission.granted) {
  if (permission.settingsOpened) {
    console.log("Android opened the app settings");
  }
}`
    }
  },
  {
    when: { pt: "Para push remoto enviado pelo painel/API do OneSignal. Requer OneSignal App ID no build.", en: "For remote push sent by the OneSignal dashboard/API. Requires OneSignal App ID in the build." },
    example: {
      pt: `const permitido = await solicitarPermissaoPush();

if (permitido) {
  await identificarUsuarioPush("usuario-123");
  await adicionarTagPush("plano", "premium");
}

const parar = aoClicarPush((evento) => {
  abrirNoApp("#/notificacoes");
});`,
      en: `const allowed = await requestPushPermission();

if (allowed) {
  await loginPushUser("user-123");
  await addPushTag("plan", "premium");
}

const stop = onPushClick((event) => {
  openInApp("#/notifications");
});`
    }
  },
  {
    when: { pt: "Para consultar permissoes sem abrir uma solicitacao na tela.", en: "To check permissions without opening a permission prompt." },
    example: {
      pt: `const permissoes = await statusPermissoes([
  "CAMERA",
  "RECORD_AUDIO",
  "POST_NOTIFICATIONS"
]);

console.log(permissoes);`,
      en: `const permissions = await permissionStatus([
  "CAMERA",
  "RECORD_AUDIO",
  "POST_NOTIFICATIONS"
]);

console.log(permissions);`
    }
  },
  {
    when: { pt: "Para reagir a eventos do Android, como app indo para segundo plano ou clique em notificacao.", en: "To react to Android events, such as backgrounding or notification clicks." },
    example: {
      pt: `const parar = aoEvento("app:background", (evento) => {
  console.log("Saiu da frente", evento.timestamp);
});

// Quando nao precisar mais:
// parar();`,
      en: `const stop = onEvent("app:background", (event) => {
  console.log("Moved to background", event.timestamp);
});

// When you no longer need it:
// stop();`
    }
  },
  {
    when: { pt: "Para reagir a cabo/dispositivo USB e notificacoes locais.", en: "To react to USB cable/device changes and local notifications." },
    example: {
      pt: `aoConectarUSB((dados) => {
  console.log("USB conectado", dados.origem, dados.dispositivo);
});

aoDesconectarUSB(() => {
  console.log("USB desconectado");
});

aoReceberNotificacao((dados) => {
  console.log("Notificação recebida", dados.titulo || dados.title);
});`,
      en: `onUSBConnect((data) => {
  console.log("USB connected", data.source, data.device);
});

onUSBDisconnect(() => {
  console.log("USB disconnected");
});

onNotificationReceived((data) => {
  console.log("Notification received", data.title);
});`
    }
  },
  {
    when: { pt: "Para reagir a fone, volume, teclado e orientação da tela.", en: "To react to headphones, volume, keyboard and screen orientation." },
    example: {
      pt: `aoConectarFone((dados) => {
  console.log("Fone conectado", dados.dispositivo);
});

aoMudarVolume((dados) => {
  console.log("Volume de mídia", dados.midia.atual);
});

aoAbrirTeclado((dados) => {
  console.log("Teclado abriu", dados.alturaTeclado);
});

aoMudarOrientacao((dados) => {
  console.log("Orientação", dados.orientacao);
});`,
      en: `onHeadphoneConnect((data) => {
  console.log("Headphone connected", data.device);
});

onVolumeChange((data) => {
  console.log("Media volume", data.music.current);
});

onKeyboardOpen((data) => {
  console.log("Keyboard opened", data.keyboardHeight);
});

onOrientationChange((data) => {
  console.log("Orientation", data.orientation);
});`
    }
  },
  {
    when: { pt: "Para interações legais com sensores, print e NFC.", en: "For playful interactions with sensors, screenshots and NFC." },
    example: {
      pt: `aoSacudirCelular((dados) => {
  console.log("Sacudiu", dados.forca);
});

aoVirarCelularParaBaixo(() => {
  console.log("Tela virada para baixo");
});

aoAproximarObjeto((dados) => {
  console.log("Algo chegou perto", dados.distancia);
});

aoTirarPrint((dados) => {
  console.log("Print detectado", dados.uri);
});

aoNFC((dados) => {
  console.log("Tag NFC", dados.id, dados.mensagens);
});`,
      en: `onPhoneShake((data) => {
  console.log("Shaken", data.force);
});

onPhoneFaceDown(() => {
  console.log("Phone is face down");
});

onProximityNear((data) => {
  console.log("Something is near", data.distance);
});

onScreenshot((data) => {
  console.log("Screenshot detected", data.uri);
});

onNFC((data) => {
  console.log("NFC tag", data.id, data.messages);
});`
    }
  },
  {
    when: { pt: "Para pausar/resumir tarefas quando o usuario minimiza ou volta para o app.", en: "To pause/resume work when the user minimizes or returns to the app." },
    example: {
      pt: `const pararMinimizar = aoMinimizar(() => {
  console.log("Pause videos, timers ou leituras pesadas");
});

const pararVoltar = aoVoltarParaApp(() => {
  console.log("Atualize dados se precisar");
});`,
      en: `const stopMinimize = onMinimize(() => {
  console.log("Pause videos, timers or heavy reads");
});

const stopResume = onAppResume(() => {
  console.log("Refresh data if needed");
});`
    }
  },
  {
    when: { pt: "Para abrir uma tela especifica quando o APK foi chamado por link.", en: "To open a specific screen when the APK was launched from a link." },
    example: {
      pt: `const linkInicial = await obterLinkInicial();
if (linkInicial) {
  abrirNoApp("#" + linkInicial.path);
}

aoAbrirLink((link) => {
  console.log("Link recebido", link.url);
});`,
      en: `const initialLink = await getInitialLink();
if (initialLink) {
  openInApp("#" + initialLink.path);
}

onOpenLink((link) => {
  console.log("Link received", link.url);
});`
    }
  },
  {
    when: { pt: "Opcional: use antes da lanterna se quiser explicar a permissao ao usuario.", en: "Optional: use it before flashlight if you want to explain the permission." },
    example: {
      pt: `const camera = await solicitarPermissaoCamera();

if (camera.granted) {
  await lanterna(true);
} else if (camera.settingsOpened) {
  console.log("Libere Camera nas configuracoes e volte ao app");
}`,
      en: `const camera = await requestCameraPermission();

if (camera.granted) {
  await flashlight(true);
} else if (camera.settingsOpened) {
  console.log("Allow Camera in settings and return to the app");
}`
    }
  },
  {
    when: { pt: "Para gravar audio curto pelo microfone e receber o arquivo em base64.", en: "To record short audio from the microphone and receive the file as base64." },
    example: {
      pt: `const inicio = await ouvirMic();
if (inicio.settingsOpened) {
  console.log("Libere Microfone nas configuracoes e tente de novo");
  return;
}

setTimeout(async () => {
  const audio = await pararMic();
  const url = "data:" + audio.mimeType + ";base64," + audio.base64;
  new Audio(url).play();
}, 3000);`,
      en: `const start = await listenMic();
if (start.settingsOpened) {
  console.log("Allow Microphone in settings and try again");
  return;
}

setTimeout(async () => {
  const audio = await stopMic();
  const url = "data:" + audio.mimeType + ";base64," + audio.base64;
  new Audio(url).play();
}, 3000);`
    }
  },
  {
    when: { pt: "Para ligar ou desligar a lanterna. A permissao de camera e pedida automaticamente.", en: "To turn the flashlight on or off. Camera permission is requested automatically." },
    example: {
      pt: `const status = await lanterna(true);

if (status.settingsOpened) {
  console.log("Libere Camera nas configuracoes e chame lanterna(true) de novo");
} else if (!status.available) {
  await toast("Este aparelho nao tem lanterna");
}`,
      en: `const status = await flashlight(true);

if (status.settingsOpened) {
  console.log("Allow Camera in settings and call flashlight(true) again");
} else if (!status.available) {
  await toast("This device has no flashlight");
}`
    }
  },
  {
    when: { pt: "Para um botao que liga/desliga a lanterna sem guardar estado manualmente.", en: "For a button that toggles flashlight without tracking state manually." },
    example: {
      pt: `const status = await alternarLanterna();
console.log("Lanterna ligada?", status.enabled);`,
      en: `const status = await toggleFlashlight();
console.log("Flashlight on?", status.enabled);`
    }
  },
  {
    when: { pt: "Para deixar o usuario escolher uma foto da galeria ou arquivos de imagem.", en: "To let the user choose a photo from gallery or image files." },
    example: {
      pt: `const imagem = await escolherImagem();

if (imagem) {
  document.querySelector("img.preview").src = imagem.uri;
}`,
      en: `const image = await pickImage();

if (image) {
  document.querySelector("img.preview").src = image.uri;
}`
    }
  },
  {
    when: { pt: "Para galeria com selecao multipla, como anexar varias fotos.", en: "For multiple gallery selection, such as attaching many photos." },
    example: {
      pt: `const imagens = await escolherImagens({ multiplas: true });

for (const imagem of imagens) {
  console.log(imagem.nome, imagem.tamanho);
}`,
      en: `const images = await pickImages({ multiple: true });

for (const image of images) {
  console.log(image.name, image.size);
}`
    }
  },
  {
    when: { pt: "Para escolher PDF, ZIP, TXT ou qualquer tipo de documento.", en: "To choose PDF, ZIP, TXT or any document type." },
    example: {
      pt: `const pdf = await escolherArquivo({
  tipos: ["application/pdf"]
});

if (pdf) {
  console.log("PDF escolhido:", pdf.nome);
}`,
      en: `const pdf = await pickFile({
  types: ["application/pdf"]
});

if (pdf) {
  console.log("Chosen PDF:", pdf.name);
}`
    }
  },
  {
    when: { pt: "Para anexar varios arquivos de uma vez.", en: "To attach multiple files at once." },
    example: {
      pt: `const arquivos = await escolherArquivos({ multiplo: true });

const total = arquivos.reduce((soma, arquivo) => {
  return soma + (arquivo.tamanho || 0);
}, 0);

console.log("Total em bytes:", total);`,
      en: `const files = await pickFiles({ multiple: true });

const total = files.reduce((sum, file) => {
  return sum + (file.size || 0);
}, 0);

console.log("Total bytes:", total);`
    }
  },
  {
    when: { pt: "Para pedir um video do usuario sem mostrar documentos que nao sejam video.", en: "To ask the user for a video without showing non-video documents." },
    example: {
      pt: `const video = await escolherVideo();

if (video && video.tamanho > 50 * 1024 * 1024) {
  await toast("Video muito grande");
}`,
      en: `const video = await pickVideo();

if (video && video.size > 50 * 1024 * 1024) {
  await toast("Video is too large");
}`
    }
  },
  {
    when: { pt: "Para o usuario escolher uma pasta quando o Android permitir acesso por URI.", en: "To let the user choose a folder when Android allows URI access." },
    example: {
      pt: `const pasta = await escolherPasta();

if (pasta.uri) {
  console.log("Pasta escolhida:", pasta.uri);
}`,
      en: `const folder = await pickFolder();

if (folder.uri) {
  console.log("Chosen folder:", folder.uri);
}`
    }
  },
  {
    when: { pt: "Para salvar texto ou base64 em um arquivo escolhido pelo usuario.", en: "To save text or base64 to a file chosen by the user." },
    example: {
      pt: `const salvo = await salvarArquivo({
  nome: "relatorio.txt",
  mimeType: "text/plain",
  conteudo: "Conteudo do relatorio"
});

if (salvo.saved) {
  await toast("Arquivo salvo");
}`,
      en: `const saved = await saveFile({
  name: "report.txt",
  mimeType: "text/plain",
  content: "Report content"
});

if (saved.saved) {
  await toast("File saved");
}`
    }
  },
  {
    when: { pt: "Para abrir o compartilhamento nativo do Android com texto, link e arquivos.", en: "To open Android native sharing with text, link and files." },
    example: {
      pt: `const imagem = await escolherImagem();

await compartilhar({
  texto: "Veja esse app",
  url: "https://exemplo.com",
  arquivo: imagem
});`,
      en: `const image = await pickImage();

await share({
  text: "Check this app",
  url: "https://example.com",
  file: image
});`
    }
  },
  {
    when: { pt: "Para receber dados enviados pelo menu Compartilhar do Android.", en: "To receive data sent through Android's Share menu." },
    example: {
      pt: `aoReceberCompartilhamento((dados) => {
  console.log(dados.tipo, dados.uri || dados.texto);
});

const inicial = await obterCompartilhamentoInicial();`,
      en: `onShareReceived((data) => {
  console.log(data.type, data.uri || data.text);
});

const initial = await getInitialShare();`
    }
  },
  {
    when: { pt: "Para trocar objetos entre dois celulares com apps html2apk abertos.", en: "To exchange objects between two phones running html2apk apps." },
    example: {
      pt: `aoConectarBT((dispositivo) => {
  console.log("Conectado", dispositivo.nome);
});

aoReceberDadosBT((dados) => {
  console.log("Recebido", dados);
});

aoDarErroBT((erro) => {
  console.log("Erro Bluetooth", erro.mensagem || erro.message);
});

const lista = await procurarBT();
await conectarBT(lista[0].id);
await enviarBT({ mensagem: "Ola" });`,
      en: `onBluetoothConnect((device) => {
  console.log("Connected", device.name);
});

onBluetoothData((data) => {
  console.log("Received", data);
});

onBluetoothError((error) => {
  console.log("Bluetooth error", error.message);
});

const list = await scanBluetooth();
await connectBluetooth(list[0].id);
await sendBluetooth({ message: "Hello" });`
    }
  },
  {
    when: { pt: "Para trocar objetos entre dois celulares na mesma rede Wi-Fi ou hotspot.", en: "To exchange objects between two phones on the same Wi-Fi network or hotspot." },
    example: {
      pt: `aoConectarWiFi((dispositivo) => {
  console.log("Conectado por Wi-Fi", dispositivo.nome || dispositivo.host);
});

aoReceberDadosWiFi((dados) => {
  console.log("Recebido por Wi-Fi", dados);
});

aoDarErroWiFi((erro) => {
  console.log("Erro Wi-Fi", erro.mensagem || erro.message);
});

const lista = await procurarWiFi();
await conectarWiFi(lista[0].id);
await enviarWiFi({ mensagem: "Ola por Wi-Fi" });`,
      en: `onWiFiConnect((device) => {
  console.log("Connected over Wi-Fi", device.name || device.host);
});

onWiFiData((data) => {
  console.log("Received over Wi-Fi", data);
});

onWiFiError((error) => {
  console.log("Wi-Fi error", error.message);
});

const list = await scanWiFi();
await connectWiFi(list[0].id);
await sendWiFi({ message: "Hello over Wi-Fi" });`
    }
  },
  {
    when: { pt: "Para reconhecer texto de uma foto sem enviar a imagem para servidor.", en: "To recognize text from a photo without sending the image to a server." },
    example: {
      pt: `const imagem = await escolherImagem();
const resultado = await ocr(imagem);

console.log(resultado.texto);`,
      en: `const image = await pickImage();
const result = await recognizeText(image);

console.log(result.text);`
    }
  },
  {
    when: { pt: "Para falar texto e ouvir uma frase do usuario.", en: "To speak text and listen to a user phrase." },
    example: {
      pt: `await falar("Ola mundo", {
  idioma: "pt-BR",
  velocidade: 1
});

const voz = await ouvir({ idioma: "pt-BR" });
console.log(voz.texto);`,
      en: `await speak("Hello world", {
  language: "en-US",
  speed: 1
});

const voice = await recognizeSpeech({ language: "en-US" });
console.log(voice.text);`
    }
  },
  {
    when: { pt: "Para copiar dados para a area de transferencia ou ler o que esta copiado.", en: "To copy data to the clipboard or read what is copied." },
    example: {
      pt: `await copiarTexto("ABC-123");
await toast("Codigo copiado");

const copiado = await lerTextoCopiado();
console.log(copiado);`,
      en: `await copyText("ABC-123");
await toast("Code copied");

const copied = await readText();
console.log(copied);`
    }
  },
  {
    when: { pt: "Para impedir que a tela apague em leitura, video, mapa ou monitoramento.", en: "To keep screen awake during reading, video, maps or monitoring." },
    example: {
      pt: `await manterTelaLigada(true);

// Ao sair da tela:
await manterTelaLigada(false);`,
      en: `await keepScreenOn(true);

// When leaving the screen:
await keepScreenOn(false);`
    }
  },
  {
    when: { pt: "Para controlar o brilho so dentro do APK, sem mudar o brilho do sistema todo.", en: "To control brightness only inside the APK, without changing the whole system brightness." },
    example: {
      pt: `await brilhoTela(0.8);

// Restaurar comportamento padrao:
await brilhoTela(-1);`,
      en: `await setScreenBrightness(0.8);

// Restore default behavior:
await setScreenBrightness(-1);`
    }
  },
  {
    when: { pt: "Para combinar status bar/navigation bar com uma tela especifica do app.", en: "To match status/navigation bars with a specific app screen." },
    example: {
      pt: `await definirCorTema({
  statusBarColor: "#126fff",
  navigationBarColor: "#101827"
});`,
      en: `await setThemeColor({
  statusBarColor: "#126fff",
  navigationBarColor: "#101827"
});`
    }
  },
  {
    when: { pt: "Para navegar dentro do proprio WebView do APK.", en: "To navigate inside the APK WebView itself." },
    example: {
      pt: `await abrirNoApp("#/perfil");

// Sem deixar voltar para a tela anterior:
await abrirNoApp("#/login", { substituir: true });`,
      en: `await openInApp("#/profile");

// Without keeping the previous screen:
await openInApp("#/login", { replace: true });`
    }
  },
  {
    when: { pt: "Para abrir navegador, outro app ou link externo fora do APK.", en: "To open browser, another app or external link outside the APK." },
    example: {
      pt: `await abrirForaDoApp("https://exemplo.com");`,
      en: `await openOutsideApp("https://example.com");`
    }
  },
  {
    when: { pt: "Para abrir uma conversa do WhatsApp com numero e mensagem opcional.", en: "To open a WhatsApp conversation with phone number and optional message." },
    example: {
      pt: `await abrirWhatsapp(
  "559999999999",
  "Oi, vim pelo app"
);`,
      en: `await openWhatsapp(
  "559999999999",
  "Hi, I came from the app"
);`
    }
  },
  {
    when: { pt: "Para abrir o discador ou o app de mapas sem fazer a acao sozinho.", en: "To open dialer or maps without performing the action automatically." },
    example: {
      pt: `await discar("11999999999");
await abrirMapa("Avenida Paulista, Sao Paulo");`,
      en: `await dial("11999999999");
await openMap("Avenida Paulista, Sao Paulo");`
    }
  },
  {
    when: { pt: "Para diagnostico, suporte ou pequenas adaptacoes por versao do Android.", en: "For diagnostics, support or small adaptations by Android version." },
    example: {
      pt: `const aparelho = await infoDispositivo();

console.log(aparelho.modelo, aparelho.androidVersion);`,
      en: `const device = await deviceInfo();

console.log(device.model, device.androidVersion);`
    }
  },
  {
    when: { pt: "Para adaptar a UI quando ficar offline ou quando a bateria estiver baixa.", en: "To adapt the UI when offline or when battery is low." },
    example: {
      pt: `const rede = await infoRede();
const bateria = await infoBateria();

if (!rede.online) {
  await toast("Sem internet");
}`,
      en: `const network = await networkInfo();
const battery = await batteryInfo();

if (!network.online) {
  await toast("No internet");
}`
    }
  },
  {
    when: { pt: "Para saber se o app deve reduzir imagens, cache ou tarefas pesadas.", en: "To know whether the app should reduce images, cache or heavy tasks." },
    example: {
      pt: `const memoria = await infoMemoria();
const mbLivre = memoria.availableBytes / 1024 / 1024;

if (memoria.lowMemory) {
  console.log("Reduza cache. MB livre:", mbLivre);
}`,
      en: `const memory = await memoryInfo();
const freeMb = memory.availableBytes / 1024 / 1024;

if (memory.lowMemory) {
  console.log("Reduce cache. Free MB:", freeMb);
}`
    }
  },
  {
    when: { pt: "Para conferir espaco antes de baixar ou salvar arquivos grandes.", en: "To check space before downloading or saving large files." },
    example: {
      pt: `const armazenamento = await infoArmazenamento();
const livre = armazenamento.internal.availableBytes;

console.log("Livre em MB:", Math.round(livre / 1024 / 1024));`,
      en: `const storage = await storageInfo();
const free = storage.internal.availableBytes;

console.log("Free MB:", Math.round(free / 1024 / 1024));`
    }
  },
  {
    when: { pt: "Para uma tela de diagnostico com memoria, armazenamento, bateria e rede juntos.", en: "For a diagnostics screen with memory, storage, battery and network together." },
    example: {
      pt: `const desempenho = await infoDesempenho();

console.log(desempenho.memory);
console.log(desempenho.storage);
console.log(desempenho.battery);`,
      en: `const performance = await performanceInfo();

console.log(performance.memory);
console.log(performance.storage);
console.log(performance.battery);`
    }
  },
  {
    when: { pt: "Para diagnostico aproximado de processos que o Android deixa o APK enxergar.", en: "For approximate diagnostics of processes Android lets the APK see." },
    example: {
      pt: `const resultado = await appsAbertos();

for (const app of resultado.apps) {
  console.log(app.nome, app.ramMb + " MB");
}`,
      en: `const result = await openAppsMemory();

for (const app of result.apps) {
  console.log(app.name, app.ramMb + " MB");
}`
    }
  },
  {
    when: { pt: "Para ajustar volume e capturar a tela atual do app.", en: "To adjust volume and capture the current app screen." },
    example: {
      pt: `const volume = await volumeAtual();
console.log(volume.midia.atual, volume.midia.maximo);

await definirVolume("midia", 0.5, { mostrarUI: true });

const imagem = await capturarTela();
document.querySelector("img.preview").src = imagem.dataUrl;`,
      en: `const volume = await getVolume();
console.log(volume.music.current, volume.music.max);

await setVolume("music", 0.5, { showUi: true });

const image = await captureScreen();
document.querySelector("img.preview").src = image.dataUrl;`
    }
  },
  {
    when: { pt: "Para apps que precisam mostrar/esconder o icone flutuante.", en: "For apps that need to show/hide the floating icon." },
    example: {
      pt: `const status = await iniciarIconeFlutuante({ opacidade: 0.85 });

if (status.requiresSettings) {
  console.log("O Android abriu a tela de sobreposicao");
}

await definirOpacidadeIconeFlutuante(0.55);

// Para desligar:
// await pararIconeFlutuante();`,
      en: `const status = await startFloatingIcon({ opacity: 0.85 });

if (status.requiresSettings) {
  console.log("Android opened the draw-over-apps screen");
}

await setFloatingIconOpacity(0.55);

// To turn it off:
// await stopFloatingIcon();`
    }
  },
  {
    when: { pt: "Para capturar uma imagem ou video feito na hora pelo usuario.", en: "To capture an image or video made by the user right now." },
    example: {
      pt: `const foto = await tirarFoto({ base64: true });

if (foto.base64) {
  document.querySelector("img.preview").src =
    "data:" + foto.mimeType + ";base64," + foto.base64;
}`,
      en: `const photo = await takePhoto({ base64: true });

if (photo.base64) {
  document.querySelector("img.preview").src =
    "data:" + photo.mimeType + ";base64," + photo.base64;
}`
    }
  },
  {
    when: { pt: "Para ler um QR Code quando o WebView do aparelho oferecer BarcodeDetector.", en: "To read a QR code when the device WebView provides BarcodeDetector." },
    example: {
      pt: `try {
  const qr = await escanearQRCode();
  if (qr) {
    console.log("QR:", qr.text);
  }
} catch (erro) {
  await toast("Digite ou cole o codigo");
}`,
      en: `try {
  const qr = await scanQRCode();
  if (qr) {
    console.log("QR:", qr.text);
  }
} catch (error) {
  await toast("Type or paste the code");
}`
    }
  },
  {
    when: { pt: "Para gravar e recuperar uma variavel pelo nome, sem abrir seletor de arquivo.", en: "To save and recover a variable by name, without opening a file picker." },
    example: {
      pt: `await salvarArquivo("perfil.json", {
  nome: "Ana",
  plano: "premium"
});

const perfil = await lerArquivo("perfil.json");
console.log(perfil.nome);

const arquivos = await listarArquivos();`,
      en: `await saveFile("profile.json", {
  name: "Ana",
  plan: "premium"
});

const profile = await readFile("profile.json");
console.log(profile.name);

const files = await listFiles();`
    }
  },
  {
    when: { pt: "Para baixar um PDF ou imagem e abrir/compartilhar depois.", en: "To download a PDF or image and open/share it later." },
    example: {
      pt: `await baixarArquivo(
  "https://exemplo.com/relatorio.pdf",
  "relatorio.pdf"
);

await baixarArquivo(
  "https://exemplo.com/foto.png",
  "foto.png",
  { galeria: true }
);

await abrirArquivo("relatorio.pdf");
// await compartilharArquivo("relatorio.pdf");`,
      en: `await downloadFile(
  "https://example.com/report.pdf",
  "report.pdf"
);

await downloadFile(
  "https://example.com/photo.png",
  "photo.png",
  { gallery: true }
);

await openFile("report.pdf");
// await shareFile("report.pdf");`
    }
  },
  {
    when: { pt: "Para transformar base64 ou um arquivo escolhido em download com barra de progresso.", en: "To turn base64 or a picked file into a download with a progress bar." },
    example: {
      pt: `await baixarBase64("pixel.png", base64, {
  mimeType: "image/png",
  galeria: true
});

const arquivo = await escolherArquivo();
if (arquivo) {
  await baixarArquivoLocal(arquivo, "copia-" + arquivo.name);
}`,
      en: `await downloadBase64("pixel.png", base64, {
  mimeType: "image/png",
  gallery: true
});

const file = await pickFile();
if (file) {
  await downloadLocalFile(file, "copy-" + file.name);
}`
    }
  },
  {
    when: { pt: "Para preencher mapa, check-in ou entrega usando localizacao atual.", en: "To fill maps, check-ins or delivery flows using current location." },
    example: {
      pt: `const local = await obterLocalizacao({
  altaPrecisao: true,
  timeoutMs: 10000
});

if (local.latitude) {
  console.log(local.latitude, local.longitude);
}

const watch = await acompanharLocalizacao();
const parar = aoMudarLocalizacao(console.log);

// Ao sair da tela:
await pararLocalizacao(watch.watchId);
parar();`,
      en: `const location = await getLocation({
  highAccuracy: true,
  timeoutMs: 10000
});

if (location.latitude) {
  console.log(location.latitude, location.longitude);
}

const watch = await watchLocation();
const stopEvent = onLocationChange(console.log);

// When leaving the screen:
await stopLocationWatch(watch.watchId);
stopEvent();`
    }
  },
  {
    when: { pt: "Para confirmar uma acao sensivel antes de abrir dados ou finalizar pagamento.", en: "To confirm a sensitive action before opening data or finishing payment." },
    example: {
      pt: `const bio = await autenticarBiometria({
  titulo: "Confirmar acesso",
  descricao: "Use a biometria do aparelho"
});

if (bio.authenticated) {
  abrirNoApp("#/seguro");
}`,
      en: `const bio = await authenticateBiometric({
  title: "Confirm access",
  description: "Use this device biometrics"
});

if (bio.authenticated) {
  openInApp("#/secure");
}`
    }
  },
  {
    when: { pt: "Para exigir a senha/PIN/padrao da tela de bloqueio do aparelho.", en: "To require the device's lock screen PIN/pattern/password." },
    example: {
      pt: `const auth = await solicitarBloqueio({
  titulo: "Acesso Restrito",
  descricao: "Confirme a senha de tela"
});

if (auth.autenticado) {
  abrirNoApp("#/area-secreta");
} else if (!auth.suportado) {
  toast("Aparelho sem senha configurada");
}`,
      en: `const auth = await requestDeviceLock({
  title: "Restricted Access",
  description: "Confirm device password"
});

if (auth.authenticated) {
  openInApp("#/secret-area");
} else if (!auth.supported) {
  toast("Device has no secure lock screen");
}`
    }
  },
  {
    when: { pt: "Para manter o app ativo em segundo plano ou inicia-lo ao ligar (alarmes, rastreadores).", en: "To keep the app active in background or start on boot (alarms, trackers)." },
    example: {
      pt: `const resultado = await solicitarSegundoPlano();

if (resultado.abriuInicioAutomatico) {
  toast("Ligue a chave do nosso aplicativo");
} else if (resultado.abriuOtimizacaoBateria) {
  toast("Selecione 'Nao Otimizar' ou 'Sem Restricoes'");
} else {
  toast("Tudo pronto, permissao ja ativa!");
}`,
      en: `const result = await requestBackgroundExecution();

if (result.openedAutoStart) {
  toast("Turn on the switch for our application");
} else if (result.openedBatteryOptimization) {
  toast("Select 'No Restrictions' or 'Don't Optimize'");
} else {
  toast("All set, permission already granted!");
}`
    }
  },
  {
    when: { pt: "Para fazer o app abrir sozinho na tela do usuario assim que o celular for ligado.", en: "To make the app automatically open on the user's screen as soon as the device boots." },
    example: {
      pt: `// 1. Opcional mas recomendado: pedir permissao de sobreposicao
// para nao ser bloqueado no Android 10+
await abrirSobreposicao();

// 2. Ligar a chave
await configurarInicioAutomatico(true);

// 3. Ao iniciar seu app, use o ouvinte para se esconder:
aoLigarDispositivo(async () => {
  console.log("App abriu sozinho pelo boot!");
  await minimizarApp(); // Esconde a tela na mesma hora
});`,
      en: `// 1. Optional but recommended: request overlay permission
// to avoid being blocked on Android 10+
await openOverlay();

// 2. Turn on the switch
await setAutoStartOnBoot(true);

// 3. When starting your app, use the listener:
onDeviceBoot(async () => {
  console.log("App opened automatically by boot!");
  await minimizeApp(); // Hides the app silently
});`
    }
  },
  {
    when: { pt: "Para guardar tokens ou preferencias sensiveis cifradas pelo Android Keystore.", en: "To store tokens or sensitive preferences encrypted by Android Keystore." },
    example: {
      pt: `await salvarSeguro("token", "abc123");

const token = await lerSeguro("token");
console.log(token);

await removerSeguro("token");`,
      en: `await saveSecure("token", "abc123");

const token = await readSecure("token");
console.log(token);

await deleteSecure("token");`
    }
  },
  {
    when: { pt: "Para guardar temporariamente dados como token de login nativo, que não precisam de armazenamento forte mas devem sobreviver a F5 no app.", en: "To temporarily store data such as a native login token, which does not need strong storage but must survive an app F5 reload." },
    example: {
      pt: `await salvarNaSessao("usuario", "Caio");

const usr = await lerDaSessao("usuario");
console.log(usr);

// Listar todas as sessoes ativas:
const tudo = await listarSessao();
console.log(tudo);`,
      en: `await sessionSet("user", "Caio");

const usr = await sessionGet("user");
console.log(usr);

// List all active sessions:
const all = await sessionGetAll();
console.log(all);`
    }
  }
];

const state = {
  language: localStorage.getItem("html2apk.language") || null,
  theme: localStorage.getItem("html2apk.theme") || "light",
  project: null,
  doctorOk: false,
  environmentOk: false,
  environmentChecking: false,
  environmentFailed: false,
  settingsValid: false,
  buildRunning: false,
  lastApkPath: null,
  lastDistPath: null,
  defaultIconPath: "",
  fileTree: [],
  currentFilePath: "",
  currentFileLanguage: "text",
  currentFileDirty: false,
  animationTimer: null,
  progress: 0,
  nativeCodeCategory: localStorage.getItem("html2apk.nativeCodeCategory") || "all",
  logsVisible: localStorage.getItem("html2apk.logsVisible") === "true"
};

const elements = {};

function $(id) {
  return document.getElementById(id);
}

function text(key) {
  return i18n[state.language || "pt"][key] || i18n.pt[key] || key;
}

function collectElements() {
  [
    "creditOverlay",
    "languageOverlay",
    "dragRegion",
    "appVersion",
    "themeToggle",
    "themeToggleLarge",
    "themeName",
    "dropZone",
    "urlZone",
    "homeUrlInput",
    "importJsonButton",
    "urlField",
    "selectFolderButton",
    "nextSettingsButton",
    "projectSummary",
    "projectName",
    "projectPath",
    "configStatus",
    "entryStatus",
    "entryPath",
    "doctorButton",
    "buildButton",
    "usbDebugButton",
    "appNameInput",
    "packageIdInput",
    "versionInput",
    "urlInput",
    "buildFormatInput",
    "modeInput",
    "orientationInput",
    "minSdkVersionInput",
    "endpointNotificationInput",
    "timeNotificationInput",
    "androidPlatformInput",
    "themeModeInput",
    "themeColorInput",
    "themeColorTextInput",
    "oneSignalAppIdInput",
    "permissionGrid",
    "iconPathInput",
    "iconPreview",
    "selectIconButton",
    "keystorePathInput",
    "selectKeystoreButton",
    "keystoreAliasInput",
    "keystoreStorePasswordInput",
    "keystoreKeyPasswordInput",
    "settingsValidation",
    "settingsNextButton",
    "debugInput",
    "runtimeLogsInput",
    "releaseInput",
    "stepFolderText",
    "stepSettingsText",
    "stepDoctorText",
    "stepBuildText",
    "progressText",
    "progressBar",
    "progressPercent",
    "reviewGrid",
    "nativeCodeCategories",
    "nativeCodeSummary",
    "nativeCodeGrid",
    "nativeFunctionLabButton",
    "resultPanel",
    "apkPath",
    "openDistButton",
    "showApkButton",
    "successTitle",
    "successText",
    "successApkPath",
    "successOpenDistButton",
    "successShowApkButton",
    "newBuildButton",
    "newFileButton",
    "saveFileButton",
    "fileTree",
    "currentFileName",
    "fileLanguageBadge",
    "fileEditorInput",
    "fileHighlight",
    "viewLogs",
    "logConsole",
    "bottomLogConsole",
    "clearLogsButton",
    "viewLogcat",
    "logcatConsole",
    "toggleLogcatButton",
    "clearLogcatButton",
    "logcatFilter",
    "toggleLogsButton",
    "bottomToggleLogsButton",
    "bottomClearLogsButton",
    "devInstagramButton",
    "minimizeButton",
    "maximizeButton",
    "closeButton",
    "statusDot",
    "statusText"
  ].forEach((id) => {
    elements[id] = $(id);
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("html2apk.theme", state.theme);
  elements.themeName.textContent = state.theme === "dark" ? text("themeDark") : text("themeLight");
  api.setWindowTheme(state.theme).catch(() => {});
}

function applyLanguage() {
  document.documentElement.lang = state.language === "en" ? "en" : "pt-BR";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = text(node.dataset.i18n);
  });
  document.querySelectorAll("[data-language-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.languageChoice === state.language);
  });
  applyTheme();
  applyLogBarVisibility();
  renderPermissionOptions(selectedPermissions());
  renderNativeCodeGrid();
  renderFileTree();
  if (state.currentFilePath && elements.currentFileName) {
    elements.currentFileName.textContent = `${state.currentFilePath}${state.currentFileDirty ? " *" : ""}`;
  } else if (elements.currentFileName) {
    elements.currentFileName.textContent = text("noFileSelected");
  }
  if (state.project) {
    validateSettings();
    renderReview();
  }
}

function setStatus(kind, message) {
  elements.statusDot.classList.remove("busy", "error");
  if (kind === "busy") {
    elements.statusDot.classList.add("busy");
  }
  if (kind === "error") {
    elements.statusDot.classList.add("error");
  }
  elements.statusText.textContent = message;
}

function setView(viewName) {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });
}

function appendLogTo(container, line, kind) {
  if (!container) {
    return;
  }

  const node = document.createElement("div");
  node.className = `log-line ${kind}`;
  const time = new Date().toLocaleTimeString();
  node.textContent = `[${time}] ${line}`;
  container.appendChild(node);

  while (container.children.length > 500) {
    container.removeChild(container.firstChild);
  }

  container.scrollTop = container.scrollHeight;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function appendLog(line, kind = "raw") {
  const lines = String(line || "").split(/\r?\n/).filter(Boolean);
  for (const item of lines) {
    appendLogTo(elements.logConsole, item, kind);
    appendLogTo(elements.bottomLogConsole, item, kind);
  }
}

function applyLogBarVisibility() {
  document.body.classList.toggle("logs-visible", state.logsVisible);
  localStorage.setItem("html2apk.logsVisible", state.logsVisible ? "true" : "false");
  const label = text(state.logsVisible ? "hideLogs" : "showLogs");

  [elements.toggleLogsButton, elements.bottomToggleLogsButton].forEach((button) => {
    if (!button) {
      return;
    }

    button.textContent = label;
    button.setAttribute("aria-expanded", String(state.logsVisible));
  });
}

function toggleLogBar() {
  state.logsVisible = !state.logsVisible;
  applyLogBarVisibility();
}

function showLogBar() {
  if (state.logsVisible) {
    return;
  }

  state.logsVisible = true;
  applyLogBarVisibility();
}

function clearLogs() {
  elements.logConsole.innerHTML = "";
  if (elements.bottomLogConsole) {
    elements.bottomLogConsole.innerHTML = "";
  }
  appendLog(text("logsCleared"), "system");
}

let isLogcatRunning = false;

function appendLogcatData(data) {
  const line = document.createElement("div");
  line.className = "log-line";
  
  if (data.includes(" E ") || data.includes("Error") || data.toLowerCase().includes("failed") || data.includes("Exception")) {
    line.classList.add("error");
  } else if (data.includes(" W ") || data.includes("Warning")) {
    line.classList.add("warning");
  } else if (data.includes(" D ") || data.includes("Debug")) {
    line.classList.add("debug");
  }

  line.textContent = data.trimEnd();
  elements.logcatConsole.appendChild(line);

  if (elements.logcatConsole.children.length > 2000) {
    elements.logcatConsole.removeChild(elements.logcatConsole.firstChild);
  }

  elements.logcatConsole.scrollTop = elements.logcatConsole.scrollHeight;
}

function clearLogcat() {
  elements.logcatConsole.innerHTML = "";
}

function toggleLogcat() {
  if (isLogcatRunning) {
    api.stopLogcat();
    isLogcatRunning = false;
    elements.toggleLogcatButton.textContent = "Iniciar Captura";
    elements.toggleLogcatButton.classList.replace("danger-action", "primary-action");
    appendLogcatData("[Sistema] Captura interrompida.");
  } else {
    clearLogcat();
    const filter = elements.logcatFilter.value.trim();
    api.startLogcat(filter);
    isLogcatRunning = true;
    elements.toggleLogcatButton.textContent = "Parar Captura";
    elements.toggleLogcatButton.classList.replace("primary-action", "danger-action");
    appendLogcatData(`[Sistema] Iniciando captura de logs (Filtro: ${filter || "Nenhum"})...`);
  }
}

function setStep(step, status, message) {
  const card = document.querySelector(`[data-step="${step}"]`);
  if (!card) {
    return;
  }
  card.classList.remove("active", "done", "error");
  if (status) {
    card.classList.add(status);
  }
  const targets = {
    folder: "stepFolderText",
    settings: "stepSettingsText",
    doctor: "stepDoctorText",
    build: "stepBuildText"
  };
  const target = elements[targets[step]];
  if (target) {
    target.textContent = message || "-";
  }
}

function setProgress(percent, message, stateClass = "") {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  state.progress = safePercent;

  if (elements.progressBar) {
    elements.progressBar.style.width = `${safePercent}%`;
    elements.progressBar.classList.remove("active", "error");
    if (stateClass) {
      elements.progressBar.classList.add(stateClass);
    }
  }

  if (elements.progressPercent) {
    elements.progressPercent.textContent = `${safePercent}%`;
  }

  if (elements.progressText) {
    elements.progressText.textContent = message;
  }
}

function updateActionButtons() {
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';
  const hasProject = Boolean(state.project) || isUrlSource;
  const isBusy = state.environmentChecking || state.buildRunning;

  elements.nextSettingsButton.disabled = !hasProject || isBusy || !state.environmentOk || (isUrlSource && !elements.homeUrlInput.value.trim());
  elements.doctorButton.disabled = !hasProject || isBusy;
  elements.settingsNextButton.disabled = !hasProject || !state.settingsValid || !state.environmentOk || isBusy;
  elements.newFileButton.disabled = !state.project;
  elements.nativeFunctionLabButton.disabled = isBusy;
  setBuildButtons(hasProject && state.settingsValid && state.environmentOk && !isBusy);
}

function setBuildButtons(enabled) {
  elements.buildButton.disabled = !enabled;
  elements.usbDebugButton.disabled = !enabled;
}

function packageSegment(value) {
  return String(value || "app")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^[^a-z]+/, "") || "app";
}

function normalizeHexColor(value, fallback = "#126fff") {
  const textValue = String(value || "").trim();
  const normalized = textValue.startsWith("#") ? textValue : `#${textValue}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
}

function currentLanguage() {
  return state.language || "pt";
}

function toFileUrl(filePath) {
  if (!filePath) {
    return "../../../html2apk.png";
  }
  return `file:///${String(filePath).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function defaultIconPath() {
  return state.defaultIconPath || "";
}

function isAbsolutePath(filePath) {
  return /^[a-zA-Z]:[\\/]/.test(String(filePath || "")) || String(filePath || "").startsWith("/");
}

function iconPreviewPath(iconPath) {
  if (!iconPath) {
    return "../../../html2apk.png";
  }
  if (isAbsolutePath(iconPath)) {
    return toFileUrl(iconPath);
  }
  return toFileUrl(`${state.project.projectRoot}\\${iconPath}`);
}

function displayIconValue(iconPath) {
  const value = String(iconPath || "").trim();
  if (!value || (state.defaultIconPath && value === state.defaultIconPath)) {
    return text("defaultIcon");
  }
  return value;
}

function isConfigFilePath(filePath) {
  return /(^|[\\/])(app|config)\.json$/i.test(String(filePath || ""));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syntaxToken(type, value) {
  return `<span class="syntax-token-${type}">${escapeHtml(value)}</span>`;
}

function highlightByRegex(value, regex, classify) {
  const source = String(value || "");
  let html = "";
  let cursor = 0;

  source.replace(regex, (match, ...args) => {
    const index = args[args.length - 2];
    const tokenType = classify(match, index, source);
    html += escapeHtml(source.slice(cursor, index));
    html += tokenType ? syntaxToken(tokenType, match) : escapeHtml(match);
    cursor = index + match.length;
    return match;
  });

  html += escapeHtml(source.slice(cursor));
  return html;
}

function highlightJavaScript(value) {
  const keywordList = [
    "await", "async", "break", "case", "catch", "class", "const", "continue", "default", "delete",
    "do", "else", "export", "extends", "false", "finally", "for", "from", "function", "if",
    "import", "in", "instanceof", "let", "new", "null", "return", "super", "switch", "this",
    "throw", "true", "try", "typeof", "undefined", "var", "void", "while", "yield"
  ];
  const keywords = new Set(keywordList);
  const keywordPattern = keywordList.join("|");
  const regex = new RegExp("\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n\\r]*|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`|\\b\\d+(?:\\.\\d+)?\\b|\\b(?:" + keywordPattern + ")\\b|\\b[A-Za-z_$][\\w$]*(?=\\s*\\()", "g");

  return highlightByRegex(value, regex, (match) => {
    if (match.startsWith("//") || match.startsWith("/*")) {
      return "comment";
    }
    if (match.startsWith("\"") || match.startsWith("'") || match.startsWith("`")) {
      return "string";
    }
    if (/^\d/.test(match)) {
      return "number";
    }
    if (keywords.has(match)) {
      return "keyword";
    }
    return "function";
  });
}

function highlightHtmlLike(value) {
  return highlightByRegex(value, /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[a-zA-Z][^>]*?>/gi, (match) => {
    if (match.startsWith("<!--")) {
      return "comment";
    }
    return "tag";
  });
}

function highlightCss(value) {
  const regex = /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b|[a-zA-Z-]+(?=\s*:)|[.#]?[a-zA-Z0-9_-]+(?=[^{;]*\{)/g;
  return highlightByRegex(value, regex, (match) => {
    if (match.startsWith("/*")) {
      return "comment";
    }
    if (match.startsWith("\"") || match.startsWith("'")) {
      return "string";
    }
    if (match.startsWith("#") || /^\d/.test(match)) {
      return "number";
    }
    if (/^[a-zA-Z-]+$/.test(match)) {
      return "keyword";
    }
    return "tag";
  });
}

function highlightJson(value) {
  const regex = /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\b(?:true|false|null)\b/gi;
  return highlightByRegex(value, regex, (match, index, source) => {
    if (match.startsWith("\"")) {
      return /^\s*:/.test(source.slice(index + match.length)) ? "keyword" : "string";
    }
    if (/^(true|false|null)$/i.test(match)) {
      return "keyword";
    }
    return "number";
  });
}

function highlightSource(value, language) {
  const lang = String(language || "").toLowerCase();

  if (["html", "xml", "svg"].includes(lang)) {
    return highlightHtmlLike(value);
  }
  if (["js", "mjs", "cjs", "ts", "tsx", "jsx"].includes(lang)) {
    return highlightJavaScript(value);
  }
  if (lang === "css") {
    return highlightCss(value);
  }
  if (lang === "json") {
    return highlightJson(value);
  }

  return escapeHtml(value);
}

function updateFilePreview() {
  if (!elements.fileHighlight || !elements.fileEditorInput) {
    return;
  }

  const value = elements.fileEditorInput.value || "";
  const highlighted = highlightSource(value.length ? value : " ", state.currentFileLanguage);
  elements.fileHighlight.innerHTML = `<code>${highlighted}</code>`;
  syncFileEditorHighlightScroll();
}

function syncFileEditorHighlightScroll() {
  if (!elements.fileHighlight || !elements.fileEditorInput) {
    return;
  }

  elements.fileHighlight.scrollTop = elements.fileEditorInput.scrollTop;
  elements.fileHighlight.scrollLeft = elements.fileEditorInput.scrollLeft;
}

function setCurrentFileDirty(value) {
  state.currentFileDirty = Boolean(value);
  elements.saveFileButton.disabled = !state.currentFilePath || !state.currentFileDirty;
  if (state.currentFilePath) {
    elements.currentFileName.textContent = `${state.currentFilePath}${state.currentFileDirty ? " *" : ""}`;
  }
}

function renderFileNodes(nodes, depth = 0) {
  return (nodes || []).map((node) => {
    const padding = 8 + (depth * 16);
    if (node.type === "directory") {
      return `
        <div class="folder-row" style="padding-left:${padding}px">${escapeHtml(node.name)}</div>
        ${renderFileNodes(node.children, depth + 1)}
      `;
    }

    const active = node.path === state.currentFilePath ? " active" : "";
    const disabled = node.editable ? "" : " disabled";
    const marker = node.editable ? "file" : "bin";
    return `
      <button class="file-row${active}" type="button" style="padding-left:${padding}px" data-file-path="${escapeHtml(node.path)}"${disabled}>
        <span>${marker}</span>
        <strong>${escapeHtml(node.name)}</strong>
      </button>
    `;
  }).join("");
}

function renderFileTree() {
  if (!elements.fileTree) {
    return;
  }

  if (!state.project) {
    elements.fileTree.className = "file-tree-empty";
    elements.fileTree.textContent = text("chooseProjectFirst");
    return;
  }

  if (!state.fileTree.length) {
    elements.fileTree.className = "file-tree-empty";
    elements.fileTree.textContent = text("missing");
    return;
  }

  elements.fileTree.className = "file-tree";
  elements.fileTree.innerHTML = renderFileNodes(state.fileTree);
}

async function refreshProjectFiles() {
  if (!state.project || !api.listProjectFiles) {
    renderFileTree();
    return;
  }

  try {
    state.fileTree = await api.listProjectFiles(state.project.projectRoot);
    renderFileTree();
  } catch (error) {
    appendLog(`${text("projectWatcherFail")}: ${error.message}`, "error");
  }
}

async function openProjectFile(relativePath) {
  if (!state.project || !relativePath) {
    return;
  }

  if (state.currentFileDirty && !window.confirm(text("unsavedFileConfirm"))) {
    return;
  }

  try {
    const file = await api.readProjectFile(state.project.projectRoot, relativePath);
    state.currentFilePath = file.path;
    state.currentFileLanguage = file.language || "text";
    elements.currentFileName.textContent = file.path;
    elements.fileLanguageBadge.textContent = state.currentFileLanguage;
    elements.fileEditorInput.disabled = false;
    elements.fileEditorInput.value = file.content || "";
    elements.fileEditorInput.scrollTop = 0;
    elements.fileEditorInput.scrollLeft = 0;
    setCurrentFileDirty(false);
    updateFilePreview();
    renderFileTree();
  } catch (error) {
    appendLog(`${text("fileOpenFail")}: ${error.message}`, "error");
    setStatus("error", text("fileOpenFail"));
  }
}

async function saveCurrentFile() {
  if (!state.project || !state.currentFilePath) {
    return;
  }

  try {
    await api.writeProjectFile(state.project.projectRoot, state.currentFilePath, elements.fileEditorInput.value);
    setCurrentFileDirty(false);
    appendLog(`${text("fileSaved")}: ${state.currentFilePath}`, "success");
    await refreshProjectFiles();
  } catch (error) {
    appendLog(`${text("fileSaveFail")}: ${error.message}`, "error");
    setStatus("error", text("fileSaveFail"));
  }
}

async function createNewProjectFile() {
  if (!state.project) {
    setStatus("error", text("chooseProjectFirst"));
    return;
  }

  const relativePath = window.prompt(text("newFilePrompt"), "js/app.js");
  if (!relativePath) {
    return;
  }

  try {
    const file = await api.createProjectFile(state.project.projectRoot, relativePath);
    appendLog(`${text("fileCreated")}: ${file.path}`, "success");
    await refreshProjectFiles();
    await openProjectFile(file.path);
  } catch (error) {
    appendLog(`${text("fileSaveFail")}: ${error.message}`, "error");
    setStatus("error", text("fileSaveFail"));
  }
}

const nativeCodeRecipeCache = new Map();

function localizedRecipeText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return [value.pt, value.en].filter(Boolean).join("\n");
}

function recipeSearchText(recipe) {
  return [
    localizedRecipeText(recipe && recipe.when),
    localizedRecipeText(recipe && recipe.example)
  ].join("\n");
}

function primaryCodeKey(entry) {
  const syntax = entry && entry.syntax
    ? entry.syntax.pt || entry.syntax.en || ""
    : "";
  const match = String(syntax).match(/([A-Za-z_$][\w$]*)\s*\(/);
  return match ? match[1] : "";
}

function findRecipeForEntry(entry) {
  const key = primaryCodeKey(entry);

  if (!key) {
    return null;
  }

  if (nativeCodeRecipeCache.has(key)) {
    return nativeCodeRecipeCache.get(key);
  }

  const normalizedKey = key.toLowerCase();
  const recipe = nativeCodeRecipes.find((item) => {
    return recipeSearchText(item).toLowerCase().includes(normalizedKey);
  }) || null;

  nativeCodeRecipeCache.set(key, recipe);
  return recipe;
}

function recipeForCode(index) {
  const language = currentLanguage();
  const entry = nativeCodeEntries[index] || {};
  const recipe = entry.recipe || findRecipeForEntry(entry) || {};
  return {
    when: recipe.when ? recipe.when[language] || recipe.when.pt : "",
    example: recipe.example ? recipe.example[language] || recipe.example.pt : ""
  };
}

async function copyToClipboard(value) {
  const textValue = String(value || "");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(textValue);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = textValue;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function handleNativeCodeCopy(event) {
  const categoryButton = event.target.closest("[data-code-category]");
  if (categoryButton) {
    state.nativeCodeCategory = categoryButton.dataset.codeCategory || "all";
    localStorage.setItem("html2apk.nativeCodeCategory", state.nativeCodeCategory);
    renderNativeCodeGrid();
    return;
  }

  const button = event.target.closest("[data-copy-code]");
  if (!button) {
    return;
  }

  const index = Number.parseInt(button.dataset.copyCode, 10);
  const recipe = recipeForCode(index);
  if (!recipe.example) {
    return;
  }

  const originalText = button.textContent;
  try {
    await copyToClipboard(recipe.example);
    button.textContent = text("copiedCode");
    button.classList.add("copied");
  } catch (error) {
    button.textContent = text("copyFailed");
    button.classList.add("copy-error");
  }

  setTimeout(() => {
    button.textContent = originalText || text("copyCode");
    button.classList.remove("copied", "copy-error");
  }, 1400);
}

function selectedOptionText(select) {
  if (!select || !select.selectedOptions || !select.selectedOptions.length) {
    return select ? select.value : "";
  }
  return select.selectedOptions[0].textContent || select.value;
}

function selectedPermissions() {
  if (!elements.permissionGrid) {
    return DEFAULT_PERMISSIONS.slice();
  }

  const inputs = Array.from(elements.permissionGrid.querySelectorAll("input[data-permission-option]"));
  if (!inputs.length) {
    return DEFAULT_PERMISSIONS.slice();
  }

  const selected = inputs
    .filter((input) => input.checked)
    .map((input) => input.value);

  if (elements.modeInput && elements.modeInput.value === "floating" && !selected.includes("SYSTEM_ALERT_WINDOW")) {
    selected.push("SYSTEM_ALERT_WINDOW");
  }

  return Array.from(new Set(selected));
}

function renderPermissionOptions(selected = DEFAULT_PERMISSIONS) {
  if (!elements.permissionGrid) {
    return;
  }

  const selectedSet = new Set(selected);
  if (elements.modeInput && elements.modeInput.value === "floating") {
    selectedSet.add("SYSTEM_ALERT_WINDOW");
  }
  const language = currentLanguage();

  elements.permissionGrid.innerHTML = permissionOptions.map((permission) => {
    const checked = selectedSet.has(permission.value) ? " checked" : "";
    const disabled = elements.modeInput && elements.modeInput.value === "floating" && permission.value === "SYSTEM_ALERT_WINDOW"
      ? " disabled"
      : "";

    return `
      <label class="permission-option">
        <input type="checkbox" data-permission-option value="${escapeHtml(permission.value)}"${checked}${disabled}>
        <span>
          <strong>${escapeHtml(permission.label[language] || permission.label.pt)}</strong>
          <small>${escapeHtml(permission.detail[language] || permission.detail.pt)}</small>
        </span>
      </label>
    `;
  }).join("");
}

function normalizeOrientationInputValue(value) {
  if (value === "vertical") {
    return "portrait";
  }
  if (value === "horizontal") {
    return "landscape";
  }
  return ["portrait", "landscape"].includes(value) ? value : "default";
}

function normalizeMinSdkVersion(value) {
  const parsed = Number.parseInt(value, 10);
  return MIN_SDK_OPTIONS.includes(parsed) ? parsed : DEFAULT_MIN_SDK_VERSION;
}

function normalizeThemeMode(value) {
  return String(value || "").trim().toLowerCase() === "auto" ? "auto" : "fixed";
}

function normalizeBuildFormat(value) {
  return String(value || "").trim().toLowerCase() === "aab" ? "aab" : "apk";
}

function normalizeOneSignalAppId(value) {
  return String(value || "").trim();
}

function keystoreFromConfig(config = {}) {
  const keystore = config.keystore && typeof config.keystore === "object" ? config.keystore : {};
  return {
    path: String(keystore.path || "").trim(),
    alias: String(keystore.alias || "").trim(),
    storePassword: String(keystore.storePassword || keystore.password || "").trim(),
    keyPassword: String(keystore.keyPassword || keystore.password || "").trim()
  };
}

function keystoreFromInputs() {
  return {
    path: elements.keystorePathInput.value.trim(),
    alias: elements.keystoreAliasInput.value.trim(),
    storePassword: elements.keystoreStorePasswordInput.value,
    keyPassword: elements.keystoreKeyPasswordInput.value
  };
}

function hasAnyKeystoreField(keystore) {
  return Boolean(keystore.path || keystore.alias || keystore.storePassword || keystore.keyPassword);
}

function hasCompleteKeystore(keystore) {
  return Boolean(keystore.path && keystore.alias && keystore.storePassword && keystore.keyPassword);
}

function oneSignalAppIdFromConfig(config = {}) {
  return normalizeOneSignalAppId(
    config.oneSignalAppId
      || config.onesignalAppId
      || (config.oneSignal && config.oneSignal.appId)
      || (config.onesignal && config.onesignal.appId)
      || ""
  );
}

function isValidOptionalOneSignalAppId(value) {
  const appId = normalizeOneSignalAppId(value);
  return appId.length === 0 || /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(appId);
}

function renderNativeCodeGrid() {
  if (!elements.nativeCodeGrid) {
    return;
  }

  const language = currentLanguage();
  const activeCategory = nativeCodeCategories.some((category) => category.id === state.nativeCodeCategory)
    ? state.nativeCodeCategory
    : "all";
  state.nativeCodeCategory = activeCategory;
  const categoryCounts = nativeCodeEntries.reduce((counts, entry) => {
    const category = entry.category || "device";
    counts[category] = (counts[category] || 0) + 1;
    counts.all = (counts.all || 0) + 1;
    return counts;
  }, {});
  const activeCategoryMeta = nativeCodeCategories.find((category) => category.id === activeCategory) || nativeCodeCategories[0];
  const visibleEntries = nativeCodeEntries
    .map((entry, index) => ({ entry, index }))
    .filter((item) => activeCategory === "all" || item.entry.category === activeCategory);
  const javaLabel = text("javaLabel");
  const doesLabel = text("doesLabel");
  const whenUseLabel = text("whenUseLabel");
  const returnsLabel = text("returnsLabel");
  const handlingLabel = text("handlingLabel");
  const exampleLabel = text("exampleLabel");
  const copyCodeLabel = text("copyCode");

  if (elements.nativeCodeCategories) {
    elements.nativeCodeCategories.innerHTML = nativeCodeCategories.map((category) => {
      const title = category.title[language] || category.title.pt;
      const description = category.description[language] || category.description.pt;
      const count = categoryCounts[category.id] || 0;
      const active = category.id === activeCategory ? " active" : "";
      return `
        <button type="button" class="code-category-button${active}" data-code-category="${escapeHtml(category.id)}" aria-pressed="${category.id === activeCategory}">
          <strong>${escapeHtml(title)}</strong>
          <span class="code-category-count">${count}</span>
          <small>${escapeHtml(description)}</small>
        </button>
      `;
    }).join("");
  }

  if (elements.nativeCodeSummary) {
    const title = activeCategoryMeta.title[language] || activeCategoryMeta.title.pt;
    const description = activeCategoryMeta.description[language] || activeCategoryMeta.description.pt;
    elements.nativeCodeSummary.innerHTML = `
      <strong>${escapeHtml(title)} · ${escapeHtml(text("codesShowing"))} ${visibleEntries.length} ${escapeHtml(text("codesItems"))}</strong>
      <p>${escapeHtml(description)}</p>
    `;
  }

  elements.nativeCodeGrid.innerHTML = visibleEntries.map(({ entry, index }) => {
    const syntax = entry.syntax ? entry.syntax[language] || entry.syntax.pt : entry.js;
    const description = entry.description[language] || entry.description.pt;
    const returns = entry.returns[language] || entry.returns.pt;
    const handling = entry.handling[language] || entry.handling.pt;
    const recipe = recipeForCode(index);
    const highlightedSyntax = highlightSource(syntax, "js");
    const highlightedExample = recipe.example ? highlightSource(recipe.example, "js") : "";

    return `
    <article class="code-card">
      <div class="code-card-top">
        <code class="syntax-inline">${highlightedSyntax}</code>
        <span>${escapeHtml(javaLabel)}: ${escapeHtml(entry.java)}</span>
      </div>
      <p><strong>${escapeHtml(doesLabel)}:</strong> ${escapeHtml(description)}</p>
      <small><strong>${escapeHtml(whenUseLabel)}:</strong> ${escapeHtml(recipe.when)}</small>
      <small><strong>${escapeHtml(returnsLabel)}:</strong> ${escapeHtml(returns)}</small>
      <small class="handling"><strong>${escapeHtml(handlingLabel)}:</strong> ${escapeHtml(handling)}</small>
      <div class="copy-example">
        <div class="copy-example-header">
          <strong>${escapeHtml(exampleLabel)}</strong>
          <button type="button" class="copy-code-button" data-copy-code="${index}">${escapeHtml(copyCodeLabel)}</button>
        </div>
        <pre><code>${highlightedExample}</code></pre>
      </div>
    </article>
  `;
  }).join("");
}

function populateSettings(config = {}, project = state.project) {
  const projectName = project ? project.name : "MeuApp";
  elements.appNameInput.value = config.appName || projectName || "";
  elements.packageIdInput.value = config.packageId || `com.html2apk.${packageSegment(projectName)}`;
  elements.versionInput.value = config.version || "1.0.0";
  const loadedUrl = config.url || "";
  elements.urlInput.value = loadedUrl;
  elements.homeUrlInput.value = loadedUrl;
  if (loadedUrl) {
    const urlRadio = document.querySelector('input[name="sourceType"][value="url"]');
    if (urlRadio && !urlRadio.checked) {
      urlRadio.checked = true;
      urlRadio.dispatchEvent(new Event('change'));
    }
  }
  elements.buildFormatInput.value = normalizeBuildFormat(config.buildFormat || config.outputFormat || config.artifactType || config.packageType);
  elements.modeInput.value = config.mode || "fullscreen";
  elements.orientationInput.value = normalizeOrientationInputValue(config.orientation);
  elements.minSdkVersionInput.value = String(normalizeMinSdkVersion(config.minSdkVersion || config.androidMinSdkVersion));
  elements.endpointNotificationInput.value = config.endpointNotification || "";
  elements.timeNotificationInput.value = config.timeNotification || "180";
  elements.androidPlatformInput.value = config.androidPlatform || "android@15.0.0";
  elements.themeModeInput.value = normalizeThemeMode(config.themeMode || config.theme || (String(config.themeColor || "").toLowerCase() === "auto" ? "auto" : "fixed"));
  const themeColor = normalizeHexColor(config.themeColor || config.splashBackgroundColor || config.backgroundColor);
  elements.themeColorInput.value = themeColor;
  elements.themeColorTextInput.value = themeColor;
  elements.oneSignalAppIdInput.value = oneSignalAppIdFromConfig(config);
  renderPermissionOptions(Array.isArray(config.permissions) && config.permissions.length ? config.permissions : DEFAULT_PERMISSIONS);
  const iconPath = String(config.icon || "").trim() || defaultIconPath();
  elements.iconPathInput.value = iconPath;
  elements.iconPreview.src = iconPreviewPath(iconPath);
  const keystore = keystoreFromConfig(config);
  elements.keystorePathInput.value = keystore.path;
  elements.keystoreAliasInput.value = keystore.alias;
  elements.keystoreStorePasswordInput.value = keystore.storePassword;
  elements.keystoreKeyPasswordInput.value = keystore.keyPassword;
  elements.debugInput.checked = Boolean(config.debug);
  elements.runtimeLogsInput.checked = Boolean(config.showRuntimeLogs || config.mostrarLogs || config.runtimeLogs || config.debugConsole || config.console);
  elements.releaseInput.checked = Boolean(config.release || elements.buildFormatInput.value === "aab");
}

function validateSettings() {
  const errors = [];
  const packagePattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
  const versionPattern = /^\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/;
  const buildFormat = normalizeBuildFormat(elements.buildFormatInput.value);
  const keystore = keystoreFromInputs();
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';

  if (!state.project && !isUrlSource) {
    errors.push(text("missingProject"));
  }
  if (!elements.appNameInput.value.trim()) {
    errors.push(text("missingAppName"));
  }
  if (!packagePattern.test(elements.packageIdInput.value.trim())) {
    errors.push(text("invalidPackageId"));
  }
  if (!versionPattern.test(elements.versionInput.value.trim())) {
    errors.push(text("invalidVersion"));
  }
  if (!elements.modeInput.value) {
    errors.push(text("missingMode"));
  }
  if (!MIN_SDK_OPTIONS.includes(Number.parseInt(elements.minSdkVersionInput.value, 10))) {
    errors.push(text("invalidMinSdkVersion"));
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(elements.themeColorTextInput.value.trim())) {
    errors.push(text("invalidThemeColor"));
  }
  if (!isValidOptionalOneSignalAppId(elements.oneSignalAppIdInput.value)) {
    errors.push(text("invalidOneSignalAppId"));
  }
  if (buildFormat === "aab" && !hasCompleteKeystore(keystore)) {
    errors.push(text("missingKeystoreForAab"));
  } else if (hasAnyKeystoreField(keystore) && !hasCompleteKeystore(keystore)) {
    errors.push(text("incompleteKeystore"));
  }
  if (elements.iconPathInput.value.trim() && !/\.png$/i.test(elements.iconPathInput.value.trim())) {
    errors.push(text("invalidIconType"));
  }

  state.settingsValid = errors.length === 0;
  setStep("settings", state.settingsValid ? "done" : "active", state.settingsValid ? text("settingsOk") : text("settingsMissing"));
  updateActionButtons();

  if (state.project && !state.buildRunning && !state.lastApkPath) {
    if (state.environmentChecking) {
      setProgress(35, text("progressDoctor"), "active");
    } else if (!state.environmentOk) {
      setProgress(state.environmentFailed ? 45 : 25, state.environmentFailed ? text("progressError") : text("progressFolder"), state.environmentFailed ? "error" : "");
    } else {
      setProgress(state.settingsValid ? 70 : 50, state.settingsValid ? text("progressSettings") : text("settingsMissing"));
    }
  }

  if (!errors.length) {
    elements.settingsValidation.classList.add("hidden");
    elements.settingsValidation.innerHTML = "";
    return true;
  }

  elements.settingsValidation.classList.remove("hidden");
  elements.settingsValidation.innerHTML = `<p>${text("requiredFieldsTitle")}</p><ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
  return false;
}

function renderReview() {
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';
  if (!state.project && !isUrlSource) {
    elements.reviewGrid.innerHTML = "";
    return;
  }

  const items = [
    [text("project"), state.project ? state.project.projectRoot : "(URL remota)"],
    [text("appName"), elements.appNameInput.value.trim()],
    [text("packageId"), elements.packageIdInput.value.trim()],
    [text("appVersion"), elements.versionInput.value.trim()],
    [text("url"), elements.urlInput.value.trim()],
    [text("buildFormat"), selectedOptionText(elements.buildFormatInput)],
    [text("mode"), selectedOptionText(elements.modeInput)],
    [text("orientation"), selectedOptionText(elements.orientationInput)],
    [text("minSdkVersion"), selectedOptionText(elements.minSdkVersionInput)],
    [text("endpointNotification"), elements.endpointNotificationInput.value.trim() || "-"],
    [text("timeNotification"), elements.timeNotificationInput.value.trim() || "-"],
    [text("themeMode"), selectedOptionText(elements.themeModeInput)],
    [text("appThemeColor"), elements.themeColorTextInput.value.trim()],
    [text("oneSignalAppId"), elements.oneSignalAppIdInput.value.trim() || "-"],
    [text("androidPermissions"), selectedPermissions().join(", ")],
    [text("appIcon"), displayIconValue(elements.iconPathInput.value.trim())],
    [text("keystoreTitle"), elements.keystorePathInput.value.trim() ? elements.keystorePathInput.value.trim() : "-"],
    [text("runtimeLogsBuild"), elements.runtimeLogsInput.checked ? text("selected") : "-"],
    [text("releaseBuild"), elements.releaseInput.checked || normalizeBuildFormat(elements.buildFormatInput.value) === "aab" ? text("selected") : "-"]
  ];

  elements.reviewGrid.innerHTML = items.map(([label, value]) => `
    <article class="review-item">
      <span>${escapeHtml(label)}</span>
      <strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function goToReview() {
  if (!state.environmentOk) {
    setView("build");
    setStatus(state.environmentChecking ? "busy" : "error", state.environmentChecking ? text("doctorRunning") : text("environmentBlocked"));
    setProgress(state.environmentChecking ? 35 : 45, state.environmentChecking ? text("progressDoctor") : text("progressError"), state.environmentChecking ? "active" : "error");
    return false;
  }

  if (!validateSettings()) {
    setView("settings");
    setStatus("error", text("settingsMissing"));
    return false;
  }

  renderReview();
  setView("build");
  setStatus("ready", text("settingsOk"));
  return true;
}

function hasAndroidInstallableFailure(response) {
  const checks = response && response.report && Array.isArray(response.report.checks)
    ? response.report.checks
    : [];

  return checks.some((check) => {
    const name = String(check.name || "");
    return !check.ok && (
      name.includes("ANDROID_HOME") ||
      name.includes("Android platform-tools") ||
      name.includes("Android cmdline-tools") ||
      name.includes("Android sdkmanager") ||
      name.includes("Android build-tools") ||
      name.includes("Android platform ")
    );
  });
}

function markEnvironmentReady() {
  state.doctorOk = true;
  state.environmentOk = true;
  state.environmentFailed = false;
  setStep("doctor", "done", text("doctorOk"));
  setStatus("ready", text("doctorOk"));
  setProgress(state.settingsValid ? 70 : 50, state.settingsValid ? text("progressSettings") : text("doctorOk"));
}

function markEnvironmentBlocked(message = text("doctorFail")) {
  state.doctorOk = false;
  state.environmentOk = false;
  state.environmentFailed = true;
  setStep("doctor", "error", message);
  setStatus("error", message);
  setProgress(45, text("progressError"), "error");
}

async function installAndroidRequirements() {
  setStatus("busy", text("environmentInstalling"));
  setStep("doctor", "active", text("environmentInstalling"));
  setProgress(45, text("environmentInstalling"), "active");
  appendLog(text("environmentNeedsInstall"), "system");

  try {
    const result = await api.installAndroidRequirements();
    if (result && result.canceled) {
      appendLog(text("environmentCanceled"), "system");
      markEnvironmentBlocked(text("environmentCanceled"));
      return false;
    }

    appendLog(result && result.message ? result.message : (result && result.ok ? text("environmentInstallOk") : text("environmentInstallFail")), result && result.ok ? "success" : "error");
    return Boolean(result && result.ok);
  } catch (error) {
    appendLog(error.message, "error");
    markEnvironmentBlocked(text("environmentInstallFail"));
    return false;
  }
}

async function verifyEnvironment({ allowInstall = true, requireSettings = false } = {}) {
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';
  if (!state.project && !isUrlSource) {
    setStatus("error", text("chooseProjectFirst"));
    return false;
  }
  if (requireSettings && !validateSettings()) {
    setView("settings");
    setStatus("error", text("settingsMissing"));
    return false;
  }

  state.environmentChecking = true;
  state.environmentOk = false;
  state.environmentFailed = false;
  updateActionButtons();
  setView("build");
  setStatus("busy", text("doctorRunning"));
  setStep("doctor", "active", text("doctorRunning"));
  setProgress(35, text("progressDoctor"), "active");
  appendLog(text("environmentPreparing"), "animated");

  try {
    const firstResponse = await api.runDoctor(state.project ? state.project.projectRoot : null);
    appendLog(firstResponse.text, firstResponse.ok ? "success" : "error");

    if (firstResponse.ok) {
      markEnvironmentReady();
      return true;
    }

    if (allowInstall && hasAndroidInstallableFailure(firstResponse)) {
      const installed = await installAndroidRequirements();
      if (!installed) {
        return false;
      }

      setStatus("busy", text("doctorRunning"));
      setStep("doctor", "active", text("doctorRunning"));
      setProgress(55, text("progressDoctor"), "active");
      appendLog(text("environmentPreparing"), "animated");

      const retryResponse = await api.runDoctor(state.project ? state.project.projectRoot : null);
      appendLog(retryResponse.text, retryResponse.ok ? "success" : "error");
      if (retryResponse.ok) {
        markEnvironmentReady();
        return true;
      }
    }

    markEnvironmentBlocked(text("doctorFail"));
    return false;
  } catch (error) {
    appendLog(error.message, "error");
    markEnvironmentBlocked(error.message);
    return false;
  } finally {
    state.environmentChecking = false;
    validateSettings();
    updateActionButtons();
  }
}

async function ensureEnvironmentBeforeSettings() {
  const ready = state.environmentOk || await verifyEnvironment({ allowInstall: true, requireSettings: false });
  if (ready) {
    validateSettings();
    setView("settings");
  } else {
    setView("build");
  }
  return ready;
}

function renderProjectSnapshot(project) {
  state.project = project;
  state.lastDistPath = project.distPath;
  elements.projectSummary.classList.remove("hidden");
  elements.projectName.textContent = project.name;
  elements.projectPath.textContent = project.projectRoot;
  elements.configStatus.textContent = project.hasAppJson || project.hasConfigJson ? text("detected") : text("notDetected");
  elements.entryStatus.textContent = project.hasEntryFile ? text("detected") : text("missing");
  elements.entryPath.textContent = project.entryPath;
}

async function watchCurrentProject() {
  if (!state.project || !api.watchProject) {
    return;
  }

  try {
    const result = await api.watchProject(state.project.projectRoot);
    if (result && !result.ok) {
      appendLog(`${text("projectWatcherFail")}: ${result.message}`, "error");
    }
  } catch (error) {
    appendLog(`${text("projectWatcherFail")}: ${error.message}`, "error");
  }
}

function applyProjectChange(payload) {
  if (!payload || !payload.project || !state.project) {
    return;
  }

  if (payload.project.projectRoot !== state.project.projectRoot) {
    return;
  }

  renderProjectSnapshot(payload.project);
  refreshProjectFiles();

  const reloadSettings = isConfigFilePath(payload.changedPath);
  if (reloadSettings && !state.buildRunning) {
    populateSettings(payload.project.config || {}, payload.project);
    appendLog(text("projectConfigReloaded"), "system");
  } else {
    appendLog(`${text("projectAutoUpdated")}: ${payload.changedPath || payload.project.projectRoot}`, "system");
  }

  setStep("folder", payload.project.hasEntryFile ? "done" : "active", payload.project.hasEntryFile ? text("folderReady") : text("missing"));
  validateSettings();
  if (document.querySelector(".nav-item.active")?.dataset.view === "build") {
    renderReview();
  }
  if (
    state.currentFilePath &&
    payload.changedPath &&
    String(payload.changedPath).replace(/\\/g, "/").endsWith(`/${state.currentFilePath}`) &&
    !state.currentFileDirty
  ) {
    openProjectFile(state.currentFilePath);
  }
}

async function summarizeProject(project) {
  renderProjectSnapshot(project);
  state.doctorOk = false;
  state.environmentOk = false;
  state.environmentChecking = false;
  state.environmentFailed = false;
  state.settingsValid = false;
  state.lastApkPath = null;

  elements.nextSettingsButton.disabled = false;
  elements.doctorButton.disabled = true;
  setBuildButtons(false);
  state.fileTree = [];
  state.currentFilePath = "";
  state.currentFileLanguage = "text";
  state.currentFileDirty = false;
  elements.currentFileName.textContent = text("noFileSelected");
  elements.fileLanguageBadge.textContent = "text";
  elements.fileEditorInput.value = "";
  elements.fileEditorInput.disabled = true;
  elements.fileEditorInput.scrollTop = 0;
  elements.fileEditorInput.scrollLeft = 0;
  updateFilePreview();
  elements.saveFileButton.disabled = true;
  populateSettings(project.config || {}, project);
  setStep("folder", project.hasEntryFile ? "done" : "active", project.hasEntryFile ? text("folderReady") : text("missing"));
  setStep("settings", "active", text("settingsMissing"));
  setStep("doctor", null, "-");
  setStep("build", null, "-");
  elements.resultPanel.classList.add("hidden");
  setStatus("ready", text("projectLoaded"));
  appendLog(`${text("droppedFolder")}: ${project.projectRoot}`, "system");
  validateSettings();
  await refreshProjectFiles();
  setProgress(project.hasEntryFile ? 25 : 15, project.hasEntryFile ? text("progressFolder") : text("missing"), project.hasEntryFile ? "" : "error");
  await watchCurrentProject();
  await ensureEnvironmentBeforeSettings();
}

async function loadProject(projectRoot) {
  try {
    const project = await api.inspectProject(projectRoot);
    await summarizeProject(project);
  } catch (error) {
    setStatus("error", error.message);
    appendLog(error.message, "error");
  }
}

async function chooseFolder() {
  try {
    const project = await api.selectFolder();
    if (project) {
      await summarizeProject(project);
    }
  } catch (error) {
    setStatus("error", error.message);
    appendLog(error.message, "error");
  }
}

async function runDoctorOnly() {
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';
  if (!state.project && !isUrlSource) {
    setStatus("error", text("chooseProjectFirst"));
    return false;
  }

  return verifyEnvironment({ allowInstall: true, requireSettings: false });
}

function buildOptions() {
  const buildFormat = normalizeBuildFormat(elements.buildFormatInput.value);
  const keystore = keystoreFromInputs();
  const url = elements.urlInput.value.trim();
  const options = {
    projectRoot: state.project ? state.project.projectRoot : undefined,
    appName: elements.appNameInput.value.trim(),
    packageId: elements.packageIdInput.value.trim(),
    version: elements.versionInput.value.trim(),
    url: url,
    buildFormat,
    mode: elements.modeInput.value,
    orientation: elements.orientationInput.value,
    minSdkVersion: normalizeMinSdkVersion(elements.minSdkVersionInput.value),
    endpointNotification: elements.endpointNotificationInput.value.trim(),
    timeNotification: Number(elements.timeNotificationInput.value) >= 30 ? Number(elements.timeNotificationInput.value) : 180,
    themeColor: normalizeHexColor(elements.themeColorTextInput.value),
    themeMode: normalizeThemeMode(elements.themeModeInput.value),
    theme: normalizeThemeMode(elements.themeModeInput.value),
    oneSignalAppId: normalizeOneSignalAppId(elements.oneSignalAppIdInput.value),
    permissions: selectedPermissions(),
    icon: elements.iconPathInput.value.trim(),
    androidPlatform: elements.androidPlatformInput.value.trim(),
    debug: elements.debugInput.checked,
    showRuntimeLogs: elements.runtimeLogsInput.checked,
    release: elements.releaseInput.checked || buildFormat === "aab"
  };

  if (hasAnyKeystoreField(keystore)) {
    options.keystore = keystore;
  }

  return options;
}

function startAnimatedLogs() {
  stopAnimatedLogs();
  let index = 0;
  state.animationTimer = setInterval(() => {
    appendLog(animatedBuildLines[index % animatedBuildLines.length], "animated");
    index += 1;
  }, 1650);
}

function stopAnimatedLogs() {
  if (state.animationTimer) {
    clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
}

async function runBuildFlow() {
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';
  
  if ((!isUrlSource && !state.project) || state.buildRunning) {
    setStatus("error", state.project ? text("buildRunning") : text("chooseProjectFirst"));
    return;
  }
  if (!goToReview()) {
    return;
  }

  showLogBar();
  state.buildRunning = true;
  updateActionButtons();
  elements.resultPanel.classList.add("hidden");
  setView("build");
  setStep("folder", "done", text("folderReady"));

  const doctorOk = await runDoctorOnly();
  if (!doctorOk) {
    state.buildRunning = false;
    updateActionButtons();
    return;
  }

  setStatus("busy", text("buildRunning"));
  setStep("build", "active", text("buildRunning"));
  setProgress(90, text("progressBuild"), "active");
  startAnimatedLogs();

  try {
    const response = await api.runBuild(buildOptions());
    stopAnimatedLogs();
    if (!response.ok) {
      setStep("build", "error", text("buildFail"));
      setStatus("error", text("buildFail"));
      setProgress(90, text("progressError"), "error");
      appendLog(response.message || text("buildFail"), "error");
      if (response.buildDir) {
        appendLog(`Build directory kept: ${response.buildDir}`, "system");
      }
      return;
    }

    const result = response.result;
    state.lastApkPath = result.apkPath;
    state.lastDistPath = state.project ? state.project.distPath : null;
    elements.apkPath.textContent = result.apkPath;
    elements.successTitle.textContent = text("successTitle");
    elements.successText.textContent = text("successText");
    elements.successApkPath.textContent = result.apkPath;
    elements.resultPanel.classList.remove("hidden");
    setStep("build", "done", text("buildOk"));
    setStatus("ready", text("buildOk"));
    setProgress(100, text("progressDone"));
    appendLog(`${text("buildOk")}: ${result.apkPath}`, "success");
    setView("success");
  } catch (error) {
    stopAnimatedLogs();
    setStep("build", "error", text("buildFail"));
    setStatus("error", error.message);
    setProgress(90, text("progressError"), "error");
    appendLog(error.message, "error");
  } finally {
    state.buildRunning = false;
    updateActionButtons();
  }
}

async function runUsbDebugFlow() {
  const isUrlSource = document.querySelector('input[name="sourceType"]:checked').value === 'url';
  
  if ((!isUrlSource && !state.project) || state.buildRunning) {
    setStatus("error", state.project ? text("usbDebugRunning") : text("chooseProjectFirst"));
    return;
  }
  if (!goToReview()) {
    return;
  }

  showLogBar();
  state.buildRunning = true;
  updateActionButtons();
  elements.resultPanel.classList.add("hidden");
  setView("build");
  setStep("folder", "done", text("folderReady"));

  const doctorOk = await runDoctorOnly();
  if (!doctorOk) {
    state.buildRunning = false;
    updateActionButtons();
    return;
  }

  setStatus("busy", text("usbDebugRunning"));
  setStep("build", "active", text("usbDebugRunning"));
  setProgress(90, text("progressBuild"), "active");
  startAnimatedLogs();

  try {
    const response = await api.runUsbDebugBuild(buildOptions());
    stopAnimatedLogs();
    if (!response.ok) {
      setStep("build", "error", text("usbDebugFail"));
      setStatus("error", text("usbDebugFail"));
      setProgress(90, text("progressError"), "error");
      appendLog(response.message || text("usbDebugFail"), "error");
      if (response.buildDir) {
        appendLog(`Build directory kept: ${response.buildDir}`, "system");
      }
      return;
    }

    const result = response.result;
    state.lastApkPath = result.apkPath;
    state.lastDistPath = state.project ? state.project.distPath : null;
    elements.apkPath.textContent = result.apkPath;
    elements.successTitle.textContent = text("usbSuccessTitle");
    elements.successText.textContent = text("usbSuccessText");
    elements.successApkPath.textContent = result.apkPath;
    elements.resultPanel.classList.remove("hidden");
    setStep("build", "done", text("usbDebugOk"));
    setStatus("ready", text("usbDebugOk"));
    setProgress(100, text("progressDone"));
    appendLog(`${text("usbDebugOk")}: ${result.device && result.device.id ? result.device.id : "Android USB"}`, "success");
    appendLog(`${text("buildOk")}: ${result.apkPath}`, "success");
    setView("success");
  } catch (error) {
    stopAnimatedLogs();
    setStep("build", "error", text("usbDebugFail"));
    setStatus("error", error.message);
    setProgress(90, text("progressError"), "error");
    appendLog(error.message, "error");
  } finally {
    state.buildRunning = false;
    updateActionButtons();
  }
}

async function runNativeFunctionLabFlow() {
  if (state.buildRunning) {
    setStatus("error", text("functionLabRunning"));
    return;
  }
  if (!api.runNativeFunctionLab) {
    setStatus("error", text("functionLabFail"));
    return;
  }

  showLogBar();
  state.buildRunning = true;
  updateActionButtons();
  elements.resultPanel.classList.add("hidden");
  setView("build");
  setStatus("busy", text("functionLabRunning"));
  setStep("folder", "done", text("functionLabProject"));
  setStep("settings", "done", text("functionLabSettings"));
  setStep("doctor", "active", text("functionLabUsbCheck"));
  setStep("build", "active", text("functionLabRunning"));
  setProgress(20, text("functionLabUsbCheck"), "active");
  startAnimatedLogs();

  try {
    const response = await api.runNativeFunctionLab();
    stopAnimatedLogs();
    if (!response.ok) {
      setStep("doctor", "error", text("functionLabUsbCheck"));
      setStep("build", "error", text("functionLabFail"));
      setStatus("error", text("functionLabFail"));
      setProgress(90, text("progressError"), "error");
      appendLog(response.message || text("functionLabFail"), "error");
      if (response.projectRoot) {
        appendLog(`${text("functionLabProject")}: ${response.projectRoot}`, "system");
      }
      if (response.buildDir) {
        appendLog(`Build directory kept: ${response.buildDir}`, "system");
      }
      return;
    }

    const result = response.result;
    state.lastApkPath = result.apkPath;
    state.lastDistPath = result.distPath || "";
    elements.apkPath.textContent = result.apkPath;
    elements.successTitle.textContent = text("functionLabSuccessTitle");
    elements.successText.textContent = text("functionLabSuccessText");
    elements.successApkPath.textContent = result.apkPath;
    elements.resultPanel.classList.remove("hidden");
    setStep("doctor", "done", text("functionLabUsbCheck"));
    setStep("build", "done", text("functionLabOk"));
    setStatus("ready", text("functionLabOk"));
    setProgress(100, text("progressDone"));
    appendLog(`${text("functionLabOk")}: ${result.device && result.device.id ? result.device.id : "Android USB"}`, "success");
    appendLog(`${text("buildOk")}: ${result.apkPath}`, "success");
    setView("success");
  } catch (error) {
    stopAnimatedLogs();
    setStep("build", "error", text("functionLabFail"));
    setStatus("error", error.message);
    setProgress(90, text("progressError"), "error");
    appendLog(error.message, "error");
  } finally {
    state.buildRunning = false;
    updateActionButtons();
  }
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
}

function chooseLanguage(language) {
  state.language = language;
  localStorage.setItem("html2apk.language", language);
  applyLanguage();
  hideOverlay(elements.languageOverlay);
}

function hideOverlay(overlay) {
  overlay.classList.add("hiding");
  setTimeout(() => overlay.classList.add("hidden"), 360);
}

function finishBoot() {
  hideOverlay(elements.creditOverlay);
  if (!state.language) {
    setTimeout(() => elements.languageOverlay.classList.remove("hidden"), 380);
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.view === "settings" && state.project && !state.environmentOk) {
        await ensureEnvironmentBeforeSettings();
        return;
      }
      if (button.dataset.view === "build" && !goToReview()) {
        return;
      }
      if (button.dataset.view === "files") {
        await refreshProjectFiles();
      }
      setView(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-language-choice]").forEach((button) => {
    button.addEventListener("click", () => chooseLanguage(button.dataset.languageChoice));
  });

  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.themeToggleLarge.addEventListener("click", toggleTheme);
  document.querySelectorAll('input[name="sourceType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isUrl = e.target.value === 'url';
      
      const stepButton = document.querySelector('button[data-step="folder"] .step-info strong');
      
      if (isUrl) {
        elements.dropZone.classList.add("hidden");
        elements.projectSummary.classList.add("hidden");
        elements.urlZone.classList.remove("hidden");
        elements.urlField.style.display = "none";
        if (stepButton) stepButton.textContent = "1. Web2Apk (URL)";
        setStep("folder", elements.homeUrlInput.value.trim() ? "done" : "active", elements.homeUrlInput.value.trim() ? text("urlReady") : text("missingUrl"));
        
        elements.nextSettingsButton.disabled = !elements.homeUrlInput.value.trim();
        elements.urlInput.value = elements.homeUrlInput.value.trim();
      } else {
        elements.urlZone.classList.add("hidden");
        elements.dropZone.classList.remove("hidden");
        elements.urlField.style.display = "block";
        if (stepButton) stepButton.textContent = "1. " + text("project");
        setStep("folder", state.project?.hasEntryFile ? "done" : "active", state.project?.hasEntryFile ? text("folderReady") : text("missing"));
        
        elements.nextSettingsButton.disabled = !state.project;
        if (state.project) {
          elements.projectSummary.classList.remove("hidden");
        }
      }
    });
  });

  elements.importJsonButton.addEventListener("click", async () => {
    try {
      const config = await api.selectJsonFile();
      if (config) {
        populateSettings(config, null);
        if (config.url) {
          elements.homeUrlInput.value = config.url;
          elements.homeUrlInput.dispatchEvent(new Event('input'));
        }
      }
    } catch (error) {
      console.error("Failed to import app.json:", error);
    }
  });

  elements.homeUrlInput.addEventListener('input', () => {
    elements.urlInput.value = elements.homeUrlInput.value.trim();
    if (document.querySelector('input[name="sourceType"]:checked').value === 'url') {
      elements.nextSettingsButton.disabled = !elements.homeUrlInput.value.trim();
      setStep("folder", elements.homeUrlInput.value.trim() ? "done" : "active", elements.homeUrlInput.value.trim() ? text("urlReady") : text("missingUrl"));
    }
  });

  elements.urlInput.addEventListener('input', () => {
    elements.homeUrlInput.value = elements.urlInput.value.trim();
    if (elements.urlInput.value.trim() && document.querySelector('input[name="sourceType"]:checked').value === 'local') {
      document.querySelector('input[name="sourceType"][value="url"]').click();
    }
  });

  elements.selectFolderButton.addEventListener("click", chooseFolder);
  elements.nextSettingsButton.addEventListener("click", ensureEnvironmentBeforeSettings);
  elements.settingsNextButton.addEventListener("click", goToReview);
  elements.doctorButton.addEventListener("click", runDoctorOnly);
  elements.buildButton.addEventListener("click", runBuildFlow);
  elements.usbDebugButton.addEventListener("click", runUsbDebugFlow);
  elements.nativeFunctionLabButton.addEventListener("click", runNativeFunctionLabFlow);
  elements.newFileButton.addEventListener("click", createNewProjectFile);
  elements.saveFileButton.addEventListener("click", saveCurrentFile);
  elements.fileTree.addEventListener("click", (event) => {
    const button = event.target.closest("[data-file-path]");
    if (button && !button.disabled) {
      openProjectFile(button.dataset.filePath);
    }
  });
  elements.fileEditorInput.addEventListener("input", () => {
    setCurrentFileDirty(true);
    updateFilePreview();
  });
  elements.fileEditorInput.addEventListener("scroll", syncFileEditorHighlightScroll);
  
  elements.clearLogsButton.addEventListener("click", clearLogs);
  elements.toggleLogcatButton.addEventListener("click", toggleLogcat);
  elements.clearLogcatButton.addEventListener("click", clearLogcat);
  
  api.onLogcatData((data) => {
    if (isLogcatRunning) appendLogcatData(data);
  });
  elements.toggleLogsButton.addEventListener("click", toggleLogBar);
  elements.bottomToggleLogsButton.addEventListener("click", toggleLogBar);
  elements.bottomClearLogsButton.addEventListener("click", clearLogs);
  elements.selectIconButton.addEventListener("click", async () => {
    const iconPath = await api.selectIcon();
    if (!iconPath) {
      return;
    }
    elements.iconPathInput.value = iconPath;
    elements.iconPreview.src = iconPreviewPath(iconPath);
    appendLog(`${text("iconSelected")}: ${iconPath}`, "system");
    validateSettings();
  });
  elements.selectKeystoreButton.addEventListener("click", async () => {
    const keystorePath = await api.selectKeystore();
    if (!keystorePath) {
      return;
    }
    elements.keystorePathInput.value = keystorePath;
    appendLog(`${text("keystoreSelected")}: ${keystorePath}`, "system");
    validateSettings();
  });
  elements.buildFormatInput.addEventListener("change", () => {
    if (normalizeBuildFormat(elements.buildFormatInput.value) === "aab") {
      elements.releaseInput.checked = true;
    }
    validateSettings();
  });
  elements.themeColorInput.addEventListener("input", () => {
    elements.themeColorTextInput.value = elements.themeColorInput.value;
    validateSettings();
  });
  elements.themeColorTextInput.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(elements.themeColorTextInput.value.trim())) {
      elements.themeColorInput.value = elements.themeColorTextInput.value.trim();
    }
    validateSettings();
  });
  elements.modeInput.addEventListener("change", () => {
    const overlayInput = elements.permissionGrid.querySelector("input[value='SYSTEM_ALERT_WINDOW']");
    const selected = selectedPermissions();
    const nextPermissions = elements.modeInput.value === "floating" || !overlayInput || !overlayInput.disabled
      ? selected
      : selected.filter((permission) => permission !== "SYSTEM_ALERT_WINDOW");
    renderPermissionOptions(nextPermissions);
    validateSettings();
  });
  elements.permissionGrid.addEventListener("change", validateSettings);
  elements.nativeCodeGrid.addEventListener("click", handleNativeCodeCopy);
  elements.nativeCodeCategories.addEventListener("click", handleNativeCodeCopy);
  [
    elements.appNameInput,
    elements.packageIdInput,
    elements.versionInput,
    elements.urlInput,
    elements.buildFormatInput,
    elements.orientationInput,
    elements.minSdkVersionInput,
    elements.androidPlatformInput,
    elements.themeModeInput,
    elements.oneSignalAppIdInput,
    elements.keystorePathInput,
    elements.keystoreAliasInput,
    elements.keystoreStorePasswordInput,
    elements.keystoreKeyPasswordInput,
    elements.debugInput,
    elements.runtimeLogsInput,
    elements.releaseInput
  ].forEach((input) => {
    input.addEventListener("input", validateSettings);
    input.addEventListener("change", validateSettings);
  });
  elements.dragRegion.addEventListener("dblclick", () => api.toggleMaximizeWindow());
  elements.minimizeButton.addEventListener("click", () => api.minimizeWindow());
  elements.maximizeButton.addEventListener("click", () => api.toggleMaximizeWindow());
  elements.closeButton.addEventListener("click", () => api.closeWindow());
  elements.openDistButton.addEventListener("click", () => {
    if (state.lastDistPath) {
      api.openPath(state.lastDistPath);
    }
  });
  elements.showApkButton.addEventListener("click", () => {
    if (state.lastApkPath) {
      api.showItem(state.lastApkPath);
    }
  });
  elements.successOpenDistButton.addEventListener("click", () => {
    if (state.lastDistPath) {
      api.openPath(state.lastDistPath);
    }
  });
  elements.successShowApkButton.addEventListener("click", () => {
    if (state.lastApkPath) {
      api.showItem(state.lastApkPath);
    }
  });
  elements.newBuildButton.addEventListener("click", () => {
    state.lastApkPath = null;
    elements.resultPanel.classList.add("hidden");
    goToReview();
  });
  elements.devInstagramButton.addEventListener("click", () => {
    api.openExternalUrl(DEVELOPER_INSTAGRAM_URL).catch(() => {
      setStatus("error", "Nao foi possivel abrir o Instagram.");
    });
  });

  elements.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
  elements.dropZone.addEventListener("dragleave", () => {
    elements.dropZone.classList.remove("dragging");
  });
  elements.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) {
      setStatus("error", text("noFolderDrop"));
      return;
    }
    const projectRoot = api.pathForFile(file);
    await loadProject(projectRoot);
  });

  api.onBuildLog((payload) => {
    appendLog(payload.line, payload.kind || "raw");
  });

  api.onInstallLog((payload) => {
    appendLog(payload.line, payload.kind || "raw");
  });

  if (api.onProjectChanged) {
    api.onProjectChanged(applyProjectChange);
  }

  if (api.onProjectWatchError) {
    api.onProjectWatchError((payload) => {
      appendLog(`${text("projectWatcherFail")}: ${payload.message}`, "error");
    });
  }
}

async function init() {
  collectElements();
  bindEvents();
  applyLanguage();
  applyTheme();
  applyLogBarVisibility();
  setStatus("ready", text("ready"));
  setProgress(0, text("progressIdle"));
  updateActionButtons();
  appendLog("html2apk desktop ready / interface pronta", "system");

  try {
    const info = await api.appInfo();
    elements.appVersion.textContent = `v${info.version}`;
    state.defaultIconPath = info.iconPath || "";
    if (elements.iconPathInput && !elements.iconPathInput.value.trim() && state.defaultIconPath) {
      elements.iconPathInput.value = state.defaultIconPath;
      elements.iconPreview.src = iconPreviewPath(state.defaultIconPath);
    }
  } catch {
    elements.appVersion.textContent = "v12.1.7";
  }

  setTimeout(finishBoot, 1800);
  populateSettings({}, null);
}

document.addEventListener("DOMContentLoaded", init);
