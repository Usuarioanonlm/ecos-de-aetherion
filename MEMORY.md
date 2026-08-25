# Memória de Implementação — Ecos de Aetherion

- O pedido é uma experiência 2D jogável no navegador, com futura publicação no GitHub Pages.
- O documento-base define Aetherion como um continente afetado pela Grande Ruptura e pela liberação do Éter; o primeiro corte escolhe o caminho do slime e a habilidade Absorção.
- O recorte prioritário é: floresta, luta contra lobos, absorção e proteção da Vila de Musgo. Civilização, diplomacia e mundo aberto completo ficam para expansões.
- A direção de design é **Cartografia Viva**; consultar `ideas.md` antes de alterar aparência, tipografia ou linguagem.
- Os recursos grandes ficam fora do repositório do aplicativo e são referenciados por URLs `/manus-storage/...`, adequadas ao projeto web.
- A referência visual foi validada: mostra uma clareira densa em visão superior, slime jade, lobo escuro, cabana de musgo, fissuras douradas e HUD de fantasia; ela sustenta a composição do prólogo.
- O primeiro emblema gerado possui artefatos magenta no recorte transparente. Deve ser substituído por uma versão com fundo opaco escuro e recorte visual limpo antes da entrega, em vez de se depender da transparência defeituosa.
- Os URLs reservados da geração falharam no preview, embora os PNGs locais existissem. A solução aplicada foi publicar a referência visual e o emblema com o armazenamento estático do projeto; após um novo carregamento, a clareira, a cabana, o slime e o lobo da referência passam a aparecer corretamente no canvas.
- O modo `?demo` foi validado no navegador: ele derrota os três lobos, coleta três essências, libera “Instinto Lupino” e muda o objetivo para “Alcance a Vila de Musgo”. O laço de combate e evolução está funcional; falta apenas confirmar a conclusão visual ao alcançar a vila.
