# Sépia

Biblioteca e leitor pessoal: um rastreador de leitura offline, com recompensas gentis,
sincronização pelo Google Drive e uma experiência de leitura que cuida dos olhos.

Feito com [Tauri 2](https://tauri.app) + React + TypeScript. Roda no Android (foco principal)
e no desktop.

## Desenvolvimento

```bash
npm install
npm run dev          # interface no navegador (http://localhost:1420)
npm run tauri dev    # app desktop
npm run tauri android dev   # app no Android (precisa do Android SDK/NDK)
```

## Estrutura

| Pasta | O que tem |
|---|---|
| `src/styles` | Tokens de design (cores, tipografia, espaçamento) e os temas Papel, Sépia e Noite |
| `src/components` | Componentes base: navegação, folhas, botões, ícones |
| `src/screens` | Telas principais: Hoje, Biblioteca, Conquistas, Ajustes |
| `src/features/updates` | Verificação e instalação de atualizações |
| `src/features/novidades` | Changelog exibido dentro do app |
| `src-tauri` | Lado nativo (Rust) e o projeto Android em `gen/android` |

## Publicando uma versão

1. Atualize `version` no `package.json` (o app lê a versão de lá).
2. Adicione uma entrada no topo de `src/features/novidades/changelog.ts`.
3. Crie e envie a tag: `git tag v0.2.0 && git push origin v0.2.0`.

O workflow **Release** compila Android, Windows, macOS e Linux e publica tudo numa
release do GitHub. Os apps instalados encontram a versão nova sozinhos.

### Secrets necessários (Settings → Secrets and variables → Actions)

| Secret | Para quê |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Assina as atualizações do desktop |
| `ANDROID_KEYSTORE_BASE64` | Keystore de release do Android, em base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Senha do keystore |

> Guarde essas chaves com cuidado. Sem a mesma chave, o Android não aceita instalar a
> atualização por cima da versão anterior.

## Roadmap

- [x] **Fase 0**: fundação, identidade visual, temas, atualizações automáticas
- [ ] **Fase 1**: biblioteca (EPUBs, livros físicos, histórico de leituras)
- [ ] **Fase 2**: leitor (foliate-js, temas de papel, fontes, animações)
- [ ] **Fase 3**: sincronização pelo Google Drive
- [ ] **Fase 4**: recompensas, estatísticas e lembretes
- [ ] **Fase 5**: importação (Goodreads, StoryGraph, planilha, destaques do Kindle)
