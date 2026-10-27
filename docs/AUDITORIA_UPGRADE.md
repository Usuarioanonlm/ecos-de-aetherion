# Auditoria consolidada do RPG — Ecos de Aetherion

**Data:** 27/10/2026  
**Projeto auditado:** `/home/ubuntu/ecos-de-aetherion`  
**Escopo:** arquitetura e responsabilidades do runtime ativo, combate, inimigos, quests/campanha, inventário, HUD/UI, mundo/renderização e persistência.  
**Restrições:** esta consolidação não fez pesquisa web, não usou browser e não modificou código-fonte, login, backend, Supabase, Netlify ou contratos existentes. Foram consolidados os relatórios `audit/combat.md`, `audit/quests.md`, `audit/render.md`, `audit/ui.md` e `audit/persistence.md`.

## 1. Resumo executivo

Ecos de Aetherion já possui uma base jogável e compilável. O caminho publicado é React 19 + Vite + TypeScript, com um mundo Canvas2D e uma camada React de HUD, menus, diálogos, serviços, atlas e controles touch. A composição ativa é `App.tsx` → `GameCanvas.tsx` → `RpgGame.tsx` → `RpgWorldCanvas.tsx`. O último componente é o ponto em que praticamente tudo converge: estado do mundo, hidratação e persistência local, input, loop `requestAnimationFrame`, movimento, colisão, combate, IA, progressão, áudio, renderização, HUD e janelas.

O baseline técnico é saudável para um protótipo: `pnpm check`, `pnpm test` e `pnpm build` passaram nos relatórios de domínio. O teste existente cobre apenas normalização de coordenadas de `AreaMapOverlay`; não há cobertura automatizada para dano, cooldowns, colisão, IA, spawn/respawn, quests, recompensas, inventário, XP, migração ou round-trip de save. O build emite o aviso de chunk JavaScript acima de 500 kB, aproximadamente 565 kB minificado antes de gzip.

O problema central não é a falta de um engine novo nem a necessidade de recriar o jogo. O problema é a existência de contratos paralelos e responsabilidades misturadas. O Canvas2D ativo contém regras inline e simplificadas; `GameWorld.ts`, `Enemy.ts`, `Player.ts`, `InputManager.ts` e `scene.ts` formam um motor BabylonJS legado concorrente que não participa do caminho publicado. Ao mesmo tempo, `aetherionAtlas.ts`, `worldContent.ts`, `campaign.ts` e `campaignState.ts` descrevem um mundo, mobs, campanha e finais mais ricos do que aqueles efetivamente usados pelo runtime.

A direção recomendada é incremental: declarar `RpgWorldCanvas` como runtime canônico sem reescrever o jogo; preservar o login, o `slotId`, a chave `aetherion-world-v2:${slotId}`, a coluna remota e o fluxo Supabase; extrair funções puras e serviços pequenos; adicionar migração client-side compatível; trocar mutações dispersas por eventos e reducers; alimentar inimigos e regiões a partir de definições data-driven; e extrair a apresentação sem mover prematuramente o dono do estado. Nenhuma fase deve apagar conteúdo, resetar saves ou criar um segundo runtime.

## 2. Decisão arquitetural de referência

### 2.1 Runtime canônico

O runtime canônico do upgrade deve ser o fluxo Canvas2D:

```text
App.tsx
  └─ GameCanvas.tsx
      └─ RpgGame.tsx
          ├─ seleção/criação de personagem e slots
          └─ RpgWorldCanvas.tsx
              ├─ WorldState em stateRef
              ├─ loop de simulação e render Canvas2D
              ├─ HUD, menus, diálogos, serviços e atlas em React
              └─ localStorage por slot + espelho remoto via RpgGame/Supabase
```

O caminho Babylon (`game/scene.ts` → `GameWorld.ts` → `Player.ts`/`Enemy.ts`/`InputManager.ts`) deve permanecer isolado e documentado como legado durante esta evolução. Ele não deve receber novas regras de combate, quests, inventário ou persistência. Não é necessário removê-lo nesta auditoria; é necessário impedir que uma melhoria seja implementada somente nele e pareça ter sido integrada ao jogo publicado.

Essa decisão elimina a ambiguidade sem exigir uma migração de tecnologia. React, Vite, Canvas2D, Supabase, Netlify, mapas, conteúdo visual e identidade do jogo permanecem. O objetivo é criar fronteiras melhores ao redor do que já funciona.

### 2.2 Mapa de sistemas

