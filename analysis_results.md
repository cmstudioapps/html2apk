# Por que as APIs nativas do html2apk não funcionam no modo URL

## Resumo

Encontrei **a causa raiz real** do problema. Não é CORS, não é CSP, não é timing genérico. É um problema concreto e específico no fluxo de inicialização da ponte Cordova.

---

## A Causa Raiz: `gap_init` é bloqueado pelo Cordova

### O que acontece passo a passo

Quando o `Web2ApkInjector.java` injeta `cordova.js` na página remota via `evaluateJavascript`, o `cordova.js` executa normalmente. Porém, durante o **bootstrap**, ele chama:

```java
// cordova.js linha 1006-1009
androidExec.init = function () {
    bridgeSecret = +prompt('', 'gap_init:' + nativeToJsBridgeMode);
    channel.onNativeReady.fire();
};
```

Esse `prompt()` é interceptado pelo Java em [CordovaBridge.java](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/CordovaLib/src/org/apache/cordova/CordovaBridge.java#L169-L182):

```java
// CordovaBridge.java linha 169-182
else if (defaultValue != null && defaultValue.startsWith("gap_init:")) {
    if (pluginManager.shouldAllowBridgeAccess(origin)) {  // <-- AQUI
        int bridgeMode = Integer.parseInt(defaultValue.substring(9));
        jsMessageQueue.setBridgeMode(bridgeMode);
        int secret = generateBridgeSecret();
        return ""+secret;
    } else {
        LOG.e(LOG_TAG, "gap_init called from restricted origin: " + origin);
    }
    return "";
}
```

O método `shouldAllowBridgeAccess` chama [PluginManager.java](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/CordovaLib/src/org/apache/cordova/PluginManager.java#L465-L480):

```java
// PluginManager.java linha 465-479
public boolean shouldAllowBridgeAccess(String url) {
    // Primeiro pergunta a cada plugin...
    for (PluginEntry entry : this.entryMap.values()) {
        CordovaPlugin plugin = pluginMap.get(entry.service);
        if (plugin != null) {
            Boolean result = plugin.shouldAllowBridgeAccess(url);
            if (result != null) {
                return result;
            }
        }
    }
    // Nenhum plugin respondeu, aplica a política padrão:
    return url.startsWith(getLaunchUrlPrefix());
}
```

E `getLaunchUrlPrefix()` retorna `"https://localhost/"` ([PluginManager.java](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/CordovaLib/src/org/apache/cordova/PluginManager.java#L383-L391)):

```java
private String getLaunchUrlPrefix() {
    String scheme = app.getPreferences().getString("scheme", SCHEME_HTTPS).toLowerCase();
    String hostname = app.getPreferences().getString("hostname", DEFAULT_HOSTNAME).toLowerCase();
    return scheme + "://" + hostname + '/';
}
```

> [!CAUTION]
> **Aqui está o problema:** quando a página está em `https://meusite.com`, a `origin` passada para `shouldAllowBridgeAccess()` é `"https://meusite.com"`. Isso **NÃO** começa com `"https://localhost/"`, então o método retorna `false`.
>
> O `gap_init` é **silenciosamente rejeitado**. O `prompt()` retorna string vazia `""`. O `bridgeSecret` fica como `NaN` (pois `+""` = `NaN` mas na verdade `+""` = `0`, vamos ver...). Na verdade `+""` retorna `0`, não `-1`, então o `bridgeSecret` fica como `0`.

### A Cadeia de Falhas

1. **`gap_init` retorna `""`** → `bridgeSecret = +""` → `bridgeSecret = 0`
2. Do lado Java, `expectedBridgeSecret` continua `-1` (nunca foi setado via `generateBridgeSecret()`)
3. Quando qualquer `exec()` tenta rodar (ex: `Html2Apk.toast()`), ele envia o `bridgeSecret = 0` para o Java
4. O Java compara `0 !== -1` em `verifySecret()` e **rejeita a chamada** com o log `"Bridge access attempt with wrong secret token"`
5. A ponte é desabilitada permanentemente: `clearBridgeSecret()` é chamado

### Por que nenhum plugin sobrescreve isso?

O [Web2ApkInjector.java](file:///home/caio/Documentos/html2apk/src/templates/cordova-plugin-html2apk-bridge/src/android/Web2ApkInjector.java) e o [Html2ApkBridge.java](file:///home/caio/Documentos/html2apk/src/templates/cordova-plugin-html2apk-bridge/src/android/Html2ApkBridge.java) **não sobrescrevem** o método `shouldAllowBridgeAccess()`. Nenhum plugin no projeto faz isso. Então a decisão cai para a política padrão do Cordova, que só permite `https://localhost/`.

---

## Segundo Problema: `findCordovaPath()` retorna `null`

Mesmo que o `gap_init` fosse aceito, há um segundo problema. O plugin loader do `cordova.js` precisa carregar o `cordova_plugins.js` e os JS dos plugins. Ele faz isso via [findCordovaPath()](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/app/src/main/assets/www/cordova.js#L1794-L1806):

```javascript
function findCordovaPath () {
    var path = null;
    var scripts = document.getElementsByTagName('script');
    var term = '/cordova.js';
    for (var n = scripts.length - 1; n > -1; n--) {
        var src = scripts[n].src.replace(/\?.*$/, '');
        if (src.indexOf(term) === (src.length - term.length)) {
            path = src.substring(0, src.length - term.length) + '/';
            break;
        }
    }
    return path;
}
```

Quando o `cordova.js` é injetado pelo `Web2ApkInjector` via `evaluateJavascript`, ele cria uma tag `<script src="https://localhost/cordova.js">`. Essa função encontra essa tag e calcula `pathPrefix = "https://localhost/"`.

Depois tenta carregar: `"https://localhost/cordova_plugins.js"` e `"https://localhost/plugins/cordova-plugin-html2apk-bridge/www/html2apk-bridge.js"`.

**Esses arquivos existem** nos assets (`www/`) e o Cordova os serve via `https://localhost/`, então esse passo em si funciona. Porém, o script `html2apk-bridge.js` do plugin declara:

```javascript
var exec = require("cordova/exec");
```

E quando ele tenta fazer `exec()`, ele usa o `bridgeSecret` que ficou inválido (problema #1), então **toda chamada exec() falha silenciosamente**.

---

## A Solução

O `Web2ApkInjector.java` precisa sobrescrever `shouldAllowBridgeAccess()` para permitir que origens remotas (o site do usuário) possam usar a ponte nativa:

```java
@Override
public Boolean shouldAllowBridgeAccess(String url) {
    boolean isWeb2Apk = preferences.getBoolean("html2apkisweb2apk", false);
    if (isWeb2Apk) {
        return true;
    }
    return null; // delega para a política padrão
}
```

Isso faz com que quando o `cordova.js` executar `prompt('', 'gap_init:...')` a partir de `https://meusite.com`, o Cordova aceite a inicialização, gere o `bridgeSecret` correto, e toda a cadeia de `exec()` funcione normalmente.

> [!NOTE]
> Essa é uma mudança de **1 método** em **1 arquivo**. A solução é cirúrgica e resolve o problema na raiz sem efeitos colaterais, pois a verificação `isWeb2Apk` já garante que só se aplica a builds no modo URL.

---

## Verificação dos Arquivos Envolvidos

| Arquivo | Papel |
|---|---|
| [Web2ApkInjector.java](file:///home/caio/Documentos/html2apk/src/templates/cordova-plugin-html2apk-bridge/src/android/Web2ApkInjector.java) | Injeta cordova.js na página remota — **falta `shouldAllowBridgeAccess`** |
| [CordovaBridge.java](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/CordovaLib/src/org/apache/cordova/CordovaBridge.java#L169) | Valida `gap_init` — rejeita origens que não são `https://localhost/` |
| [PluginManager.java](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/CordovaLib/src/org/apache/cordova/PluginManager.java#L465) | Política padrão: `url.startsWith(getLaunchUrlPrefix())` |
| [cordova.js L1006](file:///tmp/html2apk-kPMrJi/cordova-project/platforms/android/app/src/main/assets/www/cordova.js#L1006) | `exec.init()` — chama `prompt('', 'gap_init:...')` para obter o `bridgeSecret` |
