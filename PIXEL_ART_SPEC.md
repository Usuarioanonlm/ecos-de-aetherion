# Especificação de Pixel Art

## Escala de produção atual

O jogo passa a ter uma cena interna de referência em **960×540 px**, com renderização pixelada e escalonamento inteiro sempre que o dispositivo permitir. A grade-base continua em **16×16 px**, mas sprites e objetos importantes usam as dimensões abaixo para ganhar leitura, materialidade e presença no campo de jogo.

| Elemento | Dimensão-alvo | Regra visual |
| --- | ---: | --- |
| Personagem e NPC | 48 px de altura útil | Silhueta de três planos, animação de caminhada e arma independente. |
| Monstro comum | 48×48 px | Volume, sombra de contato, olhos e detalhes de material. |
| Boss | 96×96 px | Silhueta única, telegráfos de ataque e efeitos próprios. |
| Árvore | 64×64 px | Tronco, raízes, copa em camadas e sombra deslocada. |
| Construção básica | 32×32 px por módulo | Construções avançadas usam somente múltiplos de 32. |
| Arma | 32 px | Renderização independente do corpo para leitura do ataque. |
| Efeito de Éter/combate | até 96×96 px | Forma de impacto em pixels, brilho seletivo e dissipação. |

O canvas usa `image-rendering: pixelated` e iluminação pós-renderizada por setores. O desenho deve evitar campos vazios, contornos vetoriais, gradientes suaves e formas arredondadas genéricas. Cada material recebe pelo menos três tons legíveis: base, sombra e luz seletiva.

| Área | Grade | Estratégia |
| --- | ---: | --- |
| Cidade | 100×100 tiles | Distritos, construções e NPCs carregados por setores 25×25. |
| Floresta | 200×200 tiles | Clareiras, clima, espíritos e trilhas por setores 25×25. |
| Deserto | 300×200 tiles | Dunas, ruínas e visibilidade reduzida por tempestade de areia. |
| Montanhas | 250×250 tiles | Altitude, minas, neve e rotas verticais. |
| Dungeon | 80×80 tiles | Salas, portas, armadilhas e boss final. |

Iluminação é calculada a partir de fontes locais — fogo, magia, lua e fissuras de Éter — com partículas para folhas, cinzas, chuva, neve, poeira e faíscas. Clima afeta paleta, partículas e visibilidade, nunca altera a escala de pixel.