| Camada | Arquivos/pontos | Responsabilidade atual | Direção segura |
|---|---|---|---|
| Entrada | `client/src/App.tsx:5-13`, `client/src/components/GameCanvas.tsx:12-18` | Monta o jogo e o modo `?qa-map=1`. | Preservar; usar o modo QA para regressões do runtime canônico. |
| Perfil e slots | `client/src/components/RpgGame.tsx:11-35,77-114` | Seleção/criação, `CharacterProfile`, `slotId`, leitura/upsert de `character_slots`, callbacks de logout/troca. | Não alterar login nem a identidade dos slots; manter Supabase fora do loop de simulação. |
| Orquestração de mundo | `client/src/components/RpgWorldCanvas.tsx:212-295` | Owner atual de estado, listeners, loop, persistência, canvas e quase toda a UI. | Manter inicialmente como owner; extrair serviços puros e componentes de apresentação por etapas. |
| Estado jogável | `RpgWorldCanvas.tsx:18,88-93,213-221` | `WorldState`, jogador, inimigos, essências, recursos, regiões, baús, side quest, áudio, controles e reputação. | Tipar e separar progresso durável de estado transitório sem trocar o formato de modo abrupto. |
| Conteúdo regional | `client/src/game/worldContent.ts:5-60` | Regiões, biomas, settlements, NPCs, serviços, baús e arquétipos simplificados. | Tornar a fonte operacional de `RegionDefinition`, layout e spawn; validar atlas contra ela. |
| Catálogo do atlas | `client/src/game/aetherionAtlas.ts:15-74` | Biomas, settlements, dungeons, POIs, 25 mobs, bosses, habitats e tiers. | Reutilizar definições no runtime gradualmente; não prometer mobs sem spawn/renderer compatível. |
| Campanha | `client/src/game/campaign.ts:5-23`, `campaignState.ts:3-10` | Modelo declarativo de quests, escolhas e finais, hoje órfão do gameplay. | Integrar em um `campaign` dentro de `WorldState` após contrato e migração. |
| Combate/IA | Inline em `RpgWorldCanvas.tsx:236-252` | Ataque em área, skill, contato, perseguição direta, morte, XP e essência. | Extrair resolução de dano, cooldowns, colisão, IA/spawn e eventos puros. |
| Render | `RpgWorldCanvas.tsx:95-188,253-262` | Terreno procedural genérico, props fixas, sprites únicos, efeitos e ordenação Y. | Criar renderer puro, layouts por região, registry de assets e cache estático. |
| UI/HUD | `RpgWorldCanvas.tsx:190-210,281-295`, `index.css:53-79` | HUD, topbar, menus, diálogo, serviços, atlas, touch e mapa local. | Extrair componentes de apresentação; manter handlers e estado no owner inicialmente. |
| Persistência | `RpgWorldCanvas.tsx:88-93,229,252-270`; `RpgGame.tsx:95-111` | `localStorage` periódico e sincronização remota em troca/logout. | Codec/adaptador versionado, dirty flag, validação, migração compatível e flush seguro. |
| Legado | `game/GameWorld.ts`, `Enemy.ts`, `Player.ts`, `InputManager.ts`, `scene.ts` | Outro mundo, input, combate, quest e renderer Babylon. | Isolar, documentar e não duplicar features novas. |

### 2.3 Fluxos efetivos

**Inicialização e hidratação.** `RpgGame` recebe ou cria um perfil e um `slotId`; `RpgWorldCanvas` monta um `freshWorld`, lê `aetherion-world-v2:${slotId}`, faz uma hidratação com merge raso e reconstrói `Set` para `gathered` e `openedChests`. O payload inclui `profile` como assinatura textual, embora o `slotId` já seja a identidade mais estável.

**Simulação.** O `useEffect` registra input e áudio e inicia `requestAnimationFrame`. Em cada callback, o jogo lê o conjunto de teclas, move o jogador, atualiza timers, processa inimigos, morte, essência, foco, XP, level up, HUD, checkpoint e desenho. O delta é limitado a `0.05`, mas não existe acumulador de fixed timestep. Menus, diálogos e serviços não pausam nem bloqueiam de forma consistente o update, o dano ou o touch.

**Input e apresentação.** O teclado ativo usa um `Set<string>` dentro de `RpgWorldCanvas`; o touch fabrica `KeyboardEvent` sintético. `InputManager.ts` pertence ao caminho legado e não é usado pelo Canvas2D. O HUD é emitido aproximadamente a cada 120 ms, enquanto o Canvas é desenhado por frame. O componente também decide diretamente os ramos de menu, diálogo, serviços, atlas, minimapa e controles.

**Persistência.** O mundo é serializado de forma síncrona aproximadamente a cada 1,5 s, mesmo sem alteração, e novamente em cleanup/troca/logout. A cópia para `character_slots.world` é feita pelo pai em momentos de troca/logout. Não há `schemaVersion`, revisão, validação formal, tratamento de `QuotaExceededError`, política de conflito ou flush próprio em `visibilitychange/pagehide`.

## 3. Baseline de responsabilidades

