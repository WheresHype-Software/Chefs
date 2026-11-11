# Anúncio Instagram: registo real na app (ramo de trabalho, não juntar ao main)

Material para gravar o fluxo **real** da app Ao Lume num mockup de telemóvel e montar anúncios animados (Story 9:16 e Post 4:5) para Portugal, público chefs/cozinheiros.

## Como pôr a app a correr com dados de exemplo

1. `mkdir -p public/_ad && cp marketing/ad-flow/fotos/*.jpg public/_ad/` (só local; `public/_ad` não se faz commit).
2. Servidor Supabase falso (PostgREST + auth mínimos): `node marketing/ad-flow/mock.js` (porta 54321).
   - Chef de exemplo: "Marta Figueiredo" (`/chef/marta-figueiredo`), 3 menus, 3 avaliações, selo Fundador.
   - `MANY=1` junta mais 4 chefs (só serve para testar o mapa).
3. App: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_demo NEXT_PUBLIC_SITE_URL=https://aolume.com NEXT_PUBLIC_META_PIXEL_ID= npx next dev -p 3320`
4. Gravar (Playwright, 390×844 a 2x, vídeo 780×1688 em `vid-<nome>/`, com um círculo a mostrar cada toque):
   - `node marketing/ad-flow/rec.js signup`: /entrar → Criar conta → Quero cozinhar → nome, email, palavra-passe, termos → "Criar conta de chef". (Funciona; depois do toque a app não muda de ecrã porque não há sessão: cortar aí e mostrar "Conta criada ✓" no anúncio.)
   - `node marketing/ad-flow/rec.js page`: página pública do chef a deslizar (galeria, selos, menus).
   - `node marketing/ad-flow/rec.js book`: cliente pede reserva sem criar conta (Marmitas da semana → dia → 12:00 → nome/email/telemóvel → enviar). Funciona até ao envio; confirmar o que aparece depois (BookingSent) e ajustar o mock se for preciso.
   - Correr os scripts a partir de uma pasta temporária fora do repo (escrevem PNG e vídeos na pasta atual).

## O anúncio pedido pelo dono

- Instagram **Stories (1080×1920)** e **Post (1080×1350)**, animados, em **pt-PT**.
- Mostrar o registo real dentro de um **mockup de telemóvel** ("para a melhor sensação"), que é fácil, que o chef fica com página pessoal (montra dos pratos, avaliações) e que o cliente reserva facilmente sem criar conta.
- Criar **FOMO** com verdade: lançamento em Portugal, os primeiros chefs ficam com o selo **Fundador** e destaque. Não inventar números (nada de "só restam 7 vagas").
- Monetização atual: comissão só por serviço garantido, deduzida do sinal. Usar "Só pagas por cada serviço garantido" e "Sem mensalidades". Nunca "100 %" nem "sem comissões".
- Não mencionar zonas, nem o domínio no vídeo; CTA "link na bio".
- Cores da marca: cobalto #1D4AA1, azul escuro #12306E, amarelo #F0B429, tinta #142033, fundo #F3F6FB; letra Schibsted Grotesk; logo "ao lume" com frigideira preta e chama amarela (ver `app/icon.svg` e `stories-anteriores-make.js`, que tem o SVG da frigideira e o estilo das stories anteriores).
- Montagem: HTML animado gravado com Playwright + ffmpeg (como em `stories-anteriores-make.js`), com o vídeo da app dentro da moldura do telemóvel. Entregar MP4 (H.264, 30 fps) + PNG de capa + texto para o anúncio, num zip.
