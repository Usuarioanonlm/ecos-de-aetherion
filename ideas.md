# Direção de Design — Ecos de Aetherion

## Três abordagens consideradas

### Cartografia Viva
**Muito breve:** Uma fantasia de gravura antiga que ganha movimento: pergaminho, tinta mineral, madeira esculpida e luz de Éter. A interface parece um mapa ritual encontrado após a Grande Ruptura, com a aventura pulsando sobre ele.  
**Probabilidade:** 0.037

### Jardim da Ruptura
**Muito breve:** Um universo de aquarela botânica, com florestas perigosamente exuberantes e criaturas translúcidas. A emoção é de descoberta delicada antes de cada ameaça.  
**Probabilidade:** 0.082

### Ferro e Brasas
**Muito breve:** Uma visão de fantasia industrial, com metal gasto, forjas anãs e símbolos de facções gravados em placas pesadas. A emoção é de sobrevivência e construção sob pressão.  
**Probabilidade:** 0.014

---

## Abordagem escolhida: Cartografia Viva

### Movimento de design

**Fantasia editorial de gravura e cartografia iluminada.** A apresentação combina a legibilidade de uma carta topográfica com a atmosfera tátil de um códice de aventura. Em vez de copiar diretamente qualquer obra de referência, o jogo cria sua própria leitura de fantasia: um continente ferido pelo Éter, observado por quem acabou de despertar dentro dele.

### Princípios centrais

1. **O mundo é o protagonista:** o mapa, a floresta e os pontos de interesse devem continuar perceptíveis em todos os momentos.
2. **Informação como artefato:** atributos, objetivos e habilidades surgem em placas finas, sem encobrir a ação.
3. **Contraste ritual:** verde de mata, carvão profundo e dourado de Éter organizam cada decisão e perigo.
4. **Rugosidade controlada:** bordas, padrões e partículas sugerem matéria física, sem comprometer a leitura rápida.

### Filosofia de cor

O fundo usa **carvão azulado** para sugerir uma noite antiga e aumentar a profundidade da exploração. A mata aparece em verdes musgo e jade, como vida acelerada pela Ruptura. O **dourado de Éter** é a assinatura: reservado para energia, evolução, metas e escolhas importantes, para que sempre seja percebido como algo raro e perigoso. O vermelho escuro pertence exclusivamente ao risco — saúde, inimigos e dano.

### Paradigma de layout

O jogo ocupa toda a tela como uma **mesa de cartógrafo**. A área de exploração é central e livre; os indicadores são ancorados às bordas como instrumentos sobrepostos ao mapa: vitais no alto à esquerda, missão no alto à direita e habilidades na base. O painel de evolução abre lateralmente como uma folha dobrada, preservando o terreno visível.

### Elementos de assinatura

- **Linhas de relevo e rosa dos ventos incompleta** sob o terreno, alusões à Árvore Primordial fragmentada.
- **Fissuras de Éter** em dourado mineral, usadas em marcos de objetivo e efeitos de absorção.
- **Placas de interface com cantos chanfrados**, riscos de tinta e ícones como selos de facção.

### Filosofia de interação

As ações devem parecer decisões físicas e claras. Movimento é imediato; ataques são curtos e legíveis; absorver exige uma confirmação visual de energia indo da criatura ao protagonista. Toda escolha de narrativa usa linguagem direta, contextual e sem promessas genéricas.

### Animação

O ambiente se move lentamente: névoa, vagas de luz e partículas de Éter. Ataques usam deslocamento breve e impacto seco; a absorção desenha filetes dourados curvos até o personagem. Painéis aparecem como pergaminhos que deslizam e se assentam em até 220 ms, com `cubic-bezier(0.23, 1, 0.32, 1)`. O jogo respeita `prefers-reduced-motion` e deixa ações de teclado imediatas.

### Sistema tipográfico

**Cinzel** é a face de exibição para o título, regiões, nomes de missões e eventos de evolução: monumental, lapidada, sem parecer tecnológica. **Manrope** é a face funcional para combate, instruções e números, com alta legibilidade em tamanhos pequenos. Títulos usam caixa alta moderada e espaçamento largo; o texto de jogo privilegia frases curtas e claras.

### Essência da marca

**Ecos de Aetherion é um RPG 2D de fantasia viva para quem quer começar como ninguém e decidir o destino de um continente ferido.**

Personalidade: **mítica, tática e inquieta.**

### Voz da marca

Títulos soam como fragmentos de uma crônica descoberta; CTAs nomeiam uma ação concreta; microcopy descreve o que mudou no mundo.

> “A Ruptura deixou cicatrizes. Você decide o que nasce delas.”

> “Absorver traço: converter o instinto do inimigo em seu próximo passo.”

### Wordmark e símbolo

O wordmark deve ter serifa afiada e variação de peso, como uma inscrição nas margens de um mapa. O símbolo é uma **gota de slime atravessada por uma fissura de Éter**: metade orgânica, metade cristal, sem texto, capaz de virar ícone de app e marcador no mapa.

### Cor de assinatura

**Ouro de Éter — `#E7BD58`**. Um dourado mineral, mais terroso que amarelo, usado somente para tudo que representa destino, descoberta e evolução.

## Style Decisions

- A primeira tela deve manter uma leitura imediata de cartografia: contornos topográficos, borda gravada ou rosa dos ventos aparecem sobre a área de exploração desde o início.
- O Ouro de Éter (`#E7BD58`) é reservado a destino, descoberta, evolução, objetivos e ações primárias; não é usado como enfeite indiferenciado.
- O wordmark permanece em serifa gravada no espírito de Cinzel e é acompanhado pelo símbolo de uma gota de slime atravessada por uma fissura de Éter.
