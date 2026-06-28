# html2apk

`html2apk` transforma uma pasta com HTML, CSS, JS e assets em um APK ou AAB Android usando Cordova.

Use ele quando voce ja tem um app web, por exemplo uma pasta com `index.html`, `style.css`, `app.js` e imagens, e quer gerar um `.apk` instalavel no Android ou um `.aab` para loja.

## Como contribuir sem quebrar o padrão

O html2apk agora é um projeto aberto, mas a regra mais importante para novas features é simples: antes de implementar, entenda como o código atual trabalha. Evite criar uma segunda arquitetura para resolver algo que a ponte existente já resolve.

Antes de mandar qualquer feature nova, o contribuinte precisa estudar o fluxo atual da aplicação e confirmar que a solução segue a mesma estratégia das funções existentes. Não envie código que cria atalhos, caminhos paralelos, outro padrão de bridge, outro jeito de tratar permissão ou outra forma de comunicar JavaScript com Java sem uma justificativa técnica muito clara. Primeiro adapte a ideia ao desenho que já funciona no projeto; só proponha uma abordagem nova se o padrão atual realmente não atender.

Exemplo de postura esperada: "quero colocar uma nova função no projeto; antes de escrever, vou ver como as outras funções foram colocadas, como o código lida com elas, qual é o fluxo completo e por que esse fluxo existe". Essa investigação vem antes da implementação. Ela mostra onde a nova função deve nascer, como deve normalizar argumentos, qual action deve chamar, como o Java deve responder, onde documentar e como testar. É esse cuidado que permite criar algo novo sem quebrar a aplicação.

As funções interpretadas seguem um caminho bem definido:

```text
JavaScript do app
  -> função global em português
  -> aliases quando fizer sentido
  -> normalização de argumentos
  -> cordova.exec(action)
  -> dispatcher Java
  -> permissão/thread/subsistema Android
  -> CallbackContext
  -> Promise no JavaScript
```

Quando uma feature nova entra, ela deve atravessar esse caminho em vez de criar uma forma paralela de comunicação. Isso evita duplicação, bugs difíceis de testar e diferença de comportamento entre o early bridge, o plugin Cordova, a interface desktop e o app final.

Checklist antes de abrir PR ou commit:

- Entenda a arquitetura existente antes de alterar arquivos. Se ainda não sabe por onde uma função interpretada nasce, passa pela bridge e chega ao Java, pare e leia o código antes de implementar.
- Confirme que a feature nova não está criando conflito com APIs, helpers, normalizadores, actions ou eventos que já existem.
- Evite estratégias novas desnecessárias. Se uma função parecida já usa `cordova.exec`, dispatcher Java, `CallbackContext`, permissão pendente ou evento `CustomEvent`, a nova feature deve seguir esse caminho.
- Leia funções parecidas antes de escrever código novo. Se for arquivo, veja `salvarArquivo`, `baixarArquivo` e `FileProvider`. Se for permissão, veja câmera, microfone, notificação e localização. Se for evento, veja `aoEvento`, notificação e compartilhamento recebido.
- Mantenha nomes em PT-BR como API principal e aliases em inglês apenas quando combinarem com o padrão existente.
- Adicione a função no early bridge e no plugin JS com a mesma assinatura pública.
- Reuse normalizadores e helpers existentes; não trate payload com string solta se o projeto já usa objeto estruturado.
- No Java, entre pelo dispatcher de `action` existente e retorne JSON consistente.
- Se precisar de permissão runtime, preserve callback pendente, busy state e abertura de configurações quando o Android exigir.
- Se tocar arquivos, preserve sanitização de nome, armazenamento interno, MediaStore quando aplicável e FileProvider.
- Se tocar operações longas, use a thread adequada e não trave a WebView.
- Atualize `plugin.xml` apenas com permissões, intent filters ou dependências realmente necessárias.
- Atualize runtime console, aba "Códigos interpretados", laboratório USB, README/SOBRE quando a feature for pública.
- Adicione ou ajuste testes em `test/config.test.js` para provar que JS, Java, UI e docs continuam alinhados.
- Rode `npm test` antes de enviar.

O objetivo não é impedir criatividade; é proteger o comportamento previsível da ferramenta. Uma contribuição boa parece nativa no projeto: usa os mesmos nomes, passa pelos mesmos pontos, retorna no mesmo formato e respeita as mesmas fronteiras entre build, desktop, bridge JS e Java Android.

## O Mais Importante

Na pratica, voce vai usar estes comandos:

```bash
html2apk init
html2apk doctor
html2apk build
```

`doctor` e `build` fazem coisas diferentes:

| Comando | O que faz | Quando usar |
| --- | --- | --- |
| `html2apk doctor` | Confere se o computador esta pronto para gerar APK. Ele verifica Java, Gradle, Cordova e Android SDK. | Use antes do primeiro build, depois de instalar ferramentas Android ou quando o build falhar por ambiente. |
| `html2apk build` | Gera o APK de verdade a partir da sua pasta HTML. | Use quando o `doctor` estiver OK e voce quiser criar/atualizar o APK. |

O `doctor` nao gera APK. Ele so diagnostica o ambiente.

O `build` gera APK. Ele cria um projeto Cordova temporario, copia seu HTML/CSS/JS, compila Android e salva o resultado em `dist/`.

## Instalar

Se estiver usando como pacote global:

```bash
npm install -g html2apk
```

Durante desenvolvimento deste repositorio:

```bash
npm install
npm link
```

Tambem da para rodar localmente sem link:

```bash
node bin/html2apk.js doctor
node bin/html2apk.js build
```

## Requisitos Do Computador

Para gerar APK, o computador precisa ter:

- Node.js 18 ou superior
- JDK
- Android SDK ou Android Studio
- Android command line tools
- Gradle
- Cordova CLI

Este projeto usa `cordova-android@15.0.0` por padrao. Por isso, o Android SDK precisa ter:

- Android Platform 36
- Android Build Tools 36.0.0

Com `sdkmanager`, os pacotes principais sao:

```bash
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Variaveis de ambiente comuns:

```bash
export JAVA_HOME=/path/to/jdk
export ANDROID_HOME=/path/to/android-sdk
export ANDROID_SDK_ROOT=/path/to/android-sdk
```

No Windows, o `html2apk doctor` tenta encontrar automaticamente o SDK em:

```text
C:\Users\SEU_USUARIO\AppData\Local\Android\Sdk
```

## Interface Grafica

A interface desktop permite arrastar a pasta do projeto, preencher as configuracoes obrigatorias em etapas e gerar o arquivo Android sem mexer no terminal.

Recursos principais:

- Escolher idioma, tema claro/escuro e ver logs do processo.
- Gerar APK normal, APK release ou AAB.
- Escolher icone PNG, cor de tema, OneSignal App ID e permissoes.
- Preencher keystore pela interface: arquivo, alias, senha da store e senha da key.
- Marcar `Console no APK` para o app gerado mostrar um modal de debug no celular.
- Usar a aba `Arquivos` para abrir arquivos HTML/CSS/JS/JSON do projeto, salvar edicoes, criar novos arquivos e ver uma previa com sintaxe.

Para AAB, a interface pede keystore completo antes de liberar o build.

## Passo A Passo

Entre na pasta do seu app web:

```bash
cd caminho/da/minha-pasta-html
```

Sua pasta deve ter pelo menos um arquivo de entrada, normalmente:

```text
index.html
```

Crie a configuracao inicial:

```bash
html2apk init
```

Esse comando cria dois arquivos quando eles ainda nao existem:

- `app.json`
- `index.html`

Edite o `app.json` com o nome do app, pacote Android e preferencias.

Depois confira o ambiente:

```bash
html2apk doctor
```

Se tudo aparecer como `OK`, gere o APK:

```bash
html2apk build
```

O arquivo final sera criado em:

```text
dist/NomeDoApp-1.0.0-debug.apk
```

## Comandos Da CLI

### `html2apk init`

Cria uma configuracao inicial para seu app.

Use quando voce ainda nao tem `app.json`:

```bash
html2apk init
```

Ele nao apaga seu `app.json` nem seu `index.html` se eles ja existirem.

### `html2apk doctor`

Verifica se o computador esta pronto para compilar Android:

```bash
html2apk doctor
```

Exemplo de saida boa:

```text
OK  java
OK  javac
OK  gradle
OK  cordova
OK  Android build-tools 36.0.0
OK  Android platform android-36
Environment looks ready.
```

Se aparecer `ERR`, resolva esse item antes de rodar `build`.

### `html2apk build`

Gera o APK:

```bash
html2apk build
```

Opcoes comuns:

```bash
html2apk build --debug
html2apk build --release
html2apk build --apk
html2apk build --aab
html2apk build --show-runtime-logs
html2apk build --mode fullscreen
html2apk build --mode standalone
html2apk build --mode floating
html2apk build --orientation vertical
html2apk build --min-sdk 24
html2apk build --entry-file index.html
html2apk build --web-root .
html2apk build --app-name MeuApp
html2apk build --package-id com.seuapp.meuapp
html2apk build --theme auto
html2apk build --android-platform android@15.0.0
```

Com `--debug`, a pasta Cordova temporaria fica salva para inspecao caso voce queira investigar arquivos gerados.

Sem `--debug`, a pasta temporaria e limpa no fim do build.

Com `--aab`, o build usa formato AAB e release automaticamente. Para publicar, preencha `keystore`.

Com `--show-runtime-logs`, o APK/AAB gerado recebe um botao `Console` dentro do app. Esse console intercepta erros JavaScript, promises rejeitadas, logs, chamadas das funcoes interpretadas e requisicoes de rede (`fetch`/`XMLHttpRequest`), ajudando o dev a debugar no proprio celular. Se essa opcao ficar desligada, esse console nao aparece no app gerado.

## Configuracao Com `app.json`

O `app.json` fica na raiz do seu app. Se ele nao existir, `config.json` e usado como fallback.

Exemplo completo:

```json
{
  "_editMe": "Edite os campos abaixo e rode: html2apk doctor && html2apk build",
  "appName": "MeuApp",
  "packageId": "com.seuapp.meuapp",
  "version": "1.0.0",
  "buildFormat": "apk",
  "mode": "fullscreen",
  "orientation": "default",
  "minSdkVersion": 24,
  "themeColor": "#126fff",
  "themeMode": "fixed",
  "oneSignalAppId": "",
  "icon": "",
  "splash": "",
  "deepLinks": {
    "schemes": ["meuapp"],
    "appLinks": [
      {
        "host": "meusite.com",
        "paths": ["/produto/*", "/pedido/*"],
        "autoVerify": false
      }
    ]
  },
  "permissions": ["INTERNET", "CAMERA", "RECORD_AUDIO", "POST_NOTIFICATIONS", "VIBRATE"],
  "plugins": ["cordova-plugin-camera"],
  "release": false,
  "showRuntimeLogs": false,
  "androidPlatform": "android@15.0.0",
  "keystore": {
    "path": "",
    "alias": "app",
    "storePassword": "",
    "keyPassword": ""
  },
  "debug": false,
  "entryFile": "index.html",
  "webRoot": ".",
  "files": []
}
```

Campos principais:

| Campo | Para que serve |
| --- | --- |
| `appName` | Nome visivel do app. |
| `packageId` | Identificador Android. Precisa ter formato como `com.empresa.app`. |
| `version` | Versao do app. |
| `buildFormat` | `apk` para instalar direto ou `aab` para loja. |
| `mode` | `fullscreen` para tela cheia, `standalone` para modo normal ou `floating` para icone flutuante. |
| `orientation` | `default`, `vertical`, `horizontal`, `portrait` ou `landscape`. |
| `minSdkVersion` | Versao minima do Android em API level. Padrao: `24`. |
| `themeColor` | Cor base do tema/splash Android, em hexadecimal. Tambem vira fallback do modo automatico. |
| `icon` | Icone PNG do app. Se ficar vazio, o html2apk usa automaticamente o icone padrao da ferramenta. |
| `themeMode` | `fixed` usa a cor fixa. `auto` adapta as barras Android a cor visivel na tela do APK. Tambem aceita `theme: "auto"`. |
| `oneSignalAppId` | Opcional. App ID publico do OneSignal para push remoto. Nao coloque REST API Key no APK. |
| `deepLinks` | URLs que podem abrir o APK, como `meuapp://rota` ou `https://meusite.com/produto/1`. |
| `entryFile` | Arquivo HTML inicial. Normalmente `index.html`. |
| `webRoot` | Pasta onde estao os arquivos web. Normalmente `"."`. |
| `permissions` | Permissoes Android adicionadas ao app. |
| `plugins` | Plugins Cordova extras. |
| `androidPlatform` | Versao da plataforma Cordova Android. Padrao: `android@15.0.0`. |
| `debug` | Se `true`, preserva a pasta temporaria de build. |
| `release` | Se `true`, gera build release. |
| `showRuntimeLogs` | Se `true`, mostra um modal `Console` no app gerado para depurar erros e funcoes interpretadas. |
| `keystore` | Dados de assinatura para build release. |

