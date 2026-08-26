# Plano do Jogo: Ecos de Aetherion — Prólogo da Ruptura

## Atualização visual — pixel art densa

O protótipo passa a usar uma cena lógica de **960×540 px**. A reconstrução troca a aparência simples por sprites com silhuetas e materiais legíveis: herói/NPC e monstros em 48 px, bosses e efeitos em 96 px, árvores em 64 px, armas em 32 px e construções componíveis somente em múltiplos de 32 px. A verificação exige uma cena sem grandes campos vazios, com sombras de contato, detalhes de terreno e escala pixelada preservada em desktop e celular.

## Recorte da primeira versão

O protótipo acompanha um **slime recém-desperto** na Floresta Primordial. O objetivo é atravessar uma clareira, derrotar lobos primordiais, absorver sua essência e alcançar a Vila de Musgo antes que a patrulha humana chegue. Este corte materializa os pilares de exploração, evolução e decisão do documento de conceito sem prometer ainda o mundo aberto completo, a construção de civilizações ou as oito regiões.

## Tarefas de risco

### 1. Cena 2D ortográfica no motor de jogo

- **Por que isolar:** a cena precisa manter aparência de jogo 2D, carregar transparências e conservar a proporção entre fundo, jogador, inimigos e interface em tamanhos de tela diferentes.
- **Abordagem:** usar uma câmera ortográfica fixa, um plano de ambiente em profundidade de fundo e sprites em planos paralelos; converter movimento em coordenadas de mundo limitadas à clareira; garantir que a camada de interface React não interfira nos comandos do canvas.
- **Verificar:** o slime permanece dentro da área jogável, o movimento por WASD/setas acompanha a direção visual, os sprites não desaparecem em redimensionamentos e o cenário continua cobrindo a tela sem barras ou distorção evidente.

### 2. Ciclo de combate, morte e absorção

- **Por que isolar:** o núcleo do jogo depende de uma sequência de estados clara: perseguir, atacar, receber dano, derrotar, absorver e evoluir. Uma transição confusa deixaria o conceito central invisível.
- **Abordagem:** usar máquinas de estado simples para inimigos e jogador; limitar alcance de ataque e cadência; remover o inimigo somente após o impacto final e criar uma essência de Éter coletável que retorna ao slime ao usar Absorção.
- **Verificar:** aproximar-se de um lobo e usar o ataque reduz exatamente a vida dele; o lobo só causa dano quando próximo; um inimigo derrotado vira essência; a habilidade Absorção eleva a essência e libera o traço “Instinto Lupino” sem duplicá-lo.

### 3. Demonstração automática para inspeção visual

- **Por que isolar:** uma captura de tela estática não prova que a exploração, o combate e a evolução funcionam juntos.
- **Abordagem:** acrescentar o parâmetro `?demo`, que controla um percurso determinístico: deslocamento até o lobo, ataques, absorção e chegada ao objetivo; sem substituir os controles manuais no modo normal.
- **Verificar:** em `?demo`, o personagem realiza movimento → ataque → absorção → avanço de missão em uma execução contínua, e o modo normal continua respondendo apenas a teclado/toque.

## Construção principal

O jogo terá uma única área de exploração em visão superior, um slime como personagem, lobos primordiais hostis e uma rota de objetivo que conduz à Vila de Musgo. O jogador usa **WASD ou setas** para se mover, **Espaço** para atacar e **F** para absorver essência próxima. A interface mostra vitalidade, essência acumulada, habilidade desbloqueada, objetivo atual, mapa simbólico e legenda de controles. Um painel lateral de evolução apresenta a escolha já conquistada ao absorver um lobo.

- **Ativos necessários:** fundo de clareira 16:9, sprite de slime 192×192 px, sprite de lobo 192×192 px, emblema 128×128 px e imagem de referência da composição.
- **Verificar:**
  - WASD e setas deslocam o jogador na direção correta; Espaço e F acionam ações coerentes com seu estado.
  - O feedback de ataque, dano e absorção é visível sem ocultar a área de jogo.
  - O objetivo avança de “derrote os lobos” para “alcance a Vila de Musgo” e culmina em “prólogo concluído”.
  - A interface continua legível em desktop e celular, sem sobreposição fatal nos controles.
  - Não há texturas ausentes, barras de rolagem, elementos de exemplo ou erros de console durante a execução.
  - A composição preserva a referência visual: cartografia iluminada, mata verde-musgo, carvão profundo e ouro de Éter como destaque.
  - A compilação estática gera uma pasta que pode ser hospedada no GitHub Pages sem código de servidor.

## Fora do escopo deste corte

O protótipo não incluirá ainda geração procedural, multijogador, árvore completa de raças, áudio, construção de cidades, economia, diplomacia, dungeons ou todos os finais. Esses sistemas serão planejados como capítulos posteriores sobre uma base de exploração e evolução já jogável.
