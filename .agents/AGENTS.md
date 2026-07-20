
## Regra de Arquitetura (Java)
Como `Html2ApkBridge.java` possui mais de 9000 linhas, **TODAS AS NOVAS FUNCIONALIDADES E SENSORES** devem ser implementadas em **classes Java separadas** (ex: `FuncionalidadeManager.java`). A `Html2ApkBridge.java` deve apenas instanciar e delegar as chamadas para essas novas classes, mantendo a arquitetura limpa e reduzindo o risco de quebrar o arquivo principal.