Prioridade de configuracao:

1. Opcoes passadas na CLI ou em `buildApk`.
2. `app.json` ou `config.json`.
3. Valores padrao do html2apk.

### Modo Flutuante E Sobreposicao

O icone flutuante usa a permissao especial `SYSTEM_ALERT_WINDOW`. A bridge nativa declara essa permissao no APK para que o Android liste o app na tela de `Aparecer sobre outros apps`.

Mesmo com a permissao declarada no manifesto, o usuario ainda precisa liberar manualmente nas configuracoes do Android. Depois de liberar, volte ao app e chame `iniciarIconeFlutuante()` novamente.

O icone tambem aceita opacidade:

```js
await iniciarIconeFlutuante({ opacidade: 0.85 });
await definirOpacidadeIconeFlutuante(0.55);
```

### Tema Automatico Do APK

Use `themeMode: "auto"` ou `theme: "auto"` para o APK adaptar as barras nativas do Android a cor que esta visivel na tela. O html2apk observa a tela do WebView e ajusta status bar/navigation bar em tempo real.

```json
{
  "themeMode": "auto",
  "themeColor": "#126fff"
}
```

`themeColor` continua importante: ela e usada no splash e como fallback quando o app ainda nao conseguiu detectar uma cor visivel.

### OneSignal Opcional

Se quiser receber notificacoes remotas pelo OneSignal, preencha `oneSignalAppId` no `app.json` ou no campo OneSignal App ID da interface grafica:

```json
{
  "oneSignalAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Quando esse campo esta vazio, nada do OneSignal e instalado no APK. Quando ele esta preenchido, o html2apk instala `onesignal-cordova-plugin`, injeta a inicializacao no HTML e mantem as notificacoes locais existentes (`notificar`, `agendarNotificacao`, loops etc.).

Importante: o App ID do OneSignal pode ficar no APK. A REST API Key nao deve ir no app, porque e segredo de servidor. Envie pushes pelo painel do OneSignal ou por um backend seu.

## Exemplo Minimo

Este repositorio ja inclui um exemplo em:

```text
examples/minimal
```

Para testar:

```bash
cd examples/minimal
node ../../bin/html2apk.js doctor
node ../../bin/html2apk.js build
```

O APK sai em:

```text
examples/minimal/dist/
```

## Usando Como Biblioteca

Tambem e possivel usar pelo Node.js:

```js
const { buildApk } = require("html2apk");

