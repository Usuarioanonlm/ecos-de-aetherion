# Ecos de Aetherion — Prólogo da Ruptura

**Ecos de Aetherion** é um RPG 2D de fantasia em visão superior, baseado no conceito fornecido para o continente de Aetherion. Esta primeira versão jogável acompanha o despertar de um Slime do Éter na Floresta Primordial: ele deve derrotar os lobos que ameaçam a clareira, absorver suas essências e alcançar a Vila de Musgo.

> “A Ruptura deixou cicatrizes. Você decide o que nasce delas.”

## O que já está jogável

| Sistema | Implementação no prólogo |
| --- | --- |
| Exploração | Movimento livre pela clareira com WASD ou setas. |
| Combate | Golpe de Éter de curta distância contra três Lobos Primordiais. |
| Evolução | Coleta de essência e desbloqueio do traço **Instinto Lupino**. |
| Missão | A progressão vai de expulsar os lobos até proteger a Vila de Musgo. |
| Demonstração | O endereço com `?demo` executa uma sequência determinística para mostrar a jornada completa. |

## Controles

| Tecla | Ação |
| --- | --- |
| `WASD` ou setas | Mover o Slime do Éter. |
| `Espaço` | Usar o golpe de Éter. |
| `F` | Absorver uma essência próxima. |

## Desenvolvimento local

O projeto usa React, Vite e Babylon.js. Instale as dependências e execute o ambiente local:

```bash
pnpm install
pnpm dev
```

Para verificar tipagem e gerar o build estático:

```bash
pnpm check
pnpm build
```

## GitHub Pages

O arquivo `.github/workflows/deploy-pages.yml` publica automaticamente o conteúdo de `dist/public` quando alterações chegam ao branch `main`. Depois do primeiro envio, em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação, caso o GitHub não o faça automaticamente.

O build usa caminhos relativos (`base: "./"`), portanto funciona em um repositório de projeto sem exigir domínio próprio.

## Próximos capítulos recomendados

O documento de conceito prevê a evolução para raças jogáveis, classes, facções, dungeons e construção de civilização. A próxima iteração pode ampliar o protótipo com o encontro da Vila de Musgo, uma escolha entre humanos e monstros, inventário e a primeira tela de evolução.

## Crédito de arte e conceito

A narrativa de Aetherion foi adaptada do documento de conceito fornecido para este projeto. Os recursos visuais utilizados no prólogo foram gerados especificamente para sua direção de arte **Cartografia Viva**.
