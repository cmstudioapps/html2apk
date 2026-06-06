# Sobre o html2apk

Criacao, direcao, propriedade e creditos: **Caio Multiversando**.

Versão observada no projeto: `0.10.0`.

Download da versão desktop observada: gere o executável local em `dist-desktop` e publique o pacote `0.10.0` no canal de distribuição escolhido.

Este documento explica o html2apk em dois modos:

1. **Modo por cima**: uma explicacao clara para entender o produto sem precisar pensar em Cordova, Gradle, WebView, permissoes Android e outras palavras que fazem o cafe esfriar.
2. **Modo super tecnico**: uma viagem pelo cerebro da ferramenta, explicando a logica, os algoritmos, os fluxos internos, as vantagens, os limites e o motivo das escolhas.

A ideia aqui nao e listar arquivos. Arquivo e endereco. O que importa e comportamento: o que entra, quem decide, quem transforma, quem protege, quem entrega, onde pode falhar e por que.

---

# Parte 1 - Modo por cima

## O que e o html2apk

O **html2apk** e uma ferramenta criada por **Caio Multiversando** para transformar projetos web em aplicativos Android instalaveis.

Voce entra com uma pasta que tem HTML, CSS, JavaScript e assets. A ferramenta monta um app Android real por cima disso, usando Cordova como motor de empacotamento e uma ponte nativa propria para dar ao JavaScript acesso a recursos do Android.

Em linguagem direta:

> O html2apk pega um app web e coloca nele um corpo Android.

Esse corpo Android pode vibrar, mostrar notificacao, abrir camera, gravar microfone, salvar arquivo, baixar arquivo, mudar papel de parede, pedir biometria, abrir apps externos, controlar brilho, mostrar um icone flutuante, detectar eventos nativos e gerar APK ou AAB.

## O problema que ele resolve

Um projeto web comum roda bem no navegador, mas quando vira app Android surgem perguntas chatas:

- como gerar APK sem montar tudo no Android Studio?
- como configurar `packageId`, icone, splash, permissao e orientacao?
- como chamar camera, notificacao, arquivo, biometria e armazenamento seguro usando JavaScript?
- como testar no celular por USB sem decorar `adb`?
- como saber se o ambiente Android esta pronto?
- como debugar quando no navegador funciona e no celular resolve ter personalidade propria?

O html2apk junta essas respostas em uma ferramenta so.

## O fluxo mental simples

O fluxo por cima e este:

```text
projeto web
  -> configuracao do app
  -> projeto Android temporario
  -> runtime html2apk injetado
  -> bridge nativa instalada
  -> build Cordova Android
  -> APK ou AAB em dist/
```

O usuario nao precisa criar manualmente um projeto Android. O html2apk cria um projeto temporario, coloca o app web dentro, injeta as pecas nativas, compila e copia o resultado final para a pasta do usuario.

## O jeito terminal

Os comandos principais sao:

```bash
html2apk init
html2apk doctor
html2apk build
```

`init` cria uma base de projeto.

`doctor` examina o ambiente: Java, Gradle, Cordova, Android SDK, platform-tools, build-tools e permissoes de escrita.

`build` gera o app.

O `doctor` verifica o ambiente e aponta o que está faltando. A geração do APK acontece no `build`.

## O jeito visual

A ferramenta tambem tem uma interface desktop em Electron. Ela permite:

- escolher a pasta do projeto;
- editar configuracoes;
- escolher icone e splash;
- alternar modo normal, fullscreen ou flutuante;
- configurar tema, permissoes, OneSignal e assinatura;
- gerar APK debug, APK release ou AAB release;
- testar no celular via USB;
- ver logs;
- editar arquivos;
- consultar codigos interpretados por categoria;
- gerar um app laboratorio para testar as funcoes nativas no celular.

O desktop é uma camada operacional: escolhe projeto, valida dados, gera artefatos, instala em USB, testa e mostra erros.

## O que sao codigos interpretados

"Codigos interpretados" sao funcoes JavaScript que o app web pode chamar e que o html2apk traduz para comportamento Android.

Exemplos:

```js
await toast("Ola");
await vibrar(250);
await aguardar(5000);
await notificar({ titulo: "Pedido", texto: "Chegou uma atualizacao" });
await salvarArquivo("perfil.json", { nome: "Ana" });
await baixarArquivo("https://site.com/app.pdf", "manual.pdf");
await definirPapelParede("foto.png", { alvo: "inicio" });
```

Por tras disso, existe uma ponte:

```text
JavaScript do usuario
  -> funcao global html2apk
  -> normalizacao dos argumentos
  -> cordova.exec
  -> action nativa
  -> Java Android
  -> API do Android
  -> retorno para Promise
```

O usuario escreve JavaScript. A ferramenta faz a conversa com o Android.

## Como usar as funcoes interpretadas

A aba **Codigos interpretados** da interface serve como uma caixa de receitas: ela mostra sintaxe, retorno, cuidados e exemplos. A regra geral e simples:

```js
try {
  const resultado = await algumaFuncaoInterpretada();
  console.log(resultado);
} catch (erro) {
  console.error("Falhou", erro);
}
```

Quase tudo retorna `Promise`. Entao use `await`, trate cancelamentos e coloque `try/catch` quando a acao depender de permissao, camera, arquivo, internet ou app externo.

### Regras gerais antes dos exemplos

1. **Use no JavaScript do app**, nao no `app.json`.
2. **Espere o app estar rodando no APK**. No navegador comum, funcoes nativas nao existem.
3. **Use `await`** porque a ponte chama Android e Android responde depois.
4. **Trate permissao negada**. Muitas funcoes pedem permissao sozinhas, mas o usuario pode negar.
5. **Trate `settingsOpened`**. Quando o Android bloqueia o dialog normal, a bridge pode abrir configuracoes do app.
6. **Trate cancelamento**. Seletores, camera e pasta podem voltar `null`, array vazio ou objeto sem `uri`.
7. **Prefira nomes PT-BR ou ingles, mas nao misture sem necessidade**. `notificar()` e `notify()` fazem a mesma ideia; escolha o estilo do projeto.
8. **Para debug, ligue `showRuntimeLogs`**. O console do APK mostra chamadas, erros, rede e retorno das funcoes.

### Feedback rapido

Use para respostas pequenas ao usuario.

```js
await toast("Salvo com sucesso");
await vibrar(250);
```

`toast()` mostra uma mensagem nativa curta. `vibrar(ms)` aciona a vibracao por milissegundos.

`aguardar(ms)` e `loading(ms)` criam uma pausa com Promise para usar com `await`, sem travar a WebView:

```js
await toast("Comecando");
await aguardar(5000);
await toast("Continuando");
```

Cuidados:

- vibracao precisa da permissao `VIBRATE`;
- duracoes longas incomodam;
- falha de feedback nao deveria travar o fluxo principal.

### Notificacoes locais

Notificacao simples:

```js
await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir o app"
});
```

Com clique:

```js
await notificar({
  titulo: "Pedido aprovado",
  texto: "Toque para abrir os detalhes",
  aoClicar: {
    funcao: "abrirNoApp",
    argumentos: ["#/pedido/123"]
  }
});
```

Com acoes:

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

Cuidados:

- no Android 13+, notificacoes precisam de `POST_NOTIFICATIONS`;
- `aoClicar: () => {}` funciona melhor enquanto o app esta vivo;
- para notificacao agendada ou app fechado, prefira `{ funcao, argumentos }`;
- `open: false` evita abrir o app, mas JavaScript so roda se o processo ainda estiver vivo;
- acoes externas como `abrirForaDoApp` possuem fallback nativo.

### Notificacoes agendadas e loops

Agendar para depois:

```js
const aviso = await agendarNotificacao({
  titulo: "Lembrete",
  texto: "Volte ao app daqui 1 minuto",
  quando: Date.now() + 60 * 1000
});

console.log("ID para cancelar:", aviso.id);
```

Agendar varias:

```js
await agendarNotificacoes([
  { titulo: "Primeiro", texto: "Mensagem 1", quando: Date.now() + 60000 },
  { titulo: "Segundo", texto: "Mensagem 2", quando: Date.now() + 120000 }
]);
```

Loop:

```js
const loop = await agendarLoopNotificacoes({
  aCada: "12h",
  notificacoes: [
    { titulo: "Agua", texto: "Beba agua agora" },
    { titulo: "Alongar", texto: "Faca uma pausa rapida" }
  ]
});

// Depois:
// await cancelarNotificacao(loop.id);
```