A tabela abaixo distingue o que o sistema realmente faz hoje do que os dados do projeto sugerem que deveria fazer. Essa diferença é a principal fonte de risco de produto.

| Domínio | Baseline real | Conteúdo/modelo paralelo | Responsabilidade futura mínima |
|---|---|---|---|
| Combate | Ataque básico acerta todos os inimigos vivos em raio `1.45`; skill em raio `2.7`; dano fixo; foco como MP; contato causa dano fixo. | Stats de raça/classe existem, mas defesa, crítico, dano mágico/físico, resistência e efeitos não são usados. | Uma função de dano única, cooldowns independentes, eventos de feedback e fórmulas pequenas derivadas dos stats atuais. |
| Inimigos | Cinco posições fixas, `wolf/boar/goblin` e um boss genérico; perseguição linear; sem respawn temporal. | Atlas lista 25 mobs, bosses, tiers e habitats. | `EnemyDefinition` data-driven, spawn points, estados de IA, leash, loot/XP/ouro e respawn reconstruído por definição. |
| Movimento | Jogador verifica tile arredondado para água/árvore; IA ignora obstáculos; esquiva desloca apenas eixo X e usa cooldown da skill. | Não há sistema compartilhado de ocupação ou física. | `canOccupy` com raio/sweep simples, movimento por eixo, obstáculos compartilhados e dodge independente. |
| Quests | Uma quest textual principal, uma side quest ativa e `advanceSideQuest` genérico para mortes/coletas. | `campaign.ts`/`campaignState.ts` descrevem cadeia, escolhas e finais não conectados. | Eventos tipados, reducer de objetivos, histórico, recompensas idempotentes e `CampaignState` persistido. |
| Diálogos | `dialogueChoices` usa `mira/thalion/nix`, mas NPCs gerados têm IDs derivados de região/settlement. | Escolhas deveriam alterar reputação/campanha/finais. | IDs declarativos reais, condições, `choiceId` persistido e efeitos explícitos. |
| Inventário | UI mostra poções, recursos, arma, manto e item de origem; somente poções e recursos têm efeito/estado parcial. | `startingItem`, `weapon` e `skills` são dados de criação/apresentação. | `ItemDefinition` e `InventoryState` mínimos; equipar/desequipar somente após existir mutação e persistência. |
| XP/nível | XP vem de mortes; limiar `level * 40`; level up aumenta `maxHealth`, processando um nível por vez. | Quests, baús e conteúdo deveriam recompensar XP e desbloqueios. | `grantXp` centralizado, múltiplos níveis, XP em recompensas e HUD real. |
| HUD | Vida, foco, nível, essência, recursos, missão textual e minimapa; estado inicial pode piscar valores hardcoded. | Crônicas e atlas exibem promessa de conteúdo mais amplo. | Snapshots derivados do estado canônico, quest rastreada, XP visível e indicador discreto de save pendente. |
| Mundo/render | Clareira genérica com paletas; prédios/portal fixos; sprites únicos, fallback geométrico e efeitos procedurais. | 11 biomas, settlements, dungeons, regiões finais e especificação de pixel art. | Layout mínimo por `mapKind`, registry de assets, animações por frames e cache de terreno/props. |
| Save | JSON ad hoc, merge raso, sem schema/migração/validação; timers transitórios serializados. | `CampaignState` serializável não está no save. | Envelope aditivo, migração client-side, estado persistível explícito, revisão e dirty flag, sem mudar a coluna remota. |
| UI/input | Menus continuam com jogo e touch potencialmente ativos; `AreaMapOverlay` é visualmente/funcionalmente paralelo ao atlas. | `useMobile` não é usado; CSS tem seletores órfãos e shell 16:9 rígido. | Política única de overlay, foco/Escape, input bloqueado, touch com captura/cancelamento e mapa com contrato único. |

## 4. Pontos exatos de integração por módulo

Esta é a fronteira recomendada para implementar o upgrade sem criar uma segunda aplicação. Os números são referências aos relatórios consolidados e ao código auditado; a primeira mudança deve ser pequena e testável em cada ponto.

### 4.1 Combat

O ponto de entrada atual está no loop de `RpgWorldCanvas.tsx`, especialmente nos handlers e no update em `:236-252`. O ataque básico é disparado em torno de `:239`, a habilidade em `:242`, o dano de contato/IA em `:250`, e morte, XP e essência passam por `:238-240`. A integração correta é substituir gradualmente a regra inline por funções puras que recebam comando, atacante, alvo, delta e definições, retornando resultados e eventos.

