# Estrutura Técnica — Ecos de Aetherion

## Princípio de camadas

> **React é a moldura; Babylon é a tela; os módulos em TypeScript são o jogo.**

O projeto será uma aplicação estática React/Vite. O componente `GameCanvas` inicializa e descarta o motor de jogo uma única vez, posiciona o canvas em tela cheia e hospeda a interface contextual. Toda a regra de jogo fica em `client/src/game/`, sem dependência de JSX ou estado React.

## Módulos planejados

| Módulo | Responsabilidade | Limites principais |
| --- | --- | --- |
| `scene.ts` | Criar a cena, a câmera ortográfica e o `GameHandle` | Exporta somente a inicialização e a limpeza do jogo. |
| `GameWorld.ts` | Coordenar entidades, colisões, missão, vitória/derrota e loop | É proprietário da criação e descarte dos nós visuais. |
| `Player.ts` | Movimento, vitalidade, ataque, essência e Absorção do slime | Não decide a interface nem manipula componentes React. |
| `Enemy.ts` | Vida, perseguição, alcance de dano e conversão em essência | É uma entidade pequena com máquina de estados explícita. |
| `InputManager.ts` | Converter teclado/toque em ações semânticas | Expõe mover, atacar e absorver; remove listeners no descarte. |
| `HudState.ts` | Definir o snapshot serializável usado pela moldura React | Recebe eventos do mundo, sem executar lógica de combate. |
| `AutoPilot.ts` | Dirigir o jogo somente quando `?demo` estiver ativo | Usa as mesmas ações semânticas do jogador. |
| `config.ts` | Dados estáveis de missão, limites e balanceamento | Centraliza números para futura expansão de conteúdo. |
| `assetUrls.ts` | URLs permanentes dos recursos gerados | Mantém os recursos de cena fora do projeto e oferece caminho relativo na exportação. |

## Ciclo de estado

1. O `InputManager` produz intenções: `move`, `attack` e `absorb`.
2. O `Player` resolve deslocamento e pede ao `GameWorld` alvos ou essência em alcance.
3. `Enemy` atualiza perseguição e ataque; ao ser derrotado, notifica o mundo e deixa essência.
4. O `GameWorld` atualiza missão, efeitos visuais e emite um `HudSnapshot` para a moldura.
5. O `GameCanvas` renderiza dados de interface, mas nunca altera uma regra de jogo por conta própria.

## Convenções de apresentação

Os elementos de cenário usarão uma profundidade fixa no plano de fundo. Personagens e essências receberão profundidade conforme a coordenada vertical para evitar que um personagem pareça atravessar outro. O cursor de objetivo e os efeitos de Éter ficam acima das entidades, enquanto a HUD fica acima do canvas em HTML para manter acessibilidade e nitidez.

## Dicas de ativos

| Ativo | Uso técnico | Escala/posição |
| --- | --- | --- |
| Clareira Primordial | Plano de fundo ilustrado com a mesma proporção da janela | Cobrir a câmera ortográfica 16:9. |
| Slime de Éter | Marcador circular jade com fissura de Éter, sobre a ilustração | 1,2 unidades de largura; centro da clareira. |
| Lobo Primordial | Marcador hexagonal carvão com olho de ouro, sobre a ilustração | 1,45 unidades de largura; rota superior e oriental. |
| Emblema | `<img>` da HUD e favicon | 44 px na interface, 32 px no ícone. |

## Compatibilidade com GitHub Pages

O projeto não terá chamadas a servidor, rotas obrigatórias nem segredos. O build Vite usará caminhos relativos para que a pasta `dist/public` possa ser publicada diretamente por uma ação do GitHub Pages ou pelo branch `gh-pages`.