Cuidados:

- `quando` usa timestamp em milissegundos;
- guarde o `id` para cancelar depois;
- alarme exato pode depender de permissao/configuracao do Android;
- economia de bateria pode atrasar alguns disparos.

### Push remoto com OneSignal

So funciona se o OneSignal App ID foi configurado no build.

```js
const permitido = await solicitarPermissaoPush();

if (permitido) {
  await identificarUsuarioPush("usuario-123");
  await adicionarTagPush("plano", "premium");
}

const parar = aoClicarPush((evento) => {
  abrirNoApp("#/notificacoes");
});
```

Cuidados:

- nao coloque REST API Key secreta dentro do APK;
- use login/tags para segmentar usuario;
- push remoto depende do painel/API do OneSignal.

### Permissoes e eventos

Consultar permissoes:

```js
const permissoes = await statusPermissoes([
  "CAMERA",
  "RECORD_AUDIO",
  "POST_NOTIFICATIONS"
]);

console.log(permissoes);
```

Escutar eventos:

```js
const parar = aoEvento("app:background", (evento) => {
  console.log("App saiu da frente", evento.timestamp);
});

// Quando nao precisar mais:
parar();
```

Atalhos uteis:

```js
const pararMinimizar = aoMinimizar(() => {
  console.log("Pause videos, timers ou leituras pesadas");
});

const pararVoltar = aoVoltarParaApp(() => {
  console.log("Atualize dados se precisar");
});
```

Deep links:

```js
const linkInicial = await obterLinkInicial();
if (linkInicial) {
  abrirNoApp("#" + linkInicial.path);
}

aoAbrirLink((link) => {
  console.log("Link recebido", link.url);
});
```

Cuidados:

- `statusPermissoes()` consulta, mas nao pede permissao;
- para pedir permissao, chame a funcao real ou a API manual correspondente;
- sempre guarde a funcao de parar listeners para evitar escutas duplicadas.

### Camera, video, QR Code, microfone e lanterna

Foto:

```js
const foto = await tirarFoto({ base64: true });

if (foto.base64) {
  document.querySelector("img.preview").src =
    "data:" + foto.mimeType + ";base64," + foto.base64;
}
```

Video:

```js
const video = await capturarVideo();
if (video.uri) {
  console.log("Video:", video.uri);
}
```

QR Code:

```js
try {
  const qr = await escanearQRCode();
  if (qr) {
    console.log("QR:", qr.text);
  }
} catch (erro) {
  await toast("Digite ou cole o codigo");
}
```

Microfone:

```js
const inicio = await ouvirMic();
if (inicio.settingsOpened) {
  console.log("Libere Microfone nas configuracoes e tente de novo");
  return;
}

setTimeout(async () => {
  const audio = await pararMic();
  const url = "data:" + audio.mimeType + ";base64," + audio.base64;
  new Audio(url).play();
}, 3000);
```

Lanterna:

```js
const status = await lanterna(true);

if (status.settingsOpened) {
  console.log("Libere Camera nas configuracoes e chame lanterna(true) de novo");
} else if (!status.available) {
  await toast("Este aparelho nao tem lanterna");
}

const alternado = await alternarLanterna();
console.log("Lanterna ligada?", alternado.enabled);
```

Cuidados:

- camera e lanterna usam permissao `CAMERA`;
- microfone usa `RECORD_AUDIO`;
- QR Code depende de suporte do WebView a `BarcodeDetector`;
- camera/video podem retornar objeto vazio se o usuario cancelar.

### Seletores, compartilhamento e clipboard

Imagem:

```js
const imagem = await escolherImagem();
const imagens = await escolherImagens({ multiplas: true });

if (imagem) {
  document.querySelector("img.preview").src = imagem.uri;
}
```

No Android 13+, imagem e multiplas imagens usam o Photo Picker nativo. Em Android antigo, a bridge cai automaticamente para `ACTION_OPEN_DOCUMENT`. Quando Photo Picker esta disponivel, nao e solicitada permissao ampla de armazenamento.

Varios arquivos:

```js
const arquivos = await escolherArquivos({ multiplo: true });

const total = arquivos.reduce((soma, arquivo) => {
  return soma + (arquivo.tamanho || 0);
}, 0);

console.log("Total em bytes:", total);
```

PDF:

```js
const pdf = await escolherArquivo({
  tipos: ["application/pdf"]
});

if (pdf) {
  console.log("PDF escolhido:", pdf.nome);
}
```

Salvar com seletor nativo:

```js
const salvo = await salvarArquivo({
  nome: "relatorio.txt",
  mimeType: "text/plain",
  conteudo: "Conteudo do relatorio"
});

if (salvo.saved) {
  await toast("Arquivo salvo");
}
```

Compartilhar:

```js
const imagem = await escolherImagem();

await compartilhar({
  titulo: "Veja esse app",
  texto: "Veja esse app",
  url: "https://exemplo.com",
  arquivo: imagem
});

await share_me();
```

`compartilhar()` aceita texto, link, imagem, video, PDF, URI `content://`, arquivo salvo pelo app e listas em `arquivo`/`arquivos`. Ela abre o share sheet do Android e retorna `{ ok: true }` quando a intent foi disparada.

`share_me()` tambem existe como `compartilharApp()` e `shareApp()`. Ela compartilha o APK do proprio app aberto. Em APK unico gerado direto pelo html2apk, esse caminho tende a funcionar bem. Se o app veio de AAB/loja com split APKs, o retorno avisa que compartilhar apenas o APK base pode nao reinstalar todos os recursos.

Receber compartilhamento:

```js
const inicial = await obterCompartilhamentoInicial();
console.log(inicial);

aoReceberCompartilhamento((dados) => {
  console.log(dados.tipo, dados.uri || dados.texto);
});
```

O plugin instala intent filters para `text/plain`, `image/*`, `video/*`, `application/pdf` e `*/*`. Quando o app abre pelo menu Compartilhar, a bridge guarda o compartilhamento inicial; quando ele ja esta aberto, envia o evento `compartilhamento:recebido`.

OCR e voz:

```js
const texto = await ocr(imagem);
console.log(texto.texto);

await falar("Ola mundo", {
  idioma: "pt-BR",
  velocidade: 1
});

const voz = await ouvir({ idioma: "pt-BR" });
console.log(voz.texto);

await pararFala();
```

`ocr()` usa ML Kit local, sem enviar a imagem para servidor. `falar()` usa TextToSpeech do Android. `ouvir()` usa o reconhecedor de voz do sistema com suporte a `pt-BR`, `en-US` ou idioma automatico.

Bluetooth entre apps:

```js
aoConectarBT((dispositivo) => {
  console.log("Conectado", dispositivo.nome);
});

aoReceberDadosBT((dados) => {
  console.log("Recebido", dados);
});

const dispositivos = await procurarBT();

if (dispositivos[0]) {
  await conectarBT(dispositivos[0].id);
  await enviarBT({
    tipo: "ping",
    enviadoEm: Date.now()
  });
}
```

A bridge usa Bluetooth classico RFCOMM. `aoConectarBT()` inicia o servidor interno do app. `procurarBT()` lista aparelhos pareados e aparelhos visiveis durante a busca. `enviarBT()` serializa o objeto como JSON; no outro lado, `aoReceberDadosBT()` entrega o objeto original.

Clipboard:

```js
await copiarTexto("ABC-123");
await toast("Codigo copiado");

const copiado = await lerTextoCopiado();
console.log(copiado);
```

Cuidados:

- seletores retornam `uri`, nao caminho absoluto;
- sempre trate cancelamento;
- valide `mimeType` e tamanho antes de processar;
- `salvarArquivo({ nome, conteudo })` abre seletor nativo.

### CRUD interno de arquivos

Este e o modo pedido para salvar variaveis no armazenamento do app:

```js
await salvarArquivo("perfil.json", {
  nome: "Ana",
  plano: "premium"
});

const perfil = await lerArquivo("perfil.json");
console.log(perfil.nome);

const completo = await lerArquivoCompleto("perfil.json");
console.log(completo.mimeType, completo.tamanho);

const arquivos = await listarArquivos();
console.log(arquivos);

const existe = await arquivoExiste("perfil.json");
console.log("Existe?", existe);

await abrirArquivo("perfil.json");
await compartilharArquivo("perfil.json");
await excluirArquivo("perfil.json");
```

Ponto importante:

```js
salvarArquivo({ nome, conteudo }) // abre seletor nativo
salvarArquivo("nome.json", valor) // salva no CRUD interno do app
```

Cuidados:

- nome de arquivo nao pode ter `/`, `\`, `:` ou `..`;
- os arquivos ficam no armazenamento do app;
- se o app for removido, esses dados podem ser removidos tambem;
- para dado sensivel pequeno, use storage seguro.

### Downloads

Baixar por URL:

```js
await baixarArquivo(
  "https://exemplo.com/relatorio.pdf",
  "relatorio.pdf"
);

await abrirArquivo("relatorio.pdf");
// await compartilharArquivo("relatorio.pdf");
```

Baixar base64:

```js
await baixarBase64("pixel.png", base64, {
  mimeType: "image/png",
  galeria: true
});
```

Copiar arquivo normal com progresso:

```js
const arquivo = await escolherArquivo();
if (arquivo) {
  await baixarArquivoLocal(arquivo, "copia-" + arquivo.name);
}
```

Ocultar notificacao de progresso:

```js
await baixarArquivo("https://exemplo.com/a.pdf", "a.pdf", {
  notificacao: false
});
```

Cuidados:

- URL depende de internet;
- base64 gigante consome memoria;
- por padrao o download fica no armazenamento do app; use `{ galeria: true }` para publicar imagem/video no MediaStore e receber `publicUri`;
- se `POST_NOTIFICATIONS` for negada, o download continua, mas `notificationShown` volta `false`;
- use `infoArmazenamento()` antes de baixar arquivos grandes.

### Abrir dentro ou fora do app

Dentro da WebView:

```js
await abrirNoApp("#/perfil");
await abrirNoApp("#/login", { substituir: true });
```

Fora do app:

```js
await abrirForaDoApp("https://exemplo.com");
await abrirWhatsapp("559999999999", "Oi, vim pelo app");
await discar("11999999999");
await abrirMapa("Avenida Paulista, Sao Paulo");
```

Cuidados:

- valide URLs antes de abrir;
- tenha fallback se WhatsApp, mapa ou discador nao existir;
- chamadas e rotas ainda dependem de confirmacao do usuario.

### Tela, tema e diagnostico

Tela ligada:

```js
await manterTelaLigada(true);
// Ao sair da tela:
await manterTelaLigada(false);
```

Brilho:

```js
await brilhoTela(0.8);
await brilhoTela(-1); // restaura comportamento padrao
```

Barras do Android:

```js
await definirCorTema({
  statusBarColor: "#126fff",
  navigationBarColor: "#101827"
});
```

Diagnostico:

```js
const aparelho = await infoDispositivo();
const rede = await infoRede();
const bateria = await infoBateria();
const memoria = await infoMemoria();
const armazenamento = await infoArmazenamento();
const desempenho = await infoDesempenho();

console.log({ aparelho, rede, bateria, memoria, armazenamento, desempenho });
```

Apps/processos visiveis:

```js
const resultado = await appsAbertos();

for (const app of resultado.apps) {
  console.log(app.nome, app.ramMb + " MB");
}
```

Cuidados:

- `brilhoTela()` afeta a janela do app, nao o sistema inteiro;
- `appsAbertos()` e limitado por privacidade do Android moderno;
- diagnostico deve atualizar em intervalo moderado, nao a cada frame.

### Localizacao

Local atual:

```js
const local = await obterLocalizacao({
  altaPrecisao: true,
  timeoutMs: 10000
});

if (local.latitude) {
  console.log(local.latitude, local.longitude);
}
```

Acompanhar:

```js
const watch = await acompanharLocalizacao();
const pararEvento = aoMudarLocalizacao((local) => {
  console.log(local.latitude, local.longitude);
});

// Ao sair da tela:
await pararLocalizacao(watch.watchId);
pararEvento();
```

Cuidados:

- permissao e pedida automaticamente;
- GPS pode estar desligado;
- sempre pare o acompanhamento quando sair da tela;
- localizacao consome bateria.

### Biometria e storage seguro

Biometria:

```js
const bio = await autenticarBiometria({
  titulo: "Confirmar acesso",
  descricao: "Use a biometria do aparelho"
});

if (bio.authenticated) {
  abrirNoApp("#/seguro");
}
```

Storage seguro:

```js
await salvarSeguro("token", "abc123");

const token = await lerSeguro("token");
console.log(token);

const chaves = await listarSeguro();
await removerSeguro("token");
```

Cuidados:

- biometria funciona em Android compativel e com seguranca configurada;
- tenha fallback por PIN/senha do proprio app;
- storage seguro e para dados pequenos, nao arquivos grandes.

### Papel de parede e icone flutuante

Aplicar imagem salva:

```js
const resultado = await definirPapelParede("foto.jpg", {
  alvo: "inicio"
});

if (!resultado.applied) {
  console.log(resultado);
}
```

Usar base64:

```js
await definirPapelParede({
  base64,
  mimeType: "image/png",
  alvo: "bloqueio"
});
```

Abrir ajustes:

```js
const info = await infoPapelParede();

if (!info.videoSupported) {
  await abrirConfiguracaoPapelParede();
}
```

Icone flutuante:

```js
const status = await iniciarIconeFlutuante();

if (status.requiresSettings) {
  console.log("O Android abriu a tela de sobreposicao");
}

// Para desligar:
// await pararIconeFlutuante();
```

Cuidados:

- wallpaper aceita imagem estatica;
- video wallpaper precisa fluxo de live wallpaper/configuracao do Android;
- fundo de chamada depende do app de telefone/fabricante;
- overlay exige permissao especial `SYSTEM_ALERT_WINDOW`;
- depois de permitir sobreposicao, chame `iniciarIconeFlutuante()` novamente.

## O que a ferramenta adiciona ao app

O app gerado ganha:

- runtime Cordova;
- early bridge, para as funcoes existirem cedo;
- plugin nativo Android;
- console runtime opcional dentro do APK;
- tema automatico opcional;
- OneSignal opcional;
- permissoes Android declaradas;
- FileProvider para compartilhar arquivos com seguranca;
- receivers para notificacoes, clique e boot;
- servico de icone flutuante;
- suporte a deep links;
- funcoes PT-BR e aliases em ingles.

## A diferenca entre app web e app html2apk

Um app web comum conhece DOM, CSS, `fetch`, `localStorage`, canvas, Web APIs e o ambiente do navegador.

Um app html2apk conhece isso tudo e tambem consegue pedir ao Android:

- "mostre uma notificacao";
- "abra a camera";
- "salve esse arquivo no armazenamento do app";
- "baixe esse conteudo e mostre progresso";
- "abra configuracao de permissao";
- "me diga bateria, rede e armazenamento";
- "mande este evento nativo para o JavaScript";
- "aplique esta imagem como papel de parede se o Android permitir".

O app continua sendo web no coracao visual, mas ganha uma camada nativa para tarefas que o navegador sozinho nao faz direito em app instalado.

---

# Parte 2 - Modo super tecnico

## O cerebro inteiro em uma frase

O html2apk e um **orquestrador de build Android com runtime nativo embutido**.

Ele nao compila HTML para Java. Ele tambem nao "converte" CSS em layout Android nativo. O que ele faz e mais pragmatismo e menos magia:

1. usa Cordova para transformar WebView em app Android;
2. injeta scripts que criam uma API JavaScript amigavel;
3. instala um plugin Android proprio;
4. liga chamadas JS a actions Java;
5. empacota tudo em APK/AAB;
6. oferece CLI e desktop para controlar o processo.

O funcionamento é dividido em etapas claras. Cada etapa tem uma responsabilidade específica, o que facilita diagnóstico, manutenção e evolução da ferramenta.

## Mapa mental do fluxo

```text
Entrada do usuario
  app.json / config.json / overrides da UI / flags CLI

Neuronio 1: normalizacao
  junta defaults + config + overrides
  corrige aliases
  limita valores perigosos

Neuronio 2: validacao
  confere packageId
  confere appName
  confere entryFile
  impede webRoot/entryFile fora do projeto

Neuronio 3: ambiente
  descobre Java, Gradle, Android SDK e Cordova
  monta PATH efetivo para comandos

Neuronio 4: projeto temporario
  cria Cordova app isolado
  copia assets
  gera config.xml
  copia arquivos web

Neuronio 5: injecao runtime
  adiciona early bridge
  adiciona runtime console se ligado
  adiciona cordova.js se necessario
  adiciona auto theme / OneSignal se configurado