O primeiro contrato deve cobrir `Combatant`, `Cooldowns`, `DamageEvent`, `CombatResult` e `DeathEvent`. Ataque, skill e dodge precisam de relógios independentes; `focus` deve continuar sendo o nome do recurso equivalente a MP para não quebrar identidade nem saves. A resolução única deve incluir, inicialmente, dano físico/mágico, defesa, crítico, bloqueio, cura e invulnerabilidade com fórmulas simples. O desenho de texto, som, barra de HP e partículas deve consumir os eventos, não recalcular números.

O ataque básico deve ganhar facing/cone ou alvo explícito; skills podem continuar em área. Não se recomenda introduzir física pesada, árvore de habilidades extensa ou dezenas de status nesta etapa. O critério de integração é: uma ação do jogador gera um resultado determinístico e o owner apenas aplica o resultado ao `WorldState`, atualiza feedback e marca o save como dirty.

### 4.2 Enemies, IA, spawn e respawn

O spawn atual está em `RpgWorldCanvas.tsx:59-71`, usado por `freshWorld` em `:90`; são cinco posições fixas e um boss genérico. `worldContent.ts:33-34` reduz o conteúdo a três arquétipos e `aetherionAtlas.ts:64-67` possui o catálogo rico que ainda não chega à entidade runtime. O novo ponto de integração deve começar em `EnemyDefinition` e `SpawnPoint`, sem alterar imediatamente todos os desenhos.

Campos mínimos de uma definição são `id`, `kind`, `tier`, `maxHealth`, `attack`, `defense`, `speed`, `attackRange`, `aggroRange`, `leashRange`, `attackCooldown`, `behavior`, `xp`, `gold`, `loot` e `respawnSeconds`. O inimigo salvo não deve ser uma cópia completa de timers e animações; deve guardar identidade, estado de encontro e `defeatedAt`/`respawnAt`, sendo reconstruído a partir da definição.

A IA deve evoluir de perseguição direta para uma máquina pequena com `idle`, `chase`, `windup`, `attack`, `hurt`, `flee`, `return` e `dead`. Três comportamentos bastam inicialmente: agressivo, defensivo/bloqueio e ranged/mágico. O update de IA pode rodar em frequência menor, por exemplo 10–15 Hz, enquanto o render permanece no RAF. O limite ativo, o leash e a política de respawn devem ser definidos por região. O boss não pode depender de `kind: "wolf"`; deve ter definição própria.

### 4.3 Quests, campanha e eventos

O modelo atual está dividido entre `campaign.ts:5-23`, `campaignState.ts:3-10` e `WorldState` em `RpgWorldCanvas.tsx:88-93`. O ponto de integração correto é adicionar gradualmente um campo `campaign` no estado do mundo, e não construir um estado paralelo dentro do menu. O formato deve separar definição estática de progresso salvo.

As emissões devem ocorrer nos pontos já existentes: `:238` para `enemy_defeated`; `:240` para `essence_absorbed`/`item_collected`; `:244` para interação; `:235`/`:226` para viagem e região alcançada; `:266` para dungeon/boss; `:278` para baú; `:271` para escolha; e `:273` para reivindicação. Um reducer `dispatchQuestEvent(campaign, event)` deve filtrar por tipo, `targetId` e `regionId`, limitar progresso e retornar `objective_completed`, `quest_completed` e `reward_claimable`.

O atual `advanceSideQuest` não deve receber novos casos especiais; deve ser substituído por eventos tipados. Isso impede que matar inimigo complete uma missão de baú, que coletar minério conte como ameaça ou que o contador de lobos reinicie ao viajar. A cadeia de `campaign.ts` também precisa validar prerequisites, quests ativas e IDs de finais; referências como `hero-ending`, `monster-ending`, `god-ending` e `void-ending` não devem ser ativadas sem definição ou tratamento tipado.

### 4.4 Inventory e rewards

A UI de inventário em `RpgWorldCanvas.tsx:201` é atualmente uma projeção hardcoded; o estado real contém `potions`, recursos em `world.resources` e ouro, mas não possui itens, stacks ou slots. O ponto seguro é criar primeiro `ItemDefinition` e `InventoryState` em `client/src/game`, migrando de modo compatível poções, madeira, minério, comida, arma de classe e item de origem.

O contrato mínimo pode ter `items: Record<string, number>` e `equipped` para `weapon` e `armor`. A tela pode permanecer read-only durante a primeira extração. Equipar/desequipar só deve ser adicionado quando houver mutação, cálculo de stats derivados, persistência, feedback e testes. A migração não deve alterar o balanceamento amplo ao mesmo tempo em que introduz equipamentos.

Recompensas de inimigo, quest, baú, comércio e dungeon devem passar por uma única função `grantReward`/`applyReward`, chamada nas mutações existentes de `:238`, `:273` e `:278`. O resultado deve ser transacional dentro do `WorldState`: XP, ouro, recursos, itens, reputação e desbloqueios entram juntos; `claimedAt` ou `rewardTransactionId` impede pagamento duplicado.

