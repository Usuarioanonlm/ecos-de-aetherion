# Ecos de Aetherion — Crônica da Ruptura

**Ecos de Aetherion** é um RPG 2D de fantasia medieval em pixel art, com exploração, combate, NPCs, missões e personagens independentes por conta.

**Jogar:** https://ecos-de-aetherion-rpg.netlify.app/

> “A Ruptura deixou cicatrizes. Você decide o que nasce delas.”

## Upgrade de outubro de 2026

O upgrade evolui o projeto existente; não substitui seu motor Canvas 2D, seus mapas, suas raças ou sua autenticação Supabase.

- **Combate:** dano físico e mágico, defesa, crítico, esquiva, efeitos de status, números flutuantes, cura e recargas independentes de ataque, técnica e esquiva.
- **Inimigos:** catálogo regional, preparação de ataques, perseguição, retorno, fuga, flanqueamento, magia, veneno, cura, reforços limitados e enfurecimento. O spawn inicial possui três lobos; os mapas respeitam um limite de 12 criaturas ativas. Criaturas comuns podem reaparecer; chefes derrotados não são recriados ao trocar de região.
- **Chefes físicos:** os oito chefes principais do atlas possuem IDs próprios e encontros nas regiões correspondentes. Kaelgor aparece nos Campos Gélidos de Norvak; a Fortaleza de Ferro contém Mordrak e Seraphyne.
- **Missões:** diário com filtros Todas, Principais, Secundárias, Diárias e Concluídas; objetivos, progresso, nível recomendado, recompensas, rastreamento, abandono e decisões. Matar, coletar, conversar, explorar, abrir baús e derrotar chefes alimenta o estado das missões.
- **Inventário:** categorias, quantidades, raridade, descrições, comparação, consumíveis, equipamento e desequipamento. Recursos de construção, loja e bolsa usam a mesma contagem.
- **Progressão:** XP com múltiplos níveis, atributos derivados e bônus reais de equipamentos. Recompensas e mortes são protegidas contra recebimento duplicado.
- **Mundo:** NPCs com pequenos movimentos por função, objetos regionais, sprites detalhados e sombras ancoradas ao chão. Criação e exploração compartilham os mesmos modelos de raça.
- **Interface:** HUD com vida, foco, XP, ouro, status e recarga; painéis adaptados a PC e celular. Menus, diálogos e serviços pausam a simulação para que o personagem não seja atacado durante a leitura.
- **Persistência:** save versionado por slot, migração de inventário/missões, preservação de progresso e recompensas antigas, backup de payloads inválidos e sincronização remota com revisão e tentativas limitadas.

O catálogo do atlas permanece disponível no codex. Nem toda criatura catalogada possui uma folha de animação exclusiva: algumas variantes compartilham o sprite da espécie-base, com atributos, cores e comportamentos próprios. As animações atuais usam recortes dos sprites existentes e feedback 2D; não são novos spritesheets completos de todas as raças.

## Controles

| Tecla padrão | Ação |
| --- | --- |
| `WASD` | Mover. |
| `Espaço` | Atacar. |
| `R` | Técnica de classe; consome foco e tem recarga. |
| `Shift` | Esquivar com breve invulnerabilidade. |
| `F` | Absorver essência ou coletar um recurso próximo. |
| `H` | Usar poção de musgo quando estiver ferido. |
| `E` | Conversar, usar serviços, abrir baús ou atravessar uma saída. |
| `C`, `I`, `M`, `Q`, `B`, `J` | Personagem, inventário, mapa, missões, construções e codex. |
| `Tab` | Configurações. |
| `Esc` | Fechar a janela e retomar a exploração. |

**Teclas** permite remapear movimento, ataque, habilidade, inventário, mapa, interação, esquiva e menu. **Restaurar controles padrão** recupera a configuração acima.

No celular, mantenha o direcional pressionado para caminhar. Os botões de ataque, Éter, absorção, interação e esquiva acionam os mesmos handlers do teclado. A área de jogo bloqueia seleção de texto e menu nativo de pressão prolongada; os campos de login e criação continuam utilizáveis.

## Como começar

1. Entre na conta e escolha um dos cinco slots, ou crie um novo Eco.
2. Na trilha inicial, converse com a guardiã perto do assentamento e dissipe três lobos.
3. Abra **Crônicas** para acompanhar objetivos e receber recompensas concluídas.
4. Use as estradas e portais físicos para descobrir regiões. Nas vilas, procure comércio, capela e baú.
5. Use **Bolsa** para comparar e equipar itens ou consumir uma poção.

## Mapas e viagem

O minimapa no canto superior direito é clicável. Em assentamentos e áreas internas, ele abre a planta local com NPCs, serviços e posição do personagem. Nos biomas, abre o atlas mundial. A tecla de mapa segue a mesma regra; a janela local permite consultar o mundo.

O atlas oferece zoom e arrasto com mouse ou dedo. A viagem rápida exige destino previamente descoberto e confirmação de ameaça, inimigos, recursos, recompensas possíveis e custo. O jogador escolhe gastar foco de Éter ou ouro; o handler também verifica o desbloqueio e o saldo.

`AreaMapOverlay.tsx` foi extraído do material enviado e integrado como código normal. **Nenhum ZIP é referenciado ou publicado como parte do jogo.**

## Conta e personagens

A autenticação continua por e-mail via Supabase. O **Arquivo de Ecos** apresenta até cinco personagens por conta, cada um com perfil, inventário, regiões, missões, áudio e controles separados.

**Trocar Eco** retorna à seleção e **Sair** encerra a sessão. Ambas as ações persistem o mundo e tentam concluir a sincronização antes da transição. Se a conexão estiver indisponível, o save local é preservado; a sincronização online ainda depende de acesso ao Supabase.

## Organização do código

| Diretório | Responsabilidade |
| --- | --- |
| `client/src/components/rpg/` | HUD, atlas, menus, inventário, diário e foco de diálogos. |
| `client/src/game/combat/` | Resolução de dano, cura, recargas e status. |
| `client/src/game/enemies/` | Dados, IA, spawn e respawn. |
| `client/src/game/items/` | Catálogo, loot, inventário e equipamentos. |
| `client/src/game/quests/` | Catálogo, eventos, campanha, recompensas e migração. |
| `client/src/game/rendering/` | Sprites, terreno, decoração, movimento de NPCs e áudio. |
| `client/src/game/systems/` | Movimento, progressão e save codec. |
| `client/src/game/worldContent.ts` | Regiões físicas, serviços e rotas. |
| `client/src/components/RpgWorldCanvas.tsx` | Coordenação do loop, input e integração React/Canvas. |
| `client/src/components/RpgGame.tsx` | Login, slots e sincronização Supabase. |

## Desenvolvimento e validação

```bash
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
```

O modo `/?qa-map=1` funciona **somente em desenvolvimento**, com personagem temporário e sem login real. Em produção, esse parâmetro não permite ignorar a autenticação. `qa-reset=1` limpa apenas o slot temporário de QA.

A validação do upgrade incluiu **65 testes unitários**, checagem TypeScript, build e duas suítes headless de gameplay/interface: movimento, combate, morte, XP, loot, missões, lojas, capela, baús, equipamentos, cooldowns, remapeamento, save/reload e toque prolongado. Os layouts foram medidos em 390×844, 360×740 e 844×390. Essa emulação não substitui testes em todos os aparelhos físicos.

O relatório de auditoria e as notas dos assets ficam em `docs/`. A publicação principal usa o build estático de `dist/public` na Netlify; o GitHub preserva o código e o histórico.