Neuronio 6: ponte nativa
  copia plugin local
  instala plugin Cordova
  declara permissoes e componentes Android

Neuronio 7: compilacao
  adiciona plataforma Android
  chama cordova build
  encontra APK/AAB gerado
  copia para dist/

Neuronio 8: pos-build
  limpa temporario se nao for debug
  devolve caminho, logs e status
```

Esse e o fluxo principal. A interface visual e a CLI chegam no mesmo cerebro por portas diferentes.

## Neuronio 1 - A intencao vira configuracao normalizada

O primeiro trabalho da ferramenta e descobrir o que o usuario quer.

As fontes de configuracao seguem uma ordem:

1. defaults internos;
2. `app.json` ou `config.json`;
3. overrides vindos da CLI, UI desktop ou chamada como biblioteca.

Isso e importante porque permite um projeto ter configuracao salva, mas ainda aceitar um comando temporario como:

```bash
html2apk build --release --aab
```

sem reescrever o arquivo de config.

### Algoritmo de merge

O merge e profundo para objetos simples.

Isso significa:

- campos soltos substituem campos antigos;
- objetos internos, como `keystore`, podem ser completados por partes;
- arrays, como `permissions` e `plugins`, sao substituidos de forma direta;
- valores `undefined` nao apagam configuracao existente.

Esse comportamento e conservador. Ele evita que um override parcial destrua toda uma configuracao aninhada sem querer.

### Normalizacao

Depois do merge, a ferramenta transforma a configuracao em uma forma previsivel.

Exemplos:

- `mode` invalido vira `standalone`;
- `vertical` vira `portrait`;
- `horizontal` vira `landscape`;
- orientacao desconhecida vira `default`;
- `buildFormat: "aab"` forca `release: true`;
- `themeColor: "auto"` ativa `themeMode: "auto"`;
- cor invalida volta para `#126fff`;
- `minSdkVersion` fora do intervalo aceito volta ao minimo padrao;
- `permissions` e `plugins` viram arrays limpos;
- aliases de OneSignal sao unificados;
- aliases de console runtime sao unificados.

O objetivo da normalizacao e fazer o resto do sistema pensar menos. Depois dela, os neuronios seguintes nao precisam adivinhar cinco formas diferentes de dizer a mesma coisa.

### Vantagem

O usuario pode escrever configuracoes mais humanas, e o sistema transforma em uma estrutura mais rigida para o build.

### Limite

Normalizar tambem significa tomar decisoes. Se o usuario digita um valor invalido, a ferramenta prefere voltar para um padrao seguro em vez de tentar interpretar criatividade demais. E melhor um build previsivel do que um APK "surpresa".

## Neuronio 2 - Validacao de fronteiras

Antes de copiar qualquer coisa, o html2apk checa fronteiras.

O ponto mais importante: `webRoot` e `entryFile` precisam ficar dentro da pasta do projeto.

O raciocinio e:

```text
projectRoot
  contem webRoot?
    contem entryFile?
      entryFile existe?
```

Essa validacao evita configuracoes como:

```json
{
  "webRoot": "../../",
  "entryFile": "algum-arquivo-fora.html"
}
```

Esse tipo de caminho e bloqueado porque o build nao deve sair coletando arquivo fora do projeto do usuario.

### Package ID

O `packageId` precisa seguir o formato Android:

```text
com.empresa.app
```

Cada parte deve comecar com letra e pode ter letras, numeros e underscore. O Android usa isso como identidade do app, entao nao da para tratar como apelido qualquer.

### Vantagem

Seguranca e previsibilidade. A ferramenta sabe exatamente o que pode copiar e o que pode compilar.

### Limite

Projetos que dependem de arquivos fora da raiz precisam trazer esses arquivos para dentro do projeto ou usar mapeamentos permitidos. Isso e intencional.

## Neuronio 3 - Ambiente Android

Gerar APK depende de ferramentas externas:

- Java;
- Javac;
- Gradle;
- Cordova;
- Android SDK;
- platform-tools;
- cmdline-tools;
- build-tools;
- plataforma Android.

O html2apk tenta encontrar essas pecas em locais padrao do sistema e em variaveis de ambiente.

### Algoritmo de descoberta

O runtime manager procura:

- `ANDROID_HOME`;
- `ANDROID_SDK_ROOT`;
- pastas padrao do Android SDK no sistema;
- `JAVA_HOME`;
- instalacoes comuns de JDK;
- `GRADLE_HOME`;
- instalacoes comuns de Gradle;
- subpastas mais recentes de build-tools.

Depois ele monta um ambiente efetivo:

```text
PATH final =
  node_modules/.bin
  platform-tools
  emulator
  cmdline-tools/latest/bin
  tools/bin
  build-tools mais recente
  Java/bin
  Gradle/bin
  PATH original
```

Assim, quando o build chama `cordova`, `adb` ou `gradle`, ele tem mais chance de encontrar o executavel certo.

### Doctor

O `doctor` executa comandos reais e checa pastas reais. Ele nao fica so olhando variavel bonita.

Ele testa:

- `java -version`;
- `javac -version`;
- `gradle -v`;
- `cordova --version`;
- existencia do SDK;
- existencia de platform-tools;
- existencia de cmdline-tools;
- existencia de sdkmanager;
- plataforma Android exigida;
- build-tools exigido;
- escrita na pasta do projeto;
- escrita na pasta temporaria.

### Vantagem

O usuario recebe diagnostico antes do build falhar no meio do caminho.

### Limite

O doctor nao consegue consertar tudo sozinho em todos os sistemas. Ele aponta. A UI pode ajudar a instalar requisitos, mas Android SDK ainda e uma dependencia externa com suas proprias manias.

## Neuronio 4 - O projeto temporario

O html2apk nao transforma o projeto original em projeto Cordova diretamente.

Ele cria um ambiente temporario.

Isso e uma decisao muito importante.

### Por que temporario?

Porque o projeto do usuario deve continuar limpo. O build Android gera pastas, cache, plugins, plataformas, arquivos Gradle e varias coisas que nao pertencem ao projeto web original.

O fluxo e:

```text
cria pasta temporaria
  cria projeto Cordova dentro dela
  copia web assets para www
  instala plugin
  compila
  copia APK/AAB para dist do projeto real
  remove temporario se debug nao estiver ligado
```

### Vantagem

O projeto original não recebe as pastas pesadas geradas pelo Cordova. Isso reduz conflitos, arquivos temporários e acoplamento entre o código web e o processo de build Android.

### Limite

Se o usuário quer investigar o build Android por dentro, precisa usar modo debug para manter o temporário. Fora disso, a ferramenta remove os arquivos temporários ao final.

## Neuronio 5 - Copia de arquivos web

O html2apk copia o conteudo web para `www`, mas com regras.

Por padrao ele ignora coisas como:

- controle de versao;
- `node_modules`;
- pastas de build;
- `dist`;
- `platforms`;
- `plugins`;
- arquivos de configuracao do html2apk.

### Algoritmo de copia padrao

```text
para cada item dentro do webRoot:
  se o nome esta na lista de ignorados:
    pula
  se for diretorio:
    copia recursivamente
  se for arquivo:
    copia preservando estrutura
```

### Algoritmo com `files`

Quando `files` existe, a ferramenta muda de estrategia: ela copia somente o que foi declarado.

Cada item pode ser string ou objeto:

```json
{
  "files": [
    "index.html",
    { "from": "src", "to": "app" }
  ]
}
```

Antes de copiar, ela confere:

- origem continua dentro do projeto;
- destino continua dentro do `www`;
- diretorios sao copiados recursivamente;
- arquivos sao copiados individualmente.

### Vantagem

O modo padrao e simples. O modo `files` e preciso.

### Limite

Se o projeto depende de uma pasta ignorada, como `dist`, o usuario precisa mapear isso conscientemente. O padrao evita mandar lixo para o APK, mas projetos diferentes podem querer outras escolhas.

## Neuronio 6 - Sintese do `config.xml`

O `config.xml` e a conversa com Cordova.

Ele declara:

- identidade do app;
- nome visivel;
- HTML inicial;
- acesso web;
- intents permitidas;
- fullscreen;
- AndroidX;
- local de arquivos persistentes;
- launch mode;
- min SDK;
- modo html2apk;
- tema;
- OneSignal;
- orientacao;
- permissoes;
- deep links;
- icone;
- splash.

### Algoritmo de permissoes