### 4.5 HUD, menus e input

A camada visual está em `RpgWorldCanvas.tsx:190-210,281-295`; o estado mutável continua no owner. A extração segura é apresentar componentes como `RpgTopbar`, `PlayerHud`, `QuestHud`, `RpgActionBar`, `TouchControls`, `DialoguePanel`, `ServicePanel` e `RpgMenuHost` que recebam snapshots e callbacks. Nenhum filho deve conhecer `localStorage`, Supabase, `stateRef` ou o loop.

O HUD deve consumir um snapshot derivado do estado, mantendo a cadência aproximada de 120 ms. A missão rastreada deve vir do `campaign` e não de `hud.wolves/3`; XP deve ser exibido de forma real. O estado inicial hardcoded do HUD deve ser substituído por uma projeção inicial do mundo hidratado, evitando flash incorreto.

Antes de ampliar menus, deve existir uma política única de overlay: `aria-modal`, título associado, foco inicial e retorno, Escape para fechar, input de jogo bloqueado e touch oculto/desativado. O problema de `touch-controls` em `z-index:12` sobre menus (`7`) e diálogos (`8`) deve ser resolvido no contrato, não apenas com mais CSS. O teclado deve limpar ações em `blur`/`visibilitychange`; o touch deve usar `setPointerCapture` e limpar em `pointerup`, `pointercancel` e `lostpointercapture`.

A integração de mapa precisa decidir entre `AtlasDetails` como mundo e `AreaMapOverlay` como local, ou construir um `MapWindow` comum. Hoje o overlay é montado com `view="local"`, `worldRegions={[]}` e `onViewChange={() => undefined}`. Antes de anunciar o modo Mundo, devem ser passados dados reais, normalizados todos os marcadores, removida a duplicação do jogador na legenda, aplicado o estilo do RPG e implementados Escape, foco e responsividade.

### 4.6 Mundo e renderização

O render ativo está em `RpgWorldCanvas.tsx:95-188,253-262`; `worldContent.ts` possui dados regionais e `aetherionAtlas.ts` possui catálogo, mas `terrain()` e a decoração ainda formam uma clareira fixa. O primeiro ponto de integração é um `worldRenderer` puro que receba `ctx`, região, câmera, entidades, efeitos e assets, sem conhecer React, Supabase ou localStorage.

`worldContent.ts` deve ser a fonte operacional de `RegionDefinition`, com layout pequeno de props/landmarks, seed e `mapKind` (`biome`, `settlement`, `dungeon`, `special`, `final`). O atlas deve ser derivado ou validado contra esses IDs. Não é necessário implementar 25 mobs ou mapas 300×200 de uma vez; começar pelos três mobs atuais, alguns representativos e um boss, mantendo fallback geométrico.

Os assets precisam de registry único. Hoje há nove URLs externas em `RpgGame.tsx`, seis caminhos `/manus-storage` em `RpgWorldCanvas.tsx` e uma trilha alternativa em `assetUrls.ts`; não há pipeline versionado no repositório. Deve-se preferir `client/public/assets/aetherion` ou imports Vite, com estados `loading/ready/error`, fallback e dimensões normalizadas. Uma ficha de animação por sprite deve cobrir `idle`, `walk`, `attack`, `hurt` e `death`, com direção, flip, frames, duração e ancoragem.

A escala precisa ser decidida explicitamente. O Canvas usa `960×540`, `tile=32` e limites `42×30`, enquanto `campaign.ts`/`PIXEL_ART_SPEC.md` mencionam `TILE_PX=16` e mapas/setores maiores. A primeira etapa deve manter a escala atual e documentar a transformação; uma expansão de mundo só deve ocorrer depois de haver contrato de região e câmera.

## 5. Riscos consolidados e prioridade

