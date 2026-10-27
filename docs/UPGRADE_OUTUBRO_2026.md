# Upgrade integrado — Ecos de Aetherion

**Data:** 27 de outubro de 2026  
**Jogo:** https://ecos-de-aetherion-rpg.netlify.app/  
**Código:** https://github.com/Usuarioanonlm/ecos-de-aetherion

## O que mudou

O motor React/Vite/Canvas 2D foi mantido. A evolução separou combate, IA, spawn, inventário, equipamentos, loot, missões, progressão, save e renderização em módulos reutilizáveis, além de extrair HUD e painéis de apresentação. O motor Babylon antigo não recebeu novas regras e permanece fora do caminho ativo.

O combate agora usa atributos, defesa física/mágica, crítico, bloqueio, esquiva e status, com recargas independentes. Inimigos anunciam seus ataques, respeitam obstáculos, perseguem/retornam, fogem ou usam comportamentos próprios. Oito chefes do atlas receberam encontros físicos, incluindo Kaelgor em Norvak e dois encontros na Fortaleza de Ferro.

O diário apresenta categorias, objetivos, progresso, recompensas, rastreamento e decisões. Missões respondem aos eventos reais do mundo; caça em vilas aponta para o bioma de saída, e baús exigem o objeto correto. A cadeia inicial exige conversar com a guardiã e derrotar três lobos. Escolhas incompatíveis não são registradas juntas e recompensas não podem ser recebidas duas vezes.

O inventário oferece comparação, raridade, consumo, equipamento e desequipamento. Loja, construção, recompensa e bolsa usam as mesmas quantidades, evitando recursos que reapareciam por projeções paralelas. XP excedente atravessa múltiplos níveis.

Os sprites originais de jogador, NPCs e monstros foram preservados, padronizados e servidos por URLs públicas leves. Criação e mundo compartilham os mesmos modelos de raça. Caminhada, ataques, impactos e dissipação usam recortes/efeitos 2D; não houve conversão para 3D nem introdução de pernas separadas do sprite.

## Preservação de progresso

- Autenticação Supabase, tabela de slots e limite de cinco personagens permanecem.
- `slotId` continua a identidade; a chave local permanece `aetherion-world-v2:<slotId>`.
- O save tem envelope versionado, revisão, migração de formato antigo e tratamento de falhas.
- Itens, zeros explícitos, progresso e valores de recompensas legadas são preservados.
- Payloads inválidos são preservados em backup; falhas de quota não substituem o save anterior.
- A sincronização online tem política de revisão/conflito e tentativas limitadas. Offline, a persistência local continua sendo a proteção imediata.

## Validação executada

**65 testes unitários em 11 arquivos passaram**, incluindo codec de save e isolamento de slots, migração, quota, conflito, combate, progressão, inventário, missões, IA, spawn/respawn, renderização, mapa e UI. TypeScript e build de produção passaram; o diff foi verificado e não há ZIP no código publicado.

A suíte principal de navegador passou nas verificações de movimento, combate, XP, loot, uso de poção, pausa por menus, mapa local, NPC, save/reload e layouts. Foram medidos 390×844, 360×740 e 844×390, sem overflow horizontal e com alvos touch de pelo menos 44 px.

A suíte avançada passou **26 verificações**, incluindo:

- missões concluídas por conversa e mortes reais, recompensa e desbloqueio da cadeia;
- bloqueio de viagem rápida a destino não descoberto;
- compra/venda, capela e baú sem recompensa duplicada;
- equipamento/desequipamento, recarga de técnica e esquiva independente;
- morte/recuperação do jogador preservando inventário;
- remapeamento de teclas e pressão touch prolongada com liberação do movimento.

Não foram usadas contas reais nem enviados e-mails de cadastro durante essas suítes. A autenticação e o banco foram preservados; a verificação pública de produção cobre carregamento do login e bloqueio do modo QA, não uma nova rodada de confirmação por e-mail.

## Limites e continuidade

O catálogo mantém referências a criaturas e elementos narrativos que podem ser expandidos. Variantes ainda compartilham sprites-base; nem todas possuem animações exclusivas. A arquitetura e o mundo foram evoluídos, mas o coordenador Canvas continua sendo um arquivo grande e pode ser extraído em unidades menores em próximas etapas.

O build continua emitindo um aviso de tamanho de chunk; ele não bloqueia a publicação. O tamanho reduzido dos sprites, cache do terreno, limites de entidades/vozes e histórico de eventos limitado melhoram o custo operacional, mas a emulação headless não é uma medição de FPS em todos os celulares físicos.

O mapa local veio de código extraído do material do usuário. **Nenhum arquivo ZIP foi incluído no projeto, GitHub ou build público.**