O usuario pode escrever:

```json
["CAMERA", "android.permission.RECORD_AUDIO"]
```

A ferramenta transforma permissoes curtas em nomes Android completos:

```text
CAMERA -> android.permission.CAMERA
```

Depois remove duplicadas.

Se o modo for `floating`, ela garante `SYSTEM_ALERT_WINDOW` no config. A bridge tambem declara essa permissao no plugin para o Android listar o app na tela de sobreposicao.

### Algoritmo de deep link

Schemes simples viram intent filters com:

- `VIEW`;
- `DEFAULT`;
- `BROWSABLE`;
- `data android:scheme`.

App links recebem host, scheme e paths.

Se o path contem `*`, ele vira `pathPattern` com `.*`. Se nao contem wildcard, vira `pathPrefix`.

### Escape XML

Tudo que entra em XML passa por escape:

- `&`;
- `<`;
- `>`;
- aspas.

Isso evita quebrar o XML quando o usuario coloca nome, cor, host ou caminho com caractere especial.

### Vantagem

O usuario configura em JSON; a ferramenta escreve o XML chato.

### Limite

Cordova e Android ainda mandam nas regras finais. Se uma permissao existe mas o Android moderno exige dialog em runtime, declarar no manifest nao basta. Manifest e convite; runtime permission e a porta.

## Neuronio 7 - Injecao de runtime nos HTMLs

Depois que os arquivos web estao no `www`, o html2apk procura arquivos `.html` e `.htm`.

Para cada HTML, ele verifica se ja existe:

- `html2apk-early-bridge.js`;
- `html2apk-runtime-console.js`, quando logs runtime estao ligados;
- `cordova.js`.

Se ja existe, nao duplica.

### Algoritmo de injecao

```text
para cada HTML encontrado:
  calcula caminho relativo ate cordova.js
  calcula caminho relativo ate early bridge
  calcula caminho relativo ate runtime console, se existir
  monta tags que ainda faltam
  se existe <head>:
    injeta logo depois de <head>
  senao se existe <html>:
    injeta logo depois de <html>
  senao:
    coloca as tags no topo do arquivo
```

### Por que a ordem importa

A ordem e:

```html
<script src="html2apk-early-bridge.js"></script>
<script src="html2apk-runtime-console.js"></script>
<script src="cordova.js"></script>
```

A early bridge entra cedo para que as funcoes globais existam o quanto antes.

O runtime console entra antes do Cordova para conseguir envolver funcoes conhecidas e capturar logs desde o comeco.

O `cordova.js` entra como runtime oficial que depois libera `deviceready`.

### Vantagem

O usuario nao precisa lembrar de colocar scripts no HTML.

### Limite

Se o HTML é muito incomum ou gerado de forma dinâmica, a injeção usa heurística textual. Ela é robusta para HTML normal, mas não substitui um parser HTML completo.

## Neuronio 8 - Early bridge

A early bridge e uma peca inteligente.

Ela existe porque o JavaScript do usuario pode tentar chamar uma funcao antes do Cordova estar pronto.

Em vez de simplesmente quebrar, ela:

1. cria funcoes globais;
2. aguarda `deviceready`;
3. verifica se `cordova.exec` esta disponivel;
4. espera o canal `onCordovaReady`;
5. tenta por ate 10 segundos;
6. executa a action nativa;
7. retorna Promise.

### Algoritmo de espera

```text
se cordova.exec ja esta pronto:
  resolve imediatamente
senao:
  a cada 25ms:
    confere se o canal Cordova ficou pronto
    se ficou:
      resolve
    se passou de 10s:
      rejeita com erro claro
```

Isso evita uma classe inteira de bug: "chamei a funcao no primeiro script e ela nao existia".

### Normalizacao de argumentos

A early bridge tambem traduz formas humanas para payloads nativos.

Exemplo com notificacao:

```js
notificar("Oi")
```

vira algo como:

```js
{
  title: "Notificacao",
  text: "Oi",
  onClick: { action: "open-app" }
}
```

Exemplo com arquivo:

```js
salvarArquivo("perfil.json", { nome: "Ana" })
```

vira payload com nome, valor e tipo serializavel.

Exemplo com download:

```js
baixarBase64("foto.png", base64)
```

vira payload de `downloadFile` com origem `base64`.

### Aliases

A bridge expoe nomes em portugues e ingles.

Isso nao e perfumaria. E estrategia de acesso:

- PT-BR para o publico principal;
- ingles para quem ja vem de APIs comuns;
- ambos chamando a mesma action nativa.

### Vantagem

O app do usuario escreve uma API simples. A bridge cuida da espera, traducao, aliases, click de notificacao, eventos e compatibilidade.

### Limite

Nem tudo pode ser serializado. Funcoes JavaScript nao podem atravessar diretamente para Java. Quando precisa lidar com callbacks, a bridge registra IDs e depois reexecuta no lado JS quando o evento volta.

## Neuronio 9 - Plugin JS do Cordova

A early bridge existe fora do sistema de modulos do Cordova.

O plugin JS existe dentro dele.

Ele usa `cordova/exec` diretamente e expoe a API como modulo Cordova. Na pratica, os dois lados mantem a mesma linguagem publica:

```text
notificar -> notify
tirarFoto -> capturePhoto
salvarArquivo -> saveStoredFile
baixarArquivo -> downloadFile
definirPapelParede -> setWallpaper
autenticarBiometria -> authenticateBiometric
```

### Por que existem dois scripts parecidos?

Porque eles resolvem tempos diferentes:

- early bridge: existe cedo, antes de tudo estar pronto;
- plugin JS: representa a API Cordova instalada.

Essa duplicacao controlada evita que o usuario precise entender o ciclo de vida do Cordova para usar uma funcao simples.

### Vantagem

API mais tolerante ao momento em que o usuario chama a funcao.

### Limite

Toda action nova precisa existir nos dois mundos JS e no Java. Por isso os testes procuram chamadas `call("...")` e conferem se o Java implementa a action correspondente.

## Neuronio 10 - Dispatcher Java

No Android, tudo chega como:

```text
action + args + callbackContext
```

O Java recebe a action e decide qual metodo executar.

Exemplos:

```text
"notify" -> showNotification
"capturePhoto" -> captureMedia
"saveStoredFile" -> saveStoredFile
"downloadFile" -> downloadFile
"setWallpaper" -> setWallpaper
"getLocation" -> getLocation
"authenticateBiometric" -> authenticateBiometric
```

### Padrao de retorno

O Java responde por `CallbackContext`:

- `success(...)` para sucesso;
- `error(...)` para falha.

No JavaScript isso vira resolve/reject da Promise.

### Trabalho em UI thread e background thread

Nem toda operacao roda no mesmo lugar.

Operacoes de interface, como toast, barras do sistema e certas chamadas Android, precisam ir para UI thread.

Operacoes pesadas, como download, rodam no thread pool do Cordova para nao travar a WebView.

### Vantagem

A action e uma fronteira clara. A ponte JS nao precisa conhecer detalhes Android; ela so chama uma action com argumentos.

### Limite

O dispatcher cresce com o numero de funcoes. Isso exige disciplina: action nova precisa ser documentada, testada e conectada dos dois lados.

## Neuronio 11 - Modelo de permissoes

Android moderno nao deixa o app fazer tudo so porque o manifest pediu.

O html2apk tem um modelo de permissao em duas fases:

1. declaracao no manifest;
2. pedido em runtime quando necessario.

### Callbacks pendentes

Quando uma funcao precisa de permissao, a bridge guarda:

- qual callback esta esperando;
- quais opcoes estavam em andamento;
- se a acao era foto, video, microfone, localizacao, notificacao ou download.

Depois que o Android responde, a bridge retoma a operacao original.

Exemplo:

```text
tirarFoto()
  sem CAMERA
    guarda callback e opcoes
    pede CAMERA
      concedeu?
        continua captura
      negou?
        retorna erro/status
```

### Busy state

Se uma permissao ja esta pendente e outra chamada tenta pedir a mesma familia de permissao, a bridge responde como ocupada.

Isso evita dois dialogs ou dois callbacks brigando pelo mesmo retorno.

### Permissao que vira configuracao

Algumas permissoes podem ser negadas de um jeito que o Android nao mostra mais dialog. Nesses casos, a bridge detecta se deve abrir configuracoes do app e retorna flags como:

- `requiresSettings`;
- `settingsOpened`;
- `permissionGranted`.