| Prioridade | Risco | Evidência | Consequência |
|---|---|---|---|
| P0 | Runtime ambíguo | Canvas2D ativo e motor Babylon paralelo com `Player`/`Enemy`/quest/input próprios. | Correções podem atingir o caminho errado ou criar duas regras incompatíveis. |
| P0 | Save sem envelope, validação ou migração | `aetherion-world-v2` é nome de chave, não versão de payload; hidratação faz merge raso. | Evoluções podem quebrar saves, mascarar corrupção como mundo novo ou restaurar campos inválidos. |
| P0 | Escrita síncrona sem tratamento | `localStorage.setItem`/`JSON.stringify` dentro do checkpoint do RAF. | Quota/security/serialização pode interromper o loop e perder progresso. |
| P0 | Campanha órfã e progresso falso | `campaign.ts`/`campaignState.ts` não governam `WorldState`; HUD usa frases hardcoded. | Ações do jogador não desbloqueiam finais ou podem mostrar uma narrativa incompatível. |
| P1 | Dano/cooldown não são contratos | Ataque em área sem facing, contato com dano fixo, dodge usa cooldown de skill. | Combate pouco expressivo, injusto e difícil de testar ou balancear. |
| P1 | Spawn/atlas divergentes | Atlas lista 25 mobs; runtime aceita três arquétipos e cinco posições. | Conteúdo declarado não aparece no mundo e cada novo mob exige hardcode. |
| P1 | IA ignora obstáculos e não há respawn | Perseguição linear; inimigos atravessam água/árvores; mortos persistem. | Expansão de mapas e encontros produz comportamento inconsistente. |
| P1 | Recompensas e side quests dispersas | `advanceSideQuest` conta qualquer evento; rewards são somas diretas. | Missões erradas, pagamento duplicado e dificuldade de adicionar itens/XP. |
| P1 | UI não bloqueia jogo | Menus/diálogos não interrompem listeners/loop; touch fica acima dos overlays. | Dano invisível, ações acidentais, perda de controle e problemas de acessibilidade. |
| P1 | Touch sem cancelamento/captura | Falta `pointercancel`, `lostpointercapture`, blur e cleanup global. | Movimento ou ação pode ficar preso após interrupção do sistema. |
| P1 | Mundo visualmente genérico | `terrain()` e props fixos para biomas, settlements e dungeons. | O jogador não percebe o conteúdo rico do atlas; dungeons podem parecer clareiras. |
| P2 | Assets não versionados | URLs externas e `/manus-storage`, sem preload/erro/registry único. | Fallback ou inconsistência em Netlify e ambientes sem os recursos remotos. |
| P2 | Hot path alocador | Tiles, árvores, gradientes, partículas, filtros, closures e sort por frame. | Queda de desempenho quando entidades e efeitos crescerem, sobretudo em mobile. |
| P2 | Canvas e viewport rígidos | `960×540`, shell 16:9 e menus com altura baseada em `100vh`. | Recorte em portrait, blur em DPR alto e inconsistência de interação. |
| P2 | Cobertura de testes insuficiente | Um teste de mapa; nenhum teste de gameplay ou save. | Regressões de regras e migração chegam ao usuário sem detecção. |
| P2 | CSS e mapas duplicados | Seletores órfãos, `AreaMapOverlay` separado e três fontes de mapa/asset. | Alterações visuais quebram estilos, semântica ou ações em uma superfície diferente. |

O risco de maior impacto operacional é a combinação de runtime ambíguo com save não versionado. O risco de maior impacto de produto é a campanha exibida não ser a campanha jogada. Por isso, conteúdo adicional, raridades e efeitos devem esperar a estabilização dos contratos.

## 6. Estratégia incremental sem recriar o jogo

A sequência abaixo preserva o login, os slots, a coluna remota, o Canvas2D, o conteúdo existente e a identidade visual. “Versionar” aqui significa adicionar uma migração compatível no cliente; não significa trocar a chave, apagar dados, renomear slots ou alterar RLS/tabela.

### Fase 0 — Marco de segurança e runtime canônico

Registrar a decisão de que `RpgWorldCanvas` é o runtime ativo. Marcar Babylon como legado em documentação interna, sem removê-lo e sem implementar novas features nele. Registrar o baseline `pnpm check`, `pnpm test` e `pnpm build`; preservar o teste atual e o modo `?qa-map=1`. Criar uma matriz de critérios para que cada mudança prove que login, seleção de slot, entrada no mundo e logout continuam funcionando.

Nenhuma regra de combate, quest ou render deve ser ampliada nesta fase. O objetivo é eliminar a possibilidade de uma nova implementação paralela.

### Fase 1 — Fronteira de persistência compatível

Criar um módulo pequeno de codec/adaptador, por exemplo em `client/src/game`, com `load`, `save`, `flush`, `migrate` e validação. Ele deve ler o payload atual `{ profile, state }` da chave existente `aetherion-world-v2:${slotId}`, aceitar defaults parciais e converter os dois `Set` sem mudar a interface de login ou a coluna Supabase.

Adicionar um envelope aditivo com `schemaVersion`, `slotId`, `revision` e `updatedAt`, mas manter fallback de leitura do formato atual. O `slotId` deve ser a identidade; `profile` continua metadado/diagnóstico e não deve invalidar um save somente porque o nome foi alterado. Não persistir ou restaurar timers transitórios como autoridade de progresso quando houver codec novo.

Trocar o checkpoint incondicional por dirty flag e debounce, capturando falhas de parse, quota, security e serialização. Em falha, preservar o payload antigo, informar o estado pendente de forma discreta e nunca deixar exceção escapar do RAF. A sincronização remota continua no contrato atual de `RpgGame`; qualquer envio debounced futuro deve ser não bloqueante e comparável por `revision`/`updatedAt`.

