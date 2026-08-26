# Ativos — Ecos de Aetherion

**Direção de arte atual:** pixel art RPG de fantasia em visão superior, com floresta de teal profundo, musgo em camadas, madeira quente, ouro mineral e Éter turquesa. A cena usa pixels nítidos, materiais em três a cinco tons, sombras de contato, partículas pontuais e densidade ambiental; não usa vetores lisos, realismo fotográfico ou campos planos vazios.

## Referência visual

| Nome | Papel | Tamanho | URL |
| --- | --- | --- | --- |
| Alvo visual de Aetherion | Guia de composição, câmera e densidade da cena; também usado como a clareira visível do prólogo | 16:9 | `/manus-storage/aetherion-visual-target_29ae52fa.png` |
| Direção pixelada 960×540 | Referência de paleta, escala e densidade para a reconstrução dos sprites e do terreno | 16:9 | `/manus-storage/aetherion-pixel-art-direction_8b5c2c65.png` |

## Fundos

| Nome | Descrição | Tamanho | URL |
| --- | --- | --- | --- |
| Clareira Primordial | A referência visual publicada, com cabana, fissuras de Éter e área central livre | 1920×1080 px, cobre a janela | `/manus-storage/aetherion-visual-target_29ae52fa.png` |

## Sprites

| Nome | Descrição | Tamanho no jogo | URL |
| --- | --- | --- | --- |
| Herói de Éter | Personagem de 48 px com corpo, cabeça, manto e arma de 32 px em camadas | 48 px | Renderização procedural detalhada |
| Monstro Primordial | Criatura de 48×48 px com silhueta, olhos, patas e sombra de contato | 48×48 px | Renderização procedural detalhada |
| Guardião da Raiz | Boss com corpo e telegrafia de ataque em camadas | 96×96 px | Renderização procedural detalhada |
| Arquivo de raças | Sprites de criação em grade 48 px, com silhuetas próprias de humano, slime, goblin, lobo, kobold, lagarto, elfo, anão e meio-fera | 48 px | SVG pixelado procedural |
| Sprites refinados de raças | Personagens individuais com anatomia, contorno escuro e paleta de sombreamento em degraus; usados na criação, slots e mundo | 48 px lógico | `/manus-storage/aetherion-*-sprite_*.png` |

## Marca

| Nome | Descrição | Tamanho | URL |
| --- | --- | --- | --- |
| Emblema de Éter | Gota de slime cortada por fissura mineral, sem texto | 128×128 px | `/manus-storage/aetherion-emblem_f82da37c.png` |

## Formas procedurais permitidas

As barras de vida, selos de habilidade, cursor de missão, trilhas de ataque e partículas de absorção são desenhados pelo jogo. Eles são geometria e cor simples; não substituem os ativos artísticos acima.

## Referências de movimento fornecidas

As três referências apresentam sprites compactos com **poses-chave de silhueta forte**: idle, avanço, preparação, impacto, recuo e morte. A implementação dos mobs em Aetherion adotará o mesmo princípio sem reproduzir os personagens ou ativos externos: antecipação curta antes da investida, bloqueio breve com contorno de Éter, flash de impacto, recuo horizontal ao sofrer dano e desaparecimento em partículas ao morrer. A cadência será curta, de leitura imediata, e as poses terão pixels deslocados de forma perceptível em vez de animação suave sem mudança de silhueta.