### Permissoes especiais

Nem toda permissao usa dialog normal.

Exemplos:

- `SYSTEM_ALERT_WINDOW` usa tela especial de sobreposicao;
- alarme exato pode exigir configuracao propria;
- notificacao no Android 13+ usa `POST_NOTIFICATIONS`;
- overlay precisa o app estar declarado no manifest para aparecer na lista.

### Vantagem

O usuario chama uma funcao. A ferramenta tenta lidar com o caminho Android correto.

### Limite

O usuario final ainda pode negar. Fabricantes tambem podem mudar telas e politicas. A ferramenta pode abrir a porta certa, mas nao pode apertar "permitir" pelo usuario.

## Neuronio 12 - Notificacoes

As notificacoes sao um subsistema inteiro.

### Notificacao imediata

Fluxo:

```text
notificar(options)
  normaliza titulo/texto/click/actions
  confere POST_NOTIFICATIONS
  cria canal Android se necessario
  monta NotificationCompat.Builder
  cria PendingIntent de clique
  adiciona acoes
  mostra notificacao
```

### Clique

O clique pode:

- abrir o app;
- disparar evento para JavaScript;
- executar callback registrado;
- abrir uma URL externa quando o app nao esta vivo e a acao permite fallback nativo.

O detalhe do clique viaja como JSON.

### Notificacao agendada

Fluxo:

```text
agendarNotificacao(options)
  calcula horario
  decide se pode usar alarme exato
  salva agendamento
  agenda AlarmManager
```

### Persistencia

Notificacoes agendadas sao salvas em armazenamento interno. Isso permite reprogramar depois de boot ou update do app.

### Loop de notificacoes

Loop de notificacoes guarda uma lista e intervalo. Quando uma notificacao dispara, o receiver calcula a proxima e agenda de novo.

### Vantagem

O usuario pode criar notificacoes simples ou fluxos mais avancados sem escrever Java.

### Limite

Android controla energia, permissão de notificação e alarme exato. Em alguns aparelhos, economia de bateria pode atrasar eventos.

## Neuronio 13 - Runtime console

O runtime console e um depurador dentro do APK.

Ele captura:

- `console.log`;
- `console.info`;
- `console.warn`;
- `console.error`;
- erros globais;
- promises rejeitadas;
- `fetch`;
- `XMLHttpRequest`;
- chamadas das funcoes html2apk;
- retornos e falhas dessas funcoes.

Ele mantem ate 300 entradas e limita detalhes longos para nao transformar debug em um romance infinito.

### Algoritmo de captura

```text
substitui console.log/info/warn/error por wrappers
  salva entrada no painel
  chama console original

envolve funcoes conhecidas
  registra chamada
  aguarda Promise
  registra retorno ou erro

envolve fetch/XMLHttpRequest
  mede duracao
  coleta status
  captura amostras de request/response
```

### Copia de logs

O console tem:

- copiar console completo;
- copiar apenas erros;
- limpar aba;
- aba de rede;
- badge de quantidade de erros.

### Vantagem

O usuario testa no celular e consegue enxergar o que aconteceu sem depender sempre de `adb logcat`.

### Limite

Ele e depurador de runtime JavaScript e rede da WebView. Erros nativos profundos ainda podem exigir logs Android. Alem disso, guardar tudo seria pesado, entao ele corta entradas antigas.

## Neuronio 14 - Auto theme

O tema automatico tenta fazer as barras do Android acompanharem a tela.

Ele nao adivinha o design. Ele amostra o DOM.

### Algoritmo

```text
pega ponto proximo ao topo
  elementFromPoint
  sobe nos pais ate achar background visivel
  converte cor para hex

pega ponto proximo ao rodape
  repete o processo

calcula luminancia
  se fundo claro:
    pede icones escuros
  se fundo escuro:
    pede icones claros

chama setSystemBarsColor
```

Ele roda em eventos:

- scroll;
- resize;
- visibilitychange;
- mutation observer;
- intervalo de seguranca.

### Vantagem

Apps com telas coloridas ficam mais integrados ao Android.

### Limite

Gradientes, vídeos, canvas, imagens e transparências complexas nem sempre podem ser inferidos perfeitamente por `getComputedStyle`. O algoritmo observa a cor CSS disponível, não o conteúdo real de cada pixel renderizado.

## Neuronio 15 - Arquivos internos

O CRUD de arquivos salva no armazenamento proprio do app.

Funcoes principais:

- salvar;
- ler;
- ler completo;
- listar;
- info;
- existe;
- abrir;
- compartilhar;
- excluir.

### Modelo de seguranca

Nomes de arquivo sao validados:

- nao pode ter `/`;
- nao pode ter `\`;
- nao pode ter `:`;
- nao pode conter `..`;
- nao pode ser vazio.

Isso impede path traversal.

### Conteudo

O conteudo pode ser:

- string;
- JSON serializado;
- base64;
- arquivo/URI em alguns fluxos.

Ao salvar, a bridge tambem grava metadados:

- nome;
- mimeType;
- tipo;
- atualizado em.

### Compartilhamento

Para abrir ou compartilhar arquivo, a bridge usa FileProvider.

Isso evita expor caminho real de arquivo e segue o modelo moderno do Android.

### Vantagem

O app consegue persistir arquivos sem pedir para o usuario escolher pasta toda hora.

### Limite

Esse armazenamento e do app. Se o app for removido, os dados podem ir junto. Para exportar para fora, use abrir/compartilhar/download ou seletor apropriado.

## Neuronio 16 - Downloads

Download no html2apk e mais amplo que "baixar uma URL".

As origens aceitas incluem:

- URL HTTP/HTTPS;
- base64;
- data URL;
- `content://`;
- `file://` ou caminho local permitido;
- arquivo ja salvo pelo app.

Todas essas origens convergem para uma abstracao interna:

```text
DownloadSource
  inputStream
  totalBytes
  mimeType
  type
  url
  defaultName
  sourceFile
```

### Algoritmo de download

```text
normaliza origem
  se URL:
    abre HttpURLConnection
    valida status 2xx
    usa content-length quando existir
  se base64:
    decodifica bytes
  se URI:
    abre InputStream via ContentResolver
  se path:
    abre FileInputStream
  se stored file:
    abre arquivo interno

resolve nome de destino
  usa nome informado
  senao usa nome da origem
  senao cria download-timestamp.bin
  sanitiza nome

abre arquivo no armazenamento interno
  copia em blocos de 8192 bytes
  sincroniza arquivo ao final
  grava metadados
  retorna info
```

### Notificacao de progresso

Se o usuario quer notificacao e a permissao existe, a bridge mostra progresso.

Ela atualiza a barra:

- por porcentagem quando `totalBytes` existe;
- como indeterminada quando nao sabe o tamanho;
- sem atualizar a cada byte, para nao castigar o sistema.

O código usa salto mínimo de progresso e intervalo de tempo para evitar excesso de atualizações na notificação.

### Vantagem

O mesmo comando cobre URL, base64 e copia local. Isso e muito util para apps de midia, wallpaper, documento e cache.

### Limite

Base64 gigante consome memoria. URL depende de rede. `content://` depende da permissao concedida pelo seletor. Notificacao depende de `POST_NOTIFICATIONS`.

## Neuronio 17 - Papel de parede

O html2apk usa APIs publicas do Android para aplicar imagem estatica como papel de parede.

Entradas aceitas:

- arquivo interno;
- URI;
- caminho;
- base64;
- data URL.

Alvos:

- tela inicial;
- tela de bloqueio;
- ambos.

### Algoritmo

```text
normaliza fonte
  descobre mimeType
  se for video:
    retorna limite conhecido
  se alvo for fundo de chamada:
    retorna limite conhecido
  decodifica bitmap
  chama WallpaperManager
  escolhe FLAG_SYSTEM / FLAG_LOCK quando API permite
  retorna resultado
```

### Por que video e fundo de chamadas sao limitados?

Porque video wallpaper normalmente envolve live wallpaper, que e outro fluxo Android. Fundo de chamadas depende de app de telefone/fabricante e nao existe API publica estavel para todos.

### Vantagem

Apps de wallpaper conseguem aplicar imagens direto quando o Android permite.

### Limite

O Android e o fabricante do aparelho podem limitar aplicacao direta. Quando nao da para aplicar, a ferramenta pode abrir configuracoes de wallpaper para o usuario concluir.

## Neuronio 18 - Camera, video, microfone e QR Code

### Camera e video