Testes de aceite: round-trip, dois slots isolados, JSON inválido, payload parcial, save antigo, quota simulada, revisão local mais nova que remoto e fallback sem reset silencioso.

### Fase 2 — Serviços puros de movimento e combate

Extrair `canOccupy`, movimento por eixo/sweep simples, `applyDamage`, `resolvePlayerAttack`, `resolveSkill`, `resolveEnemyAttack`, cooldowns e `grantXp`. O RAF continua dono do `WorldState`, mas passa comandos e delta aos serviços e aplica os resultados. Não mudar todo o balanceamento: usar os stats existentes como baseline e documentar as fórmulas.

Separar ataque, skill e dodge. Manter `focus` como recurso atual, adicionar facing/cone ou alvo explícito ao ataque básico, e fazer eventos de dano carregarem valor, tipo, crítico, bloqueio, origem, destino e feedback. Corrigir múltiplos level-ups com um laço seguro sem descartar XP excedente.

Testes de aceite: dano mínimo/máximo, defesa, crítico, bloqueio, cura, invulnerabilidade, cooldown independente, ataque atrás do jogador, obstáculo, esquiva e dois níveis ganhos por uma recompensa.

### Fase 3 — EnemyDefinition, spawn, IA e respawn

Começar com os três inimigos atuais e um boss, derivando definições de `worldContent`/atlas e mantendo os sprites existentes como fallback. Substituir posições rígidas por `SpawnPoint` e um manager com limite ativo, distância mínima, tier, comportamento, XP, ouro, loot e respawn.

Implementar a máquina de estados pequena e atualizar IA em frequência menor que o render. Compartilhar `canOccupy` com o jogador, respeitar obstáculos, adicionar leash e retornar ao spawn. Persistir somente identidade e estado de encontro/respawn; reconstruir a entidade a partir da definição ao carregar. Não adicionar pathfinding global.

Testes de aceite: cada inimigo tem comportamento observável; boss não é um lobo com nome diferente; mobs respeitam terreno; morte gera reward uma vez; retorno e respawn são determinísticos e limitados.

### Fase 4 — Eventos de gameplay, campanha e recompensas

Adicionar `campaign` ao `WorldState` via migração compatível, preservando temporariamente `quest` e `sideQuest` como campos derivados/legados até que a UI esteja conectada. Criar `QuestDefinition`, `QuestObjective`, `QuestReward` e estado mutável separado do catálogo.

Substituir `advanceSideQuest` por `dispatchQuestEvent`. Integrar mortes, essência, recursos, conversa, região, dungeon, escolha, baú e reivindicação nos pontos existentes. Centralizar `grantReward` e registrar `claimedAt`/transaction id. Alinhar NPCs reais de `worldContent` às escolhas declarativas; persistir `choiceId` e efeitos de reputação/campanha.

Ligar `campaign.ts`/`campaignState.ts` somente após validar IDs, prerequisites e finais. Corrigir ou modelar explicitamente os nós de final que hoje são referenciados, mas não definidos. A HUD e o diário devem projetar dados do mesmo estado; não introduzir uma terceira representação.

Testes de aceite: matar não avança coleta, minério não avança abate, progresso atravessa regiões, baú exige o baú correto, recompensa não duplica, escolha persiste e final é calculado a partir do estado salvo.

### Fase 5 — Inventário mínimo e XP visível

Converter gradualmente poções, recursos, arma de classe e item de origem para `InventoryState`. Manter atalhos legados durante a transição. Fazer o menu read-only consumir um view-model real; só depois habilitar equipar/desequipar e efeitos derivados.

Centralizar XP para mortes, quests, bosses e recompensas. Exibir XP real na HUD e no card de reward, mantendo a curva `level * 40` como baseline para não invalidar saves. Não misturar expansão de raridade, crafting e dezenas de itens com a primeira migração.

Testes de aceite: save antigo hidrata itens/defaults, poção mantém comportamento, arma equipada altera stats derivados, desequipar reverte, reward idempotente e XP de quest chega à HUD.

### Fase 6 — Extração visual e input seguro

Extrair `RpgTopbar`, `PlayerHud`, `QuestHud`, `RpgActionBar`, `TouchControls`, `DialoguePanel`, `ServicePanel` e `RpgMenuHost` como componentes de apresentação. `RpgWorldCanvas` continua owner de `stateRef`, persistência, callbacks e loop. Depois extrair menus por domínio e um `MapWindow` comum, sem conectar componentes filhos diretamente ao save.

Aplicar a política de overlay: foco, `aria-modal`, título, Escape, retorno de foco, bloqueio do input e touch desativado. Corrigir primeiro os seletores órfãos (`topbar-actions`, `logout-button`, `service-window`, `service-facts`, `expedition-window`) e a regra `.rpg-topbar > button`, evitando mover DOM sem necessidade. Corrigir `formatControl` para setas e decidir se `H/F/C/Q/B/J` são reservados ou remapeáveis.