const result = await buildApk();
console.log(result.apkPath);
```

Com opcoes:

```js
const result = await buildApk({
  mode: "fullscreen",
  release: true
});
```

Retorno:

```json
{
  "apkPath": "/app/dist/MeuApp-1.0.0-debug.apk",
  "buildDir": null,
  "logs": [],
  "status": "success",
  "tempCleaned": true
}
```

## Bridge Nativa

A v0.1 instala um plugin Cordova local com uma API global simples para recursos Android. Todas as funções retornam `Promise`, exceto os ouvintes `aoEvento`/atalhos, que retornam uma função para cancelar a escuta.

O html2apk injeta `html2apk-early-bridge.js` e `cordova.js` automaticamente no HTML inicial do APK. A bridge inicial cria as funcoes interpretadas antes dos scripts do seu projeto; se uma funcao nativa for chamada antes do `deviceready`, ela espera o Android ficar pronto antes de executar.

Cada funcao em portugues tambem tem alias em ingles. A interface grafica mostra a sintaxe PT-BR quando o idioma esta em portugues e mostra a sintaxe em ingles quando o usuario troca o idioma para English.

Exemplos de aliases:

| PT-BR | English |
| --- | --- |
| `notificar()` | `notify()` |
| `agendarNotificacao()` | `scheduleNotification()` |
| `agendarNotificacoes()` | `scheduleNotifications()` |
| `agendarLoopNotificacoes()` | `scheduleNotificationLoop()` |
| `cancelarNotificacao()` | `cancelNotification()` |
| `solicitarPermissaoNotificacoes()` | `requestNotificationPermission()` |
| `solicitarPermissaoPush()` | `requestPushPermission()` |
| `aoClicarPush()` | `onPushClick()` |
| `identificarUsuarioPush()` | `loginPushUser()` |
| `adicionarTagPush()` | `addPushTag()` |
| `solicitarPermissaoMicrofone()` | `requestMicrophonePermission()` |
| `statusMicrofone()` | `microphoneStatus()` |
| `ouvirMic()` | `listenMic()` / `startMic()` |
| `pararMic()` | `stopMic()` |
| `lanterna()` | `flashlight()` |
| `alternarLanterna()` | `toggleFlashlight()` |
| `tirarFoto()` | `takePhoto()` / `capturePhoto()` |
| `capturarVideo()` | `captureVideo()` |
| `escanearQRCode()` | `scanQRCode()` |
| `escolherArquivo()` | `pickFile()` |
| `escolherImagem()` | `pickImage()` |
| `escolherImagens()` | `pickImages()` |
| `escolherPasta()` | `pickFolder()` |
| `salvarArquivo()` | `saveFile()` |
| `lerArquivo()` | `readFile()` |
| `listarArquivos()` | `listFiles()` |
| `excluirArquivo()` | `deleteFile()` |
| `abrirArquivo()` | `openFile()` / `openStoredFile()` |
| `baixarArquivo()` | `downloadFile()` |
| `instalarAtualizacao()` | `installUpdate()` |
| `baixarBase64()` | `downloadBase64()` |
| `baixarArquivoLocal()` | `downloadLocalFile()` / `downloadFromFile()` |
| `definirPapelParede()` | `setWallpaper()` |
| `infoPapelParede()` | `wallpaperInfo()` |
| `abrirConfiguracaoPapelParede()` | `openWallpaperSettings()` |
| `capturarTela()` / `tirarPrint()` | `captureScreen()` / `takeScreenshot()` |
| `compartilhar()` | `share()` |
| `compartilharApp()` / `share_me()` | `shareApp()` |
| `aoReceberCompartilhamento()` | `onShareReceived()` |
| `obterCompartilhamentoInicial()` | `getInitialShare()` |
| `procurarBT()` | `scanBluetooth()` |
| `conectarBT()` | `connectBluetooth()` |
| `enviarBT()` | `sendBluetooth()` |
| `aoConectarBT()` | `onBluetoothConnect()` |
| `aoReceberDadosBT()` | `onBluetoothData()` |
| `aoDarErroBT()` | `onBluetoothError()` |
| `procurarWiFi()` | `scanWiFi()` |
| `conectarWiFi()` | `connectWiFi()` |
| `enviarWiFi()` | `sendWiFi()` |
| `aoConectarWiFi()` | `onWiFiConnect()` |
| `aoReceberDadosWiFi()` | `onWiFiData()` |
| `aoDarErroWiFi()` | `onWiFiError()` |
| `ocr()` | `recognizeText()` / `textFromImage()` |
| `falar()` | `speak()` / `textToSpeech()` |
| `pararFala()` | `stopSpeaking()` |
| `ouvir()` | `recognizeSpeech()` / `speechToText()` |
| `aguardar()` | `loading()` |
| `copiarTexto()` | `copyText()` |
| `lerTextoCopiado()` | `readText()` |
| `abrirNoApp()` | `openInApp()` |
| `abrirForaDoApp()` | `openOutsideApp()` |
| `abrirUrlExterno()` | `openExternalUrl()` |
| `manterTelaLigada()` | `keepScreenOn()` |
| `brilhoTela()` | `setScreenBrightness()` |
| `definirCorTema()` | `setThemeColor()` |
| `volumeAtual()` | `getVolume()` |
| `definirVolume()` | `setVolume()` |
| `aumentarVolume()` | `increaseVolume()` |
| `diminuirVolume()` | `decreaseVolume()` |
| `infoMemoria()` | `memoryInfo()` |
| `infoArmazenamento()` | `storageInfo()` |
| `infoDesempenho()` | `performanceInfo()` |
| `appsAbertos()` | `openAppsMemory()` |
| `configurarIconeFlutuante()` | `configureFloatingIcon()` |
| `definirOpacidadeIconeFlutuante()` | `setFloatingIconOpacity()` |
| `minimizarApp()` | `minimizeApp()` |
| `fecharApp()` | `closeApp()` / `exitApp()` |
| `obterLocalizacao()` | `getLocation()` |
| `acompanharLocalizacao()` | `watchLocation()` |
| `pararLocalizacao()` | `stopLocationWatch()` |
| `medirVelocidade()` | `measureSpeed()` |
| `autenticarBiometria()` | `authenticateBiometric()` |
| `solicitarBloqueio()` | `requestDeviceLock()` |
| `solicitarSegundoPlano()` | `requestBackgroundExecution()` |
| `configurarInicioAutomatico()` | `setAutoStartOnBoot()` |
| `salvarSeguro()` | `saveSecure()` |
| `lerSeguro()` | `readSecure()` |
| `removerSeguro()` | `deleteSecure()` |
| `aoEvento()` | `onEvent()` |
| `aoMinimizar()` | `onMinimize()` |
| `aoConectarUSB()` | `onUSBConnect()` |
| `aoDesconectarUSB()` | `onUSBDisconnect()` |
| `aoConectarFone()` | `onHeadphoneConnect()` |
| `aoDesconectarFone()` | `onHeadphoneDisconnect()` |
| `aoMudarVolume()` | `onVolumeChange()` |
| `aoAbrirTeclado()` | `onKeyboardOpen()` |
| `aoFecharTeclado()` | `onKeyboardClose()` |
| `aoSacudirCelular()` | `onPhoneShake()` |
| `aoVirarCelularParaBaixo()` | `onPhoneFaceDown()` |
| `aoAproximarObjeto()` | `onProximityNear()` |
| `aoTirarPrint()` | `onScreenshot()` |
| `aoMudarOrientacao()` | `onOrientationChange()` |
| `aoNFC()` | `onNFC()` |
| `aoReceberNotificacao()` | `onNotificationReceived()` |
| `obterLinkInicial()` | `getInitialLink()` |

Os eventos tambem aceitam aliases em ingles em `onEvent()`: `app:ready`, `app:background`, `app:resumed`, `back:button`, `link:opened`, `share:received`, `sharing:received`, `bluetooth:connected`, `bluetooth:data`, `bluetooth:error`, `wifi:connected`, `wifi:data`, `wifi:error`, `usb:connected`, `usb:disconnected`, `headphone:connected`, `headphone:disconnected`, `volume:changed`, `keyboard:opened`, `keyboard:closed`, `phone:shaken`, `phone:faceDown`, `proximity:near`, `screenshot:taken`, `orientation:changed`, `nfc:received`, `network:changed`, `battery:changed`, `location:changed`, `notification:received` e `notification:clicked`.

Como tratar retornos:

- Use `await` dentro de `try/catch` quando a acao depender de Android, permissao ou outro app instalado.
- Seletores de arquivo podem retornar `null`, array vazio ou objeto vazio quando o usuario cancela.
- Funcoes que precisam de permissao pedem automaticamente quando sao chamadas, como `lanterna()`, `notificar()` e `ouvirMic()`.
- Se o Android nao puder mostrar o pop-up de permissao, o html2apk abre a tela correta de configuracoes e retorna `settingsOpened: true`.
- APIs manuais de permissao continuam existindo para quem quer explicar antes; elas retornam objetos com `granted`, `requiresSettings` e `settingsOpened`.
- Eventos retornam uma funcao de cancelamento; guarde essa funcao e chame quando a tela/componente sair.
- Medidas de memoria, armazenamento e apps abertos sao diagnosticas. Android moderno pode limitar dados de outros apps por privacidade.

No seu JavaScript do app:

```js
toast("Mensagem");
vibrar(250);
await aguardar(5000);

await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir o app"
});

notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  acoes: [
    {
      id: "abrir",
      titulo: "Abrir",
      open: true,
      aoClicar: { funcao: "abrirNoApp", argumentos: ["#/pedido/123"] }
    },
    {
      id: "site",
      titulo: "Ver site",
      open: false,
      aoClicar: { funcao: "abrirForaDoApp", argumentos: ["https://exemplo.com/pedido/123"], open: false }
    }
  ],
  aoClicar: () => abrirForaDoApp("https://exemplo.com/pedido/123")
});