Camera e video usam intents Android e permissao `CAMERA`.

O fluxo e:

```text
capturar midia
  confere permissao
  se necessario pede CAMERA
  cria destino temporario/URI
  abre app de camera
  recebe resultado
  devolve URI/base64/metadados
```

### Microfone

Microfone usa `MediaRecorder`.

Fluxo:

```text
ouvirMic()
  confere RECORD_AUDIO
  inicia gravacao

pararMic()
  finaliza recorder
  le arquivo
  devolve base64, mimeType, extensao, tamanho
```

### QR Code

O QR Code usa captura de foto e tenta detectar no lado WebView quando a API de barcode esta disponivel.

### Vantagem

O usuario chama funcoes simples e ganha acesso a midia nativa.

### Limite

Camera real depende do app de camera do aparelho. QR Code depende de suporte de API na WebView. Microfone depende de permissao e de ciclo de vida: sair do app pode interromper gravacao.

## Neuronio 19 - Localizacao

Localizacao usa `LocationManager`.

### Obter localizacao

Fluxo:

```text
obterLocalizacao(options)
  confere permissao fina/grosseira
  escolhe provider
  tenta ultima localizacao conhecida
  se necessario pede uma atualizacao atual
  respeita timeout
  devolve latitude, longitude, precisao, provider, timestamp
```

### Acompanhar localizacao

Fluxo:

```text
acompanharLocalizacao(options)
  confere permissao
  escolhe provider
  cria id de watch
  registra listener
  devolve eventos para JS
```

### Escolha de provider

Se alta precisao esta ligada e GPS esta disponivel, prefere GPS.

Senao tenta network.

Senao tenta GPS mesmo sem alta precisao.

Senao tenta passive.

### Vantagem

Da para usar localizacao pontual ou acompanhamento continuo com API JavaScript.

### Limite

GPS pode estar desligado, localizacao pode estar bloqueada, aparelho pode economizar bateria e provider pode nao retornar dentro do timeout.

## Neuronio 20 - Biometria

Biometria usa `BiometricPrompt`.

Antes de abrir o prompt, a bridge confere se o aparelho tem seguranca configurada.

Fluxo:

```text
autenticarBiometria(options)
  confere disponibilidade
  cria prompt
  aguarda sucesso/cancelamento/falha
  devolve authenticated/canceled/message
```

### Vantagem

Autenticacao local para proteger fluxos sensiveis.

### Limite

Biometria nao substitui servidor, token nem criptografia de dados remotos. Ela prova uma interacao local com o aparelho.

## Neuronio 21 - Storage seguro

Storage seguro usa:

- AndroidKeyStore;
- AES/GCM/NoPadding;
- IV por valor;
- SharedPreferences para guardar ciphertext, IV e tipo.

### Algoritmo de escrita

```text
salvarSeguro(chave, valor)
  valida chave
  serializa conteudo
  pega ou cria chave AES no AndroidKeyStore
  criptografa com AES-GCM
  guarda ciphertext + IV + tipo
```

### Algoritmo de leitura

```text
lerSeguro(chave)
  busca ciphertext e IV
  se nao existe:
    retorna exists false
  descriptografa com chave do AndroidKeyStore
  reconstrui valor conforme tipo
```

### Vantagem

Bom para tokens, pequenas preferencias sensiveis e dados curtos.

### Limite

Nao e banco de dados. Nao e lugar para video, imagem pesada ou arquivo grande. Para isso existe CRUD de arquivos.

## Neuronio 22 - Eventos nativos

Eventos nativos voltam para o JavaScript usando `CustomEvent`.

O Java monta um JSON e executa script na WebView:

```text
window.dispatchEvent(new CustomEvent("html2apk:event", { detail }))
window.dispatchEvent(new CustomEvent("html2apk:" + detail.type, { detail }))
```

Do lado JS, `aoEvento()` registra listeners.

Eventos incluem:

- app pronto;
- app pausado;
- app voltou;
- app fechado;
- botao voltar;
- deep link aberto;
- rede mudou;
- bateria mudou;
- localizacao mudou;
- notificacao clicada.

### Vantagem

O app web reage a acontecimentos Android sem polling constante.

### Limite

Se o app esta morto, nem todo evento pode chegar em JavaScript imediatamente. Alguns dados iniciais ficam guardados para `getInitialNotification` ou `getInitialLink`.

## Neuronio 23 - Deep links

Deep link entra pelo Android como intent.

Fluxo:

```text
usuario abre link
  Android entrega intent ao app
  bridge extrai uri, scheme, host, path, query
  guarda initialLink
  se WebView ja esta viva:
    dispara evento link:aberto
```

### Vantagem

O app pode ser aberto por URL/scheme e reagir no JavaScript.

### Limite

App links com `autoVerify` dependem de configuracao externa do dominio. O html2apk gera intent filter; a confianca do dominio e assunto do Android e do site.

## Neuronio 24 - Icone flutuante

O modo flutuante usa um servico Android de overlay.

Fluxo:

```text
mode floating ou iniciarIconeFlutuante()
  confere SYSTEM_ALERT_WINDOW
  se nao tem:
    abre configuracao de sobreposicao
  se tem:
    inicia FloatingIconService
    cria botao sobre outros apps
    permite arrastar
    clique volta para o app
```

### Vantagem

Serve para apps que precisam ficar acessiveis por cima de outros apps.

### Limite

Overlay e permissao especial. O usuario precisa permitir manualmente. Alguns fabricantes mudam a tela de permissao. Declarar `SYSTEM_ALERT_WINDOW` e necessario para aparecer na lista, mas ainda nao concede automaticamente.

## Neuronio 25 - USB debug

O teste por USB faz mais do que "rodar".

Fluxo:

```text
verifica adb devices
  ignora emuladores
  procura device fisico autorizado
  se unauthorized:
    avisa para aceitar RSA
  se offline:
    avisa para reconectar/desbloquear

prepara projeto Cordova
  tenta cordova run android --device
  se falhar:
    builda APK debug
    adb install -r -d
    adb shell monkey para abrir app
```

### Vantagem

A UI consegue instalar e abrir no celular mesmo quando o caminho Cordova direto falha.

### Limite

Depende de cabo, driver, ADB, modo desenvolvedor e autorização RSA no celular. Se qualquer uma dessas partes falhar, o teste USB não consegue instalar ou abrir o app.

## Neuronio 26 - Desktop Electron

A interface visual e separada em tres responsabilidades:

- processo principal: acessa sistema, roda build, abre dialogos, gerencia janela;
- preload: expoe uma API segura para o renderer;
- renderer: controla UI, estado, formularios, editor, logs e abas.

### Seguranca

O renderer nao recebe Node direto.

Ele fala com o preload por uma API limitada.

O editor so acessa arquivos dentro do projeto escolhido, bloqueia caminhos absolutos perigosos, bloqueia `..`, ignora pastas pesadas e limita tamanho de arquivo editavel.

### Laboratorio de funcoes

O botao "Testar funcoes" cria um projeto temporario com:

- app de teste;
- permissoes amplas;
- runtime console ligado;
- botoes para executar funcoes nativas;
- instalacao via USB.

Esse laboratorio nao deve ter console duplicado. Ele usa o runtime console oficial do html2apk.

### Vantagem

O usuario consegue experimentar recursos nativos em aparelho real sem criar app de teste manualmente.

### Limite

Algumas funcoes so fazem sentido em aparelho real e com permissao concedida. O laboratorio mostra comportamento real, inclusive as recusas.

## Neuronio 27 - OneSignal

OneSignal e opcional.

Quando existe App ID:

1. instala plugin OneSignal;
2. injeta script de inicializacao;
3. expoe helpers para permissao, login, logout, tags e clique.

### Vantagem

Push remoto entra no app sem o usuario montar tudo do zero.

### Limite

OneSignal exige configuracao fora do html2apk. App ID publico pode ir no app. Chave REST secreta nao deve ir no APK.

## Neuronio 28 - Artifact finder

Depois do `cordova build`, a ferramenta precisa encontrar o artefato final.

Ela procura dentro da saida Android por:

- `.apk`, quando formato e APK;
- `.aab`, quando formato e AAB.

Depois prefere o artefato que combina com o flavor esperado:

- `debug`;
- `release`.

Se houver mais de um, pega o mais recente.

### Vantagem

Mesmo que Cordova mude um pouco a pasta de saida, a ferramenta procura recursivamente.

### Limite