Substituir gradualmente eventos de teclado sintéticos por um contrato `InputAction` que adapte teclado e touch ao owner. Não conectar `InputManager.ts` legado ao Canvas2D. Validar pointer capture/cancelamento, blur, visibility, multitouch, overlays e portrait.

### Fase 7 — Mundo, assets, animação e desempenho

Criar registry único de assets, preferindo arquivos versionados em `client/public/assets/aetherion` ou imports Vite, com preload e fallback. Extrair renderer puro e layout de props/landmarks de `RegionDefinition`. Diferenciar primeiro `biome`, `settlement`, `dungeon`, `special` e `final` com pequenas variações de tiles, props, clima, luz e spawn.

Manter o Canvas2D e a escala atual até que a transformação entre `960×540`, `tile=32`, `TILE_PX=16` e dimensões de campanha seja documentada. Implementar fichas de animação para player, três mobs, NPCs principais e um boss antes de expandir o catálogo inteiro.

Cachear terreno e decoração estática por região/setor; pré-calcular hash, árvores e offsets; limitar partículas/textos; atualizar IA por distância; pausar aba oculta; ajustar DPR/resolução somente após medição. O objetivo é evitar trabalho, não introduzir ECS, engine física ou streaming complexo.

### Fase 8 — Validação integrada

Adicionar testes puros de combate, cooldown, colisão, IA, spawn, respawn, eventos, rewards, campanha, inventário, XP e codec. Adicionar um teste de integração mínimo: matar mob, ganhar XP, coletar essência, atualizar quest, flush, reload e verificar o mesmo resultado.

Executar manualmente o fluxo autenticado e `?qa-map=1`, troca de slot, logout, erro de asset, cada `mapKind`, viagem, dungeon, morte/respawn, menu bloqueante, touch interrompido, portrait/landscape e sincronização remota antiga versus cache local novo. Só considerar remoção ou limpeza do legado depois de evidência de que nenhuma entrada o utiliza.

## 7. Critérios de aceite global

A evolução pode ser considerada segura quando:

1. `RpgWorldCanvas` é o único runtime que recebe novas regras e o caminho Babylon está documentado como legado.
2. Login, criação, seleção, troca e logout de personagem continuam usando os mesmos contratos, `slotId` e tabela Supabase.
3. Saves existentes carregam sem reset; a migração é client-side, aditiva, testada e preserva fallback do formato atual.
4. Falha de storage não interrompe o RAF nem transforma corrupção em personagem novo sem aviso.
5. Ataque, skill e dodge têm cooldowns independentes e uma única resolução de dano testada.
6. Inimigos têm definições, estados, obstáculos, leash, reward e respawn observáveis; boss não depende de um tipo falso.
7. Quests respondem a eventos tipados, mantêm progresso entre regiões, escolhas e rewards idempotentes.
8. Inventário e equipamento só aparecem como operáveis quando possuírem estado, mutação, persistência e efeito real.
9. HUD, diário, inventário, diálogos e mundo projetam o mesmo estado canônico; nenhuma UI promete uma operação inexistente.
10. Menus, diálogos, serviços e mapas bloqueiam input conforme política explícita; touch limpa ações interrompidas.
11. O atlas, `worldContent` e o renderer não prometem mobs/regiões sem definição visual ou fallback declarado.
12. Canvas2D mantém pixel art, fallback e desempenho aceitável em desktop e mobile, com limites de entidades/efeitos.
13. `pnpm check`, `pnpm test`, `pnpm build` e os testes de domínio passam; o aviso de bundle é acompanhado, mas não motiva uma migração de engine.

## 8. Conclusão

O RPG não precisa ser refeito. Ele precisa de uma fonte canônica de runtime, contratos de estado e eventos, e uma sequência de extrações que preserve as fronteiras já funcionais. O Canvas2D atual é suficiente para conduzir a evolução; o maior ganho virá de retirar regras do RAF monolítico, não de trocar tecnologia.

A ordem segura é: estabilizar o save sem quebrar slots; extrair movimento, dano e XP; tornar inimigos data-driven; conectar campanha por eventos; introduzir inventário mínimo; extrair HUD/UI com overlays seguros; e só então ampliar mundo, sprites, animações e performance. Login, Supabase, Netlify, chave `aetherion-world-v2`, conteúdo existente e identidade visual devem permanecer durante todo o primeiro ciclo.

Esta auditoria é documental. Nenhum código-fonte do projeto foi alterado. Os únicos artefatos produzidos por esta consolidação são este relatório e sua cópia em `docs/AUDITORIA_UPGRADE.md`.