agendarNotificacao({
  titulo: "Lembrete",
  texto: "Hora de abrir o app",
  quando: Date.now() + 60000,
  aoClicar: {
    funcao: "abrirNoApp",
    argumentos: ["#/lembretes"]
  }
});

await agendarNotificacoes([
  { titulo: "Primeiro aviso", texto: "Daqui 1 minuto", quando: Date.now() + 60000 },
  { titulo: "Segundo aviso", texto: "Daqui 2 minutos", quando: Date.now() + 120000 }
]);

const loop = await agendarLoopNotificacoes({
  aCada: "12h",
  notificacoes: [
    {
      titulo: "Hidrate-se",
      texto: "Beba agua agora",
      aoClicar: { acao: "abrir-hidratacao" }
    },
    {
      titulo: "Alongamento",
      texto: "Pausa rapida para alongar",
      aoClicar: { acao: "abrir-alongamento" }
    }
  ]
});

fullscreen(true);
```

`notificar()` nao obriga clique, botao nem funcao. So `titulo` e `texto` ja geram uma notificacao normal. `aoClicar`, `acoes`/`actions` e `open` sao opcionais.

`aguardar(ms)` e `loading(ms)` pausam o fluxo com Promise, sem travar a WebView:

```js
await toast("Comecando");
await aguardar(5000);
await toast("Continuando");
```

`agendarNotificacao()` agenda uma notificacao. Se voce passar um array para ela, ou usar `agendarNotificacoes()`, o html2apk agenda varias em sequencia. Cada item recebe `id` automatico se voce nao informar um.

Em `aoClicar`, voce pode passar uma funcao diretamente:

```js
await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  aoClicar: () => abrirForaDoApp("https://exemplo.com/pedido/123")
});
```

Nao use `aoClicar: { acao: abrirForaDoApp("https://...") }`, porque os parenteses executam a funcao na hora em que a notificacao e criada. Para notificacao agendada, loop ou app fechado, prefira o formato serializavel:

```js
await agendarNotificacao({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  quando: Date.now() + 60000,
  aoClicar: {
    funcao: "abrirForaDoApp",
    argumentos: ["https://exemplo.com/pedido/123"]
  }
});
```

Esse formato tambem aceita funcoes suas, desde que elas existam em `window` quando o app abrir:

```js
window.abrirPedido = (id) => abrirNoApp("#/pedido/" + id);

await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  aoClicar: { funcao: "abrirPedido", argumentos: [123] }
});
```

Para botoes na notificacao, use `acoes` ou `actions`. Cada botao tambem aceita `aoClicar`/`onClick`:

```js
window.marcarPedidoLido = (id) => {
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
});
```

`open: false` evita trazer a tela do app para frente. Se o app ainda estiver vivo em segundo plano, o html2apk dispara o evento e executa a funcao JavaScript. Se o Android tiver matado o app, JavaScript de WebView nao consegue rodar sem abrir o app; nesse caso, acoes externas como `{ funcao: "abrirForaDoApp", argumentos: ["https://..."], open: false }` ainda funcionam por fallback nativo.

`agendarLoopNotificacoes()` cria um loop recorrente que funciona com o app fechado. Use `aCada`, `intervalo`, `every` ou `interval` em milissegundos ou como texto (`"30min"`, `"12h"`, `"1d"`). A cada disparo, o Android mostra a proxima notificacao da lista. Para parar:

```js
await cancelarNotificacao(loop.id);
```

Cliques continuam chegando normalmente:

```js
aoClicarNotificacao((evento) => {
  if ((evento.aoClicar || evento.onClick).acao === "abrir-hidratacao") {
    abrirNoApp("#/hidratacao");
  }
});
```

As notificacoes usam o icone do APK gerado como icone nativo. No Android, esse icone pode aparecer monocromatico na barra de notificacoes por regra do sistema.

OneSignal, quando `oneSignalAppId` esta preenchido:

```js
const permitido = await solicitarPermissaoPush();

identificarUsuarioPush("user-123");
adicionarTagPush("plano", "premium");

const pararPush = aoClicarPush((evento) => {
  console.log("Push clicado", evento);
  abrirNoApp("#/notificacoes");
});
```

Use OneSignal para pushes enviados remotamente pelo painel/API do OneSignal. Use `notificar()` e `agendarNotificacao()` para notificacoes locais criadas dentro do APK.

Arquivos, galeria e compartilhamento:

```js
const imagem = await escolherImagem(); // Retorna: { uri, nome, tamanho, mimeType }
const imagens = await escolherImagens({ multiplas: true }); // Array de objetos
const pdf = await escolherArquivo({ tipos: ["application/pdf"] });
const arquivos = await escolherArquivos({ multiplo: true });
const pasta = await escolherPasta(); // Retorna: { uri, nome, treeUri }

await salvarArquivo({
  nome: "relatorio.txt",
  mimeType: "text/plain",
  conteudo: "Conteudo salvo pelo app"
});

await compartilhar({
  titulo: "Material",
  texto: "Veja isso",
  url: "https://exemplo.com",
  arquivo: imagem
});

aoReceberCompartilhamento((dados) => {
  console.log("Compartilhamento recebido", dados.tipo, dados.uri || dados.texto);
});

const texto = await ocr(imagem);
console.log(texto.texto); // Retorna: { texto, blocos: [...] }

await falar("Ola mundo", { idioma: "pt-BR", velocidade: 1 });
const voz = await ouvir({ idioma: "pt-BR" });
console.log(voz.texto); // Retorna: { texto, error }

aoConectarBT((dispositivo) => {
  console.log("Bluetooth conectado", dispositivo.nome);
});

aoReceberDadosBT((dados) => {
  console.log("Dados Bluetooth", dados);
});

aoDarErroBT((erro) => {
  console.log("Erro Bluetooth", erro.mensagem || erro.message);
});

const dispositivos = await procurarBT(); // Retorna: [{ id, nome, host }, ...]
if (dispositivos[0]) {
  await conectarBT(dispositivos[0].id);
  await enviarBT({ mensagem: "Ola por Bluetooth" });
}

aoConectarWiFi((dispositivo) => {
  console.log("Wi-Fi conectado", dispositivo.nome || dispositivo.host);
});