Se Cordova terminou sem gerar artefato, a ferramenta falha explicitamente. Ela nao tenta fingir que gerou.

## Neuronio 29 - Assinatura e release

Build debug e feito para teste.

Build release pode usar keystore.

Quando ha keystore, a ferramenta monta configuracao de build com:

- caminho da keystore;
- store password;
- alias;
- key password;
- tipo;
- package type APK ou bundle.

### Vantagem

Permite gerar artefato pronto para distribuicao quando a configuracao esta correta.

### Limite

Keystore e responsabilidade seria. Se perder a chave, atualizar app publicado pode virar um pequeno drama administrativo.

## Neuronio 30 - Testes como rede de seguranca

Os testes cobrem:

- parse de flags CLI;
- defaults;
- injecao de runtime;
- config XML;
- permissoes;
- splash;
- tema;
- AAB;
- min SDK;
- orientacao;
- deep links;
- runtime manager;
- APIs da bridge;
- consistencia JS/Java;
- laboratorio USB;
- OneSignal;
- prioridade de config.

O teste mais importante para funcoes interpretadas procura actions chamadas no JS e verifica se o Java implementa.

Isso evita o pior tipo de bug de ferramenta visual: botao bonito chamando coisa inexistente. Bonito por fora, vazio por dentro. Uma obra de decoracao, nao de engenharia.

---

# Como uma chamada interpretada atravessa o sistema

Vamos seguir um exemplo:

```js
await baixarArquivo("https://exemplo.com/foto.png", "foto.png");
```

## Passo 1 - API publica

O usuario chama `baixarArquivo`.

A bridge reconhece que o primeiro argumento e URL e o segundo e nome de destino.

Ela monta:

```js
{
  url: "https://exemplo.com/foto.png",
  name: "foto.png"
}
```

## Passo 2 - Espera do Cordova

Antes de chamar nativo, a bridge garante que `cordova.exec` esta pronto.

Se ainda nao esta, espera.

Se passar de 10 segundos, rejeita com erro.

## Passo 3 - Action nativa

A chamada vira:

```text
service: Html2ApkBridge
action: downloadFile
args: [payload]
```

## Passo 4 - Java dispatcher

O Java recebe `downloadFile`, valida opcoes e decide se precisa pedir permissao de notificacao.

Se precisa pedir, guarda callback e opcoes.

Se nao precisa, inicia o download.

## Passo 5 - Thread de background

Download roda no thread pool.

Ele abre a origem, cria destino, copia bytes, atualiza notificacao e grava metadados.

## Passo 6 - Resultado

O Java devolve JSON:

```js
{
  downloaded: true,
  name: "foto.png",
  size: 12345,
  sourceType: "url",
  progressNotification: true,
  notificationShown: true
}
```

## Passo 7 - Promise resolve

O JavaScript recebe esse JSON como resultado do `await`.

Se o runtime console estiver ligado, ele tambem registra chamada, tempo, retorno ou erro.

Essa caminhada e o coracao da ferramenta.

---

# Principais vantagens tecnicas

## 1. Separacao entre projeto do usuario e build Android

O projeto web nao e contaminado por pastas Android pesadas.

## 2. Normalizacao antes de execucao

O sistema reduz ambiguidade cedo.

## 3. Validacao de fronteiras

Arquivos nao saem passeando fora do projeto.

## 4. Bridge bilingue

PT-BR e ingles coexistem sem duplicar implementacao nativa.

## 5. Runtime console dentro do APK

Debug em aparelho real fica muito mais acessivel.

## 6. Funcoes nativas prontas

O usuario nao precisa escrever plugin Cordova para cada recurso Android comum.

## 7. CLI e desktop no mesmo cerebro

Automacao e uso visual compartilham logica principal.

## 8. USB com fallback ADB

Se `cordova run` falha, a ferramenta ainda tenta instalar e abrir via ADB.

## 9. Teste de consistencia JS/Java

Actions novas precisam existir dos dois lados.

## 10. Limites assumidos

A ferramenta nao promete APIs Android que nao existem de forma publica e estavel. Isso e maturidade, nao fraqueza.

---

# Limites reais e por que eles existem

## WebView continua sendo WebView

O app roda dentro de uma WebView Cordova.

Isso significa que:

- layout continua sendo HTML/CSS;
- JavaScript continua sendo JavaScript;
- desempenho visual depende da WebView;
- APIs web dependem da versao da WebView instalada.

## Android controla permissoes

Declarar permissao nao concede permissao.

O usuario e o sistema operacional decidem.

## Fabricantes alteram comportamento

Alguns aparelhos mudam telas de permissao, economia de bateria, overlay e background.

## Base64 grande pesa

Base64 e pratico, mas aumenta tamanho e usa memoria. Para arquivos grandes, streaming por URL/URI e melhor.

## Notificacoes dependem do Android 13+

Em Android 13 ou superior, `POST_NOTIFICATIONS` precisa ser concedida.

## Alarme exato nao e garantido

Android pode exigir permissao especial ou atrasar alarmes por economia de energia.

## Papel de parede tem fronteira publica

Imagem estatica e possivel. Video wallpaper e fundo de chamada nao sao universais por API publica.

## Apps abertos sao limitados por privacidade

Android moderno nao deixa um app enxergar tudo que esta rodando como antigamente.

## OneSignal nao substitui configuracao externa

O plugin entra no app, mas push remoto depende do painel e credenciais do servico.

## Keystore e responsabilidade do dono

A ferramenta usa a keystore. Ela nao consegue recuperar uma keystore perdida.

---

# Como contribuir sem quebrar o cerebro

## Se for adicionar funcao interpretada

Pense no fluxo completo:

```text
nome publico PT-BR
nome publico ingles
normalizacao JS
action Cordova
implementacao Java
permissao manifest/runtime, se precisar
retorno JSON consistente
runtime console, se fizer sentido
aba de codigos interpretados
laboratorio de funcoes
teste JS/Java
documentacao
```

Funcao nova que so existe no botao nao existe de verdade.

## Se for mexer em arquivo

Preserve:

- validacao de caminho;
- sanitizacao de nome;
- FileProvider para compartilhar;
- metadados;
- retorno bilingue quando ja houver padrao.

## Se for mexer em permissao

Observe:

- callback pendente;
- busy state;
- request code;
- Android antigo vs Android novo;
- caso "negou e nao mostra mais dialog";
- configuracao especial quando nao e runtime permission normal.

## Se for mexer em build

Preserve:

- projeto temporario;
- logs;
- limpeza segura;
- debug mantendo temporario;
- artifact finder;
- compatibilidade APK/AAB.

## Se for mexer na UI

Preserve:

- renderer sem Node direto;
- preload como fronteira;
- validacoes do editor;
- feedback de erro claro;
- logs visiveis;
- fluxo USB com mensagens humanas.

---

# Glossario com cerebro, nao com dicionario frio

## Cordova

Motor que embala uma WebView como app Android e permite plugin nativo.

## WebView

O navegador embutido onde o HTML/CSS/JS do usuario roda.

## Bridge

Ponte entre JavaScript e Java Android.

## Action

Nome da operacao enviada pelo JavaScript para o Java, como `downloadFile` ou `setWallpaper`.

## CallbackContext

Canal que o Java usa para devolver sucesso ou erro para a Promise JavaScript.

## Manifest

Documento Android que declara permissoes, componentes e intents.

## Runtime permission

Permissao pedida enquanto o app esta rodando.

## FileProvider

Mecanismo Android para compartilhar arquivo por URI segura.

## ADB

Ferramenta de comunicacao com aparelho Android via USB.

## APK

Arquivo instalavel diretamente no Android.

## AAB

Formato de bundle usado para distribuicao em loja.

## Keystore

Chave de assinatura do app.

---

# Fechamento

O html2apk nao tenta esconder que Android e complexo. Ele organiza a complexidade em camadas.

Por cima, o usuario ve:

```js
await notificar("Oi");
```

Por baixo, acontece:

```text
normalizacao
espera do Cordova
exec nativo
permissao
canal de notificacao
PendingIntent
evento de clique
retorno para Promise
log no console runtime
```

Esse é o papel da ferramenta: permitir que o usuário trabalhe em HTML, CSS e JS, enquanto uma ponte nativa oferece recursos Android reais.

Criacao, direcao e propriedade: **Caio Multiversando**.

O html2apk organiza o caminho entre uma pasta web e um app Android instalável, mantendo o processo documentado, reproduzível e depurável.
