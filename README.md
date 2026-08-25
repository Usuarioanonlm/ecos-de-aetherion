# Ecos de Aetherion — Crônica da Ruptura

**Ecos de Aetherion** é um RPG 2D de fantasia em visão superior. O projeto transforma o conceito narrativo fornecido em uma base jogável: o jogador cria um eco, explora a Floresta Primordial, combate criaturas, faz escolhas de facção e desenvolve a Vila de Musgo.

> “A Ruptura deixou cicatrizes. Você decide o que nasce delas.”

## Sistemas implementados

| Pilar | O que está no jogo |
| --- | --- |
| Criação de personagem | Nove raças, seis classes, origens compatíveis, nome, atributos e talento racial. |
| Exploração | Mapa 2D em tiles com caminhos, árvores, água, recursos, NPCs, vila, portal e colisões. |
| Combate | Ataque, técnica de classe, foco de Éter, dano, cura, criaturas hostis e Guardião da Raiz. |
| Progressão | Níveis, experiência, essência, evolução racial, itens e poções. |
| Narrativa | NPCs, diálogos ramificados, reputação de facções, origem pessoal, missões e caminhos de final. |
| Mundo | Oito regiões, sete Dragões Primordiais, primeira dungeon e codex. |
| Civilização | Construções, recursos, efeitos de vila e renderização das estruturas na Vila de Musgo. |
| Persistência | Personagem e progresso local salvos no navegador. |

## Controles

| Tecla | Ação |
| --- | --- |
| `WASD` ou setas | Mover no mundo 2D. |
| `Espaço` | Ataque normal. |
| `R` | Técnica da classe, consumindo foco de Éter. |
| `F` | Absorver essência ou coletar recursos próximos. |
| `H` | Consumir poção de musgo. |
| `E` | Conversar com NPCs ou entrar na fissura de dungeon. |
| `C`, `I`, `M`, `Q`, `B`, `J` | Abrir personagem, bolsa, mapa, crônicas, vila e codex. |

## Desenvolvimento local

O projeto usa React e Vite para distribuir um RPG 2D estático, compatível com GitHub Pages.

```bash
pnpm install
pnpm dev
```

Para validar o código e gerar a distribuição estática:

```bash
pnpm check
pnpm build
```

Durante desenvolvimento, `/?world` abre o mapa 2D diretamente. O fluxo normal sempre inicia na criação de personagem.

## GitHub Pages

O workflow em `.github/workflows/deploy-pages.yml` cria o build e publica `dist/public` depois de cada envio para `main`. Para ativar a primeira publicação, abra **Settings → Pages** no repositório e selecione **GitHub Actions** como fonte de publicação.

O build usa caminhos relativos e é adequado a uma página hospedada dentro do próprio repositório.

## Próxima expansão

O código organiza o conteúdo do mundo em `client/src/game/content.ts`, permitindo ampliar raças, classes, regiões, dungeons, construções, missões e rotas de final sem reescrever o núcleo de interface. A próxima etapa recomendada é expandir as regiões bloqueadas em áreas 2D próprias e dar sprites dedicados a cada raça e criatura.