aoReceberDadosWiFi((dados) => {
  console.log("Dados Wi-Fi", dados);
});

aoDarErroWiFi((erro) => {
  console.log("Erro Wi-Fi", erro.mensagem || erro.message);
});

const dispositivosWifi = await procurarWiFi(); // Retorna: [{ id, nome, host, porta }, ...]
if (dispositivosWifi[0]) {
  await conectarWiFi(dispositivosWifi[0].id);
  await enviarWiFi({ mensagem: "Ola por Wi-Fi" });
}

await share_me(); // compartilha o APK do proprio app aberto
```

`escolherImagem()` e `escolherImagens()` usam o Android Photo Picker no Android 13+ e caem automaticamente para o Storage Access Framework em Android antigo. Quando o Photo Picker esta disponivel, o html2apk nao solicita permissao ampla de armazenamento. O retorno segue o mesmo formato dos seletores: `{ uri, nome, mimeType, tamanho }`.

`compartilhar()` aceita texto, link, imagem, video, PDF, arquivo salvo pelo app, URI `content://` e lista de arquivos em `arquivo`/`arquivos`. O retorno confirma a abertura do share sheet com `{ ok: true }`.

Apps gerados tambem entram no menu Compartilhar do Android para `text/plain`, `image/*`, `video/*`, `application/pdf` e `*/*`. Use `obterCompartilhamentoInicial()` no boot se o app foi aberto por compartilhamento, e `aoReceberCompartilhamento()` para receber novos intents enquanto ele ja esta aberto.

`ocr()` usa ML Kit local para reconhecimento de texto em imagens. O processamento fica offline no aparelho. `falar()` usa o TextToSpeech do Android e `ouvir()` usa o reconhecedor de voz do sistema; ambos aceitam `idioma: "pt-BR"` ou `idioma: "auto"`.

Bluetooth usa RFCOMM classico entre apps html2apk. O aparelho que vai receber registra `aoConectarBT()`, `aoReceberDadosBT()` e, se quiser tratar falhas, `aoDarErroBT()`; isso inicia o servidor interno. O outro chama `procurarBT()`, escolhe um `id`, chama `conectarBT(id)` e envia JSON com `enviarBT(objeto)`. Para aparecer na busca, o aparelho precisa estar pareado ou visivel nas configuracoes Bluetooth do Android.

Wi-Fi local usa descoberta NSD e socket TCP entre apps html2apk na mesma rede ou hotspot. O aparelho que vai receber registra `aoConectarWiFi()`, `aoReceberDadosWiFi()` e `aoDarErroWiFi()`; isso inicia o servidor interno e anuncia o app na rede local. O outro chama `procurarWiFi()`, escolhe um `id`, chama `conectarWiFi(id)` e envia JSON com `enviarWiFi(objeto)`. Nao e Wi-Fi Direct: os dois aparelhos precisam estar conectados na mesma rede local, ou um deles precisa estar no hotspot do outro.

`salvarArquivo()` tem dois modos:

- `salvarArquivo({ nome, conteudo })` abre o seletor nativo para o usuario escolher onde salvar, como ja acontecia.
- `salvarArquivo("nomeArquivo", minhaVariavel)` salva direto no armazenamento app-scoped do APK. Use esse formato para CRUD interno.

CRUD de arquivos internos:

```js
await salvarArquivo("perfil.json", {
  nome: "Ana",
  plano: "premium"
});

const perfil = await lerArquivo("perfil.json");
console.log(perfil.nome);

const completo = await lerArquivoCompleto("perfil.json");
console.log(completo.uri, completo.tamanho);

const existe = await arquivoExiste("perfil.json");
const arquivos = await listarArquivos();

await abrirArquivo("perfil.json");
await compartilharArquivo("perfil.json");
await excluirArquivo("perfil.json");
```

Para baixar um arquivo e guardar no mesmo armazenamento:

```js
await baixarArquivo("https://exemplo.com/relatorio.pdf", "relatorio.pdf");

// Para atualizacoes via OTA com modal bloqueante
await instalarAtualizacao("https://seu-servidor.com/app.apk", {
  titulo: "Baixando nova versão",
  mensagem: "Aguarde, não feche o aplicativo..."
});
await abrirArquivo("relatorio.pdf");

await baixarBase64("foto.png", base64DaImagem, {
  mimeType: "image/png",
  galeria: true
});

const arquivo = await escolherArquivo();
if (arquivo) {
  await baixarArquivoLocal(arquivo, "copia-" + arquivo.name);
}
```

Durante `baixarArquivo()`, `baixarBase64()` e `baixarArquivoLocal()`, o Android mostra uma notificacao de progresso quando a permissao `POST_NOTIFICATIONS` estiver liberada. No Android 13+, o html2apk pede essa permissao automaticamente; se o usuario negar, o download continua e o retorno vem com `notificationShown: false`.

Por padrao, o arquivo baixado fica no armazenamento do app para funcionar com `abrirArquivo()` e `compartilharArquivo()`. Para imagem ou video aparecer na galeria, passe `{ galeria: true }`; no Android 10+ o html2apk publica uma copia em `Pictures/html2apk` ou `Movies/html2apk` e retorna `publicUri`.

Papel de parede:

```js
const foto = await tirarFoto({ base64: true });

await salvarArquivo("wallpaper.jpg", foto.base64, {
  base64: true,
  mimeType: "image/jpeg"
});

const resultado = await definirPapelParede("wallpaper.jpg", {
  alvo: "inicio" // "inicio", "bloqueio" ou "ambos"
}); // Retorna: { applied, systemApplied, lockApplied, error }

console.log(resultado.applied, resultado.systemApplied, resultado.lockApplied);
```

`definirPapelParede()` usa a API publica `WallpaperManager` do Android para imagem estatica. A entrada pode ser nome de arquivo salvo pelo app, `content://`/`file://`, data URL (`data:image/...;base64,...`) ou objeto `{ base64, mimeType }`. Video wallpaper e fundo de chamadas dependem do fluxo do sistema, live wallpaper ou app de telefone do fabricante; nesses casos use `infoPapelParede()` e `abrirConfiguracaoPapelParede()`.

Camera, QR Code, localizacao, biometria e storage seguro:

```js
const foto = await tirarFoto({ base64: true }); // Retorna: { base64, mimeType, uri }

const qr = await escanearQRCode(); // Retorna: { text, format, cancelled }
if (qr) {
  console.log(qr.text);
}

const local = await obterLocalizacao({ altaPrecisao: true, timeoutMs: 10000 });
// Retorna: { latitude, longitude, precisao, altitude, error }
console.log(local.latitude, local.longitude);

const watch = await acompanharLocalizacao({ intervaloMs: 5000 }); 
// Retorna: { watchId, error }
const pararEvento = aoMudarLocalizacao((evento) => {
  console.log(evento.latitude, evento.longitude);
});

await pararLocalizacao(watch.watchId);
pararEvento();

const pararMedicao = await medirVelocidade((kmh, local) => {
  console.log(`Velocidade: ${kmh} km/h`);
});
await pararMedicao();

const bio = await autenticarBiometria({
  titulo: "Confirmar acesso",
  descricao: "Use a biometria do aparelho"
}); // Retorna: { authenticated, supported, canceled, message }

if (bio.authenticated) {
  await salvarSeguro("token", "abc123");
  const token = await lerSeguro("token");
  await removerSeguro("token");
}

const auth = await solicitarBloqueio({
  titulo: "Acesso Restrito",
  descricao: "Confirme sua senha de tela"
}); // Retorna: { autenticado, suportado, cancelado, mensagem }

if (auth.autenticado) {
  // Acesso permitido
}

const bg = await solicitarSegundoPlano(); 
// Retorna: { ok, abriuInicioAutomatico, abriuOtimizacaoBateria }
if (bg.ok) {
  toast("Obrigado por permitir rodar em segundo plano!");
}

// Para abrir o aplicativo sozinho quando o aparelho for ligado:
await configurarInicioAutomatico(true); // Retorna: { ok, enabled }

const inicio = await obterLinkInicial(); // Retorna string: "html2apk://boot" ou "https://..."
if (inicio === "html2apk://boot") {
  console.log("App abriu sozinho pelo boot do aparelho");
}
```

O retorno de arquivos tem este formato:

```json
{
  "uri": "content://...",
  "name": "foto.png",
  "nome": "foto.png",
  "size": 12345,
  "tamanho": 12345,
  "mimeType": "image/png"
}
```

Microfone:

```js
const inicio = await ouvirMic(); 
// Retorna: { recording: true, settingsOpened: boolean, error: string }
if (inicio.settingsOpened) {
  console.log("Libere Microfone nas configuracoes e tente novamente");
} else {
  // ... depois, quando quiser parar
  const audio = await pararMic();
  const audioUrl = `data:${audio.mimeType};base64,${audio.base64}`;

  const player = new Audio(audioUrl);
  player.play();
}
```

`ouvirMic()` comeca a gravar e tambem pede permissao se ela ainda nao foi concedida. Se a permissao estiver bloqueada pelo Android, a tela de configuracoes do app e aberta automaticamente e o retorno traz `settingsOpened: true`.

`pararMic()` encerra a gravacao e retorna:

```json
{
  "base64": "AAAA...",
  "mimeType": "audio/mp4",
  "extension": "m4a",
  "size": 12345,
  "durationMs": 3200
}
```

Para tratar o retorno, use `mimeType` e `base64` juntos em um Data URL quando quiser tocar, baixar ou enviar o audio. Se `pararMic()` for chamado rapido demais, o Android pode nao conseguir finalizar o arquivo; aguarde alguns instantes apos `ouvirMic()`.

Lanterna, tela, clipboard e intents:

```js
const lanternaStatus = await lanterna(true);
await alternarLanterna();

await manterTelaLigada(true);
await brilhoTela(0.8);

await copiarTexto("codigo123");
const texto = await lerTextoCopiado();

await abrirNoApp("/sobre.html");
await abrirNoApp("#/pedido/123", { substituir: true });
await abrirForaDoApp("https://exemplo.com");
await abrirWhatsapp("559999999999", "Oi");
await discar("11999999999");
await abrirMapa("Avenida Paulista, Sao Paulo");
```

Use `abrirNoApp()`/`openInApp()` quando a navegacao deve acontecer dentro do proprio APK/WebView. Use `abrirForaDoApp()`/`openOutsideApp()` ou `abrirUrlExterno()`/`openExternalUrl()` quando quer mandar o usuario para navegador, WhatsApp, Maps ou outro app Android.

Informacoes e desempenho:

```js
const aparelho = await infoDispositivo();
const rede = await infoRede();
const bateria = await infoBateria();
const memoria = await infoMemoria();
const armazenamento = await infoArmazenamento();
const desempenho = await infoDesempenho();
const abertos = await appsAbertos();
```

`infoDesempenho()` agrupa memoria, armazenamento, bateria, rede e `timestamp`. Valores de memoria e armazenamento retornam bytes.

`appsAbertos()` retorna os processos/apps que o Android permite o APK enxergar:

```json
{
  "apps": [
    {
      "name": "MeuApp",
      "packageName": "com.seuapp.meuapp",
      "ramBytes": 12345678,
      "ramMb": 11.77,
      "importanceName": "foreground"
    }
  ],
  "porNome": {
    "MeuApp": {
      "ramBytes": 12345678,
      "ramMb": 11.77
    }
  },
  "limited": true
}
```

Por privacidade, Android moderno pode limitar essa lista ao proprio app e alguns processos visiveis ao APK. Entao essa funcao nao deve ser tratada como gerenciador completo de tarefas do sistema.

Tela, volume e ciclo do app:

```js
const volume = await volumeAtual();
console.log(volume.midia.atual, volume.midia.maximo);

await definirVolume("midia", 0.5, { mostrarUI: true });
await aumentarVolume("midia", 1);
await diminuirVolume("midia", 1);

const imagem = await capturarTela();
document.querySelector("img.preview").src = imagem.dataUrl;

await minimizarApp();

// Use somente depois de salvar estado importante:
// await fecharApp();
```

`capturarTela()` captura a tela do proprio APK/WebView, nao outros apps ou areas protegidas do sistema. `definirVolume()` aceita porcentagem entre 0 e 1 ou passos absolutos do stream.

Eventos nativos:

```js
const parar = aoEvento("app:background", (evento) => {
  console.log("App saiu da frente", evento.timestamp);
});

aoEvento("app:voltou", console.log);
aoEvento("botao:voltar", console.log);
aoEvento("link:aberto", (evento) => console.log(evento.url));
aoEvento("rede:mudou", console.log);
aoEvento("bateria:mudou", console.log);
aoConectarUSB((dados) => console.log("USB conectado", dados));
aoDesconectarUSB(() => console.log("USB desconectado"));
aoReceberNotificacao((dados) => console.log("Notificação recebida", dados));
aoEvento("notificacao:clicada", console.log);
aoConectarFone((dados) => console.log("Fone conectado", dados.dispositivo));
aoDesconectarFone(() => console.log("Fone desconectado"));
aoMudarVolume((dados) => console.log("Volume de mídia", dados.midia.atual));
aoAbrirTeclado((dados) => console.log("Teclado abriu", dados.alturaTeclado));
aoFecharTeclado(() => console.log("Teclado fechou"));
aoMudarOrientacao((dados) => console.log("Orientação", dados.orientacao));
aoSacudirCelular((dados) => console.log("Sacudiu", dados.forca));
aoVirarCelularParaBaixo(() => console.log("Tela para baixo"));
aoAproximarObjeto((dados) => console.log("Objeto perto", dados.distancia));
aoTirarPrint((dados) => console.log("Print detectado", dados.uri));
aoNFC((dados) => console.log("Tag NFC", dados.id, dados.mensagens));

parar();
```

Eventos de sensor e sistema seguem limites do Android/fabricante. `aoTirarPrint()` observa a MediaStore e depende do nome/pasta da captura; pode não disparar em alguns aparelhos. `aoNFC()` escuta tags enquanto o app está aberto em primeiro plano e exige NFC ligado no aparelho.

Deep links:

```js
const linkInicial = await obterLinkInicial();

aoAbrirLink((evento) => {
  console.log(evento.url, evento.path, evento.query);
});
```

Clique em notificacao:

```js
aoClicarNotificacao((evento) => {
  console.log(evento.id, evento.aoClicar || evento.onClick);
});

window.addEventListener("html2apk:notification", (event) => {
  console.log(event.detail);
});

const inicial = await obterNotificacaoInicial();
```

Permissoes e alarmes:

```js
const status = await statusPermissaoNotificacoes();
console.log(status.granted);

const podeUsarAlarmeExato = await podeAgendarNotificacaoExata();
if (!podeUsarAlarmeExato) {
  await abrirConfiguracaoAlarmeExato();
}
```

A bridge cria canal de notificacao, solicita `POST_NOTIFICATIONS` automaticamente quando `notificar()`/`agendarNotificacao()` precisam, abre configuracoes se o Android bloquear o pop-up, abre o app com payload quando a notificacao e clicada, persiste notificacoes agendadas e tenta reagendar apos reboot ou update do app. Se voce usar `exato: true`/`exact: true` em uma notificacao agendada e o Android exigir liberacao manual de alarme exato, o html2apk abre essa tela automaticamente.

## Problemas Comuns

### `doctor` mostra `ERR java` ou `ERR javac`

Instale um JDK e configure `JAVA_HOME`.

### `doctor` mostra erro no Android SDK

Instale Android Studio ou Android command line tools. Depois instale:

```bash
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

### `build` diz que nao encontrou `index.html`

Confira `entryFile` e `webRoot` no `app.json`.

Exemplo:

```json
{
  "entryFile": "index.html",
  "webRoot": "."
}
```

Se seu HTML fica em `public/index.html`:

```json
{
  "entryFile": "index.html",
  "webRoot": "public"
}
```

### Quero ver a pasta Cordova gerada

Rode:

```bash
html2apk build --debug
```

No fim, a CLI mostra o caminho da pasta temporaria.

### O APK foi gerado, onde ele esta?

Por padrao:

```text
dist/
```

Exemplo:

```text
dist/MeuApp-1.0.0-debug.apk
```

## Interface Visual Para Windows

Tambem existe um app visual em Electron. O usuario abre o `html2apk.exe`, escolhe o idioma na primeira execucao, arrasta a pasta do projeto e acompanha tudo pela interface.

Fluxo da interface:

1. Arraste ou escolha a pasta do projeto.
2. O app mostra `verificando ambiente` antes de liberar as proximas etapas.
3. Se faltarem pacotes do Android SDK, ele pede permissao e tenta baixar/instalar mostrando logs.
4. Preencha as configuracoes obrigatorias: nome do app, Package ID, versao e modo. Se voce nao escolher icone, o html2apk usa o icone padrao da ferramenta.
5. Revise e clique em `Gerar APK` para salvar o APK em `dist`, ou `Testar no USB` para gerar debug, instalar e abrir direto em um celular conectado.
6. Ao concluir, a tela final mostra o APK gerado e botoes para abrir a pasta `dist` ou localizar o arquivo.

O PNG escolhido e usado como icone do aplicativo e tambem como imagem da tela inicial do Android, evitando o splash padrao do Cordova. Quando nenhum PNG e escolhido, o `html2apk.png` da propria ferramenta entra como fallback.

Depois que a pasta foi escolhida, a interface acompanha mudancas nela automaticamente. Edicoes em HTML, CSS, JS e assets entram no proximo build sem arrastar a pasta de novo. Se `app.json` ou `config.json` mudar, os campos da tela de configuracoes sao recarregados.

Para `Testar no USB`, o celular precisa estar com `Opcoes do desenvolvedor > Depuracao USB` ativa. Ao conectar, desbloqueie o aparelho e aceite a chave RSA. Se o Android aparecer como `unauthorized` ou `offline`, a interface mostra o que fazer nos logs.

Os logs podem ser abertos em uma barra inferior durante qualquer etapa pelo botao `Mostrar logs`. Se atrapalhar a visualizacao, use `Ocultar logs` e a area principal volta a ocupar a altura da janela.

Para rodar a interface em desenvolvimento:

```bash
npm run desktop
```

Para gerar o executavel portatil do Windows:

```bash
npm run build-desktop-win
```

O resultado fica em:

```text
dist-desktop/html2apk-portable/html2apk.exe
```

Esse portatil inclui a interface, o `html2apk`, Cordova e as dependencias Node do projeto. JDK, Gradle e Android SDK sao ferramentas grandes do sistema; quando possivel, a interface tenta completar os pacotes Android com permissao do usuario.

## Executavel Da CLI

O projeto tambem mantem scripts antigos para empacotar somente a CLI com `pkg`:

```bash
npm run build-win
npm run build-linux
npm run build-mac
```
