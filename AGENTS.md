# Album CCG - Arquitetura para agentes

## Objetivo inicial

Criar um album digital publico de figurinhas para um grupo de amigos. A alternativa escolhida e o album aberto em duas paginas, com sensacao de virada por clique, mouse ou toque.

## Stack

- Vite + Vue 3.
- TypeScript em modo estrito.
- `vite-ssg/single-page` para gerar site estatico sem backend, sem autenticacao e sem roteador.
- Assets publicos em `public/stickers`.
- A capa usa `public/logo-co-gole.svg`, copiado do SVG colocado no root do projeto.

## Organizacao

- `src/data/album.ts`: dados mockados do album, paginas, figurinhas reais e placeholders.
- `src/components/AlbumSpread.vue`: componente principal do album aberto, com navegacao por botoes e arraste horizontal.
- `src/components/StickerGrid.vue`: grade reutilizavel de 4 figurinhas por pagina.
- `src/styles.css`: estilos globais, spread do album, placeholders e feedback visual de virada.

## Decisoes atuais

- As duas imagens de exemplo foram copiadas para `public/stickers/sample-01.jpeg` e `public/stickers/sample-02.jpeg`, evitando nomes com espacos no codigo.
- Cada pagina renderiza 4 slots, melhor para mobile.
- O album inicia fechado, mostrando apenas a capa. Ao clicar na capa, abre no primeiro spread com duas paginas.
- A capa tambem pode ser aberta arrastando para a esquerda com mouse, dedo ou caneta.
- A abordagem visual e mobile-first: o CSS base prioriza celular/tablet pequeno. No mobile, as duas paginas do spread ficam empilhadas para legibilidade; em telas maiores, passam a ficar lado a lado.
- Paginas so sao criadas quando existe pelo menos uma figurinha real nelas. Os placeholders completam apenas paginas que ja tenham figurinhas reais.
- Figurinhas reais podem abrir uma modal. A imagem aparece ampliada com efeito 3D por Pointer Events, e a descricao e carregada de um arquivo `.md` em `public/stickers` com o mesmo nome base da imagem.
- A navegacao avanca de duas em duas paginas para preservar o modelo de album aberto. Voltar no primeiro spread fecha o album e retorna para a capa.
- A virada de pagina usa Pointer Events para funcionar com mouse, dedo em tablet e caneta. O arraste horizontal acima do limiar troca de spread.

## Proximos passos provaveis

- Substituir os dados mockados por uma estrutura real de amigos/figurinhas.
- Definir se paginas terao figurinhas fixas ou se havera estado de colecao por usuario no futuro.
- Ajustar proporcao das figurinhas com base no formato final das imagens.
- Se a experiencia precisar de curvatura de pagina mais realista, avaliar uma biblioteca dedicada de page flip ou uma implementacao canvas/WebGL.
