# Assets e renderização do upgrade

O runtime permanece Canvas2D, com resolução lógica de 960 × 540, entidades desenhadas em pixel art e coordenadas de mundo preservadas. `client/src/game/rendering/assetRegistry.ts` é a fonte única das URLs dos nove sprites de jogador, dos NPCs e das criaturas. A criação de personagem importa o mesmo registry que o mundo; não existe troca do modelo escolhido por outro personagem.

## Entrega pública e desempenho

Durante o QA, os seis caminhos antigos de NPCs/criaturas em `/manus-storage` retornaram 404 na Netlify. Os arquivos originais foram recuperados do proxy de desenvolvimento e mantidos fora do repositório. Cópias operacionais de 128 × 128 foram publicadas em URLs HTTPS diretas no CDN. As cópias têm alpha, margens padronizadas e redução por vizinho mais próximo; foram removidos resíduos do fundo de recorte dos sprites legados, sem desenhar personagens novos. Os originais foram preservados em `/home/ubuntu/webdev-static-assets/recovered-sprites/`.

Os nove modelos do jogador também receberam margens transparentes consistentes, usando o mesmo conteúdo artístico e redução por vizinho mais próximo, com os originais preservados em `/home/ubuntu/webdev-static-assets/player-optimized/`. As versões operacionais são compartilhadas entre criação e jogo. NPCs e criaturas são carregados sob demanda; nenhuma imagem grande nem arquivo ZIP foi adicionado ao projeto ou ao GitHub.

## Props de cenário

O novo atlas de quatro objetos contém ruína com musgo, carroça de comércio, toco com cogumelos e cristais. O original de 1920 × 1920 permanece fora do projeto em `/home/ubuntu/webdev-static-assets/aetherion-world-props.png`. A versão operacional de 512 × 512 mantém transparência e quadrantes de 256 × 256, publicada em:

`https://files.manuscdn.com/user_upload_by_module/session_file/310419663030079711/aqNSfxcvaAOgdqlw.png`

O layout por região diferencia biomas, assentamentos, dungeons, regiões especiais e a região final, com no máximo oito props e culling pela câmera. Os serviços, NPCs, portais, baús e posições existentes não são substituídos pelos objetos decorativos.

## Animação e tolerância a falhas

O renderer separa tronco e pés sem repetir uma faixa do corpo. Os pés são recortes do próprio sprite e alternam pequenas elevações durante a caminhada; as sombras são alinhadas ao chão, sem pernas extras ou botão de correr. Idle, direção, ataque, dano e morte continuam associados ao estado real do runtime. O tamanho-base de personagens, NPCs e mobs é 48 px; chefes usam a escala maior existente.

`getRaceSprite`, `getEntitySprite` e `getPropsAtlas` mantêm cache por URL. Falhas de rede ou ambiente sem DOM usam fallbacks de pixel art, sem interromper o loop. O áudio sintético é opcional, respeita os volumes existentes e usa teto de vozes simultâneas.
