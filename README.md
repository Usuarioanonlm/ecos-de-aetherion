# Ecos de Aetherion — Crônica da Ruptura

**Ecos de Aetherion** é um RPG 2D de fantasia em visão superior. O projeto transforma o conceito narrativo fornecido em uma base jogável: o jogador cria um eco, explora a Floresta Primordial, combate criaturas, faz escolhas de facção e desenvolve a Vila de Musgo.

> “A Ruptura deixou cicatrizes. Você decide o que nasce delas.”

## Sistemas implementados

| Pilar | O que está no jogo |
| --- | --- |
| Criação de personagem | Nove raças, seis classes, origens compatíveis, nome, atributos e talento racial. |
| Exploração | Mapa 2D em tiles com caminhos, árvores, água, recursos, NPCs, vila, portal e colisões. |
| Combate | Ataque, técnica de classe, esquiva curta com invulnerabilidade, foco de Éter, dano, cura, criaturas hostis e Guardião da Raiz. |
| Progressão | Níveis, experiência, essência, evolução racial, itens e poções. |
| Narrativa | NPCs, diálogos ramificados, reputação de facções, origem pessoal, missões e caminhos de final. |
| Mundo | Oito regiões, sete Dragões Primordiais, primeira dungeon e codex. |
| Civilização | Construções, recursos, efeitos de vila e renderização das estruturas na Vila de Musgo. |
| Persistência | Até cinco personagens por conta; cada slot preserva perfil, progresso, áudio e controles separadamente no navegador e no banco online ao trocar de personagem ou sair. |

## Controles

| Tecla | Ação |
| --- | --- |
| `WASD` | Mover no mundo 2D. |
| `Espaço` | Ataque normal. |
| `R` | Técnica da classe, consumindo foco de Éter. |
| `Shift` | Esquiva curta na direção atual, com uma breve proteção. |
| `F` | Absorver essência ou coletar recursos próximos. |
| `H` | Consumir poção de musgo. |
| `E` | Conversar com NPCs ou entrar na fissura de dungeon. |
| `Tab` | Abrir ou fechar o menu de configurações. |
| `C`, `I`, `M`, `Q`, `B`, `J` | Abrir personagem, bolsa, mapa, crônicas, vila e codex. |

O botão **Teclas** abre o painel de remapeamento. Cada Eco pode definir, sem repetir teclas, movimento, ataque, habilidade, inventário, mapa, interação, esquiva e abertura de menu; as preferências acompanham o personagem. **Restaurar controles padrão** retorna ao esquema exibido acima. No celular, os botões de direção, ataque, Éter, interação e esquiva acionam as mesmas ações configuráveis.

O **minimapa** no canto superior direito é clicável. Ao tocar nele, o jogador abre o **Mapa de Aetherion** ampliado, com os biomas, vilas, cidades, capitais, dungeons, rotas, região atual e progresso daquele Eco. Marcadores dourados indicam a posição atual; rotas seladas são liberadas à medida que os portais e estradas físicas são explorados.

No atlas ampliado, os botões **+** e **−** ajustam o zoom de leitura. Toque em uma região para focalizá-la e consultar seus assentamentos, dungeons e pontos de interesse. Quando um destino físico já estiver desbloqueado, o botão **Viajar para** leva o Eco diretamente para lá. A região atual recebe um marcador de **missão ativa**, e os pontos de interesse usam o símbolo `✧`.

## Conta e personagens

Após entrar com e-mail e senha, o jogador chega ao **Arquivo de Ecos**. A tela apresenta cinco slots fixos: slots ocupados permitem continuar o respectivo personagem e slots vazios abrem a criação de um novo eco. O banco limita cada conta aos índices de `1` a `5` e aplica uma regra de acesso que permite ao usuário ler e alterar somente os seus próprios personagens.

Use **Trocar Eco** durante a partida para voltar ao arquivo sem apagar o personagem atual. Use **Sair** para encerrar a sessão: o mundo ativo é salvo antes do logout e continua disponível no próximo acesso à conta.

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

## Publicação

O endereço de compartilhamento principal é **[ecos-de-aetherion-rpg.netlify.app](https://ecos-de-aetherion-rpg.netlify.app/)**. A Netlify recebe a distribuição estática gerada em `dist/public`, enquanto o repositório público no GitHub preserva o código-fonte e o histórico de alterações.

O workflow de GitHub Pages continua no repositório como alternativa técnica, mas não é o canal recomendado enquanto sua propagação não estiver confiável.

## Próxima expansão

O código organiza o conteúdo do mundo em `client/src/game/content.ts`, permitindo ampliar raças, classes, regiões, dungeons, construções, missões e rotas de final sem reescrever o núcleo de interface. A próxima etapa recomendada é expandir as regiões bloqueadas em áreas 2D próprias e dar sprites dedicados a cada raça e criatura.
