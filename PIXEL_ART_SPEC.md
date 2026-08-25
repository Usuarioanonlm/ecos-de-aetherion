# Especificação de Pixel Art

O mundo usa grade-base de **16×16 px**. Personagens e NPCs ocupam **32×48 px**; inimigos pequenos, **32×32 px**; inimigos médios, **48×48 ou 64×64 px**; bosses, **96×96 a 192×192 px**; e dragões, **256×256 px ou mais**. O canvas deve usar escala inteira, `image-rendering: pixelated` e iluminação pós-renderizada por setores.

| Área | Grade | Estratégia |
| --- | ---: | --- |
| Cidade | 100×100 tiles | Distritos, construções e NPCs carregados por setores 25×25. |
| Floresta | 200×200 tiles | Clareiras, clima, espíritos e trilhas por setores 25×25. |
| Deserto | 300×200 tiles | Dunas, ruínas e visibilidade reduzida por tempestade de areia. |
| Montanhas | 250×250 tiles | Altitude, minas, neve e rotas verticais. |
| Dungeon | 80×80 tiles | Salas, portas, armadilhas e boss final. |

Iluminação é calculada a partir de fontes locais — fogo, magia, lua e fissuras de Éter — com partículas para folhas, cinzas, chuva, neve, poeira e faíscas. Clima afeta paleta, partículas e visibilidade, nunca altera a escala de pixel.
