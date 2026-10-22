# Distribuição multiplataforma — situação na v0.1

| Plataforma | Situação |
|---|---|
| Web | Build de produção (`npm run build`) testado em Chromium (desktop e emulação de celular). `base: './'` permite servir de qualquer subcaminho ou de arquivo local empacotado. |
| Android (Capacitor) | **Não configurado nem compilado.** O ambiente de desenvolvimento não tem Android SDK. |
| Desktop (Tauri) | **Não configurado nem compilado.** O ambiente não tem toolchain Rust/Tauri. |

Nada aqui deve ser lido como "pronto para loja".

## Por que a arquitetura já serve às duas

- O motor é TypeScript puro, sem DOM nem rede.
- A persistência usa IndexedDB, disponível nas WebViews do Android e do Tauri, com fallback em memória.
- Não há chamadas de rede no jogo. As fontes do Google têm fallback de sistema e devem ser embutidas no pacote nativo.

## Passos previstos (v0.3)

Android:
1. `npm i @capacitor/core @capacitor/cli @capacitor/android`
2. `npx cap init "Simulador do Governo" br.<dominio>.simgov --web-dir dist`
3. `npm run build && npx cap add android && npx cap sync`
4. Ícones, `versionCode`/`versionName` a partir do `package.json`, sem permissões além do padrão.
5. Compilar e testar em emulador e aparelho intermediário.

Desktop:
1. `npm i -D @tauri-apps/cli` e `npx tauri init` (frontendDist `../dist`).
2. Identificador, ícones e versão; sem APIs nativas além de janela.
3. Gerar instaladores por SO e testar.
