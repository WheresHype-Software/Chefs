const { chromium } = require('playwright');
const fs = require('fs'); const { execSync } = require('child_process');
const FOTOS = '../mes/fotos/';
const FIRE = 'M5 27.6C3.9 26 4.6 23.4 6.2 21.2C6.6 22.8 7.4 23.8 8.5 24.2C8.4 22 9.4 20.2 11 18.8C12.6 20.2 13.6 22 13.5 24.2C14.6 23.8 15.4 22.8 15.8 21.2C17.4 23.4 18.1 26 17 27.6Q11 28.6 5 27.6Z';
const pan = (w) => `<svg width="${w}" height="${Math.round(w * 28 / 32)}" viewBox="0 0 32 28" style="display:block"><rect x="1.4" y="8.6" width="19.2" height="1.8" rx="0.9" fill="#fff"/><path d="M2.2 10.2h17.6l-1.6 5.4a2.6 2.6 0 0 1-2.5 1.9H6.3a2.6 2.6 0 0 1-2.5-1.9z" fill="#fff"/><path d="M20.2 9.4l10.2-1.5a1.3 1.3 0 0 1 .4 2.6l-10.4 1z" fill="#fff"/><path d="${FIRE}" fill="#f0b429"/></svg>`;
const img = n => `data:image/jpeg;base64,${fs.readFileSync(FOTOS + 'f' + n + '.jpg').toString('base64')}`;
const DUR = 9;
// a = appear at second s
const a = (s, extra = '') => `style="opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) ${s}s forwards;${extra}"`;
const page = (photo, pos, body) => `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800;900&display=swap" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;overflow:hidden;background:#12306e;color:#fff;font-family:'Schibsted Grotesk',sans-serif;position:relative}
@keyframes kb{from{transform:scale(1.12)}to{transform:scale(1.0)}}
@keyframes up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
@keyframes out{to{opacity:0;transform:translateY(-30px)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.hl{background:#f0b429;color:#142033;padding:0 14px;border-radius:14px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
h1{font-weight:900;letter-spacing:-.035em;line-height:1.06;text-shadow:0 4px 30px rgba(0,0,0,.3)}
.k{display:inline-block;font-size:30px;font-weight:800;letter-spacing:.12em;padding:13px 26px;border-radius:999px;background:#f0b429;color:#142033}
.row{display:flex;gap:22px;align-items:center;font-size:44px;font-weight:700}
.row i{flex:none;width:60px;height:60px;border-radius:50%;background:#f0b429;color:#142033;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:34px;font-weight:900}
.btn{display:inline-block;background:#f0b429;color:#142033;font-size:46px;font-weight:800;padding:30px 50px;border-radius:999px}
</style></head><body>
<img src="${photo}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${pos};animation:kb ${DUR}s linear forwards">
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,48,110,.65) 0%,rgba(18,48,110,.05) 22%,rgba(18,48,110,.15) 40%,rgba(18,48,110,.9) 66%,#12306e 100%)"></div>
<div style="position:absolute;top:250px;left:90px;right:90px;display:flex;align-items:center;gap:14px;font-size:44px;font-weight:800;letter-spacing:-.03em;opacity:0;animation:up .6s .1s forwards">${pan(64)}ao lume</div>
<div style="position:absolute;left:90px;right:90px;bottom:360px">${body}</div>
</body></html>`;

const STORIES = {
  'story-1-fast-food': page(img(12), '50% 40%', `
    <div ${a(0.4)}><span class="k">PARA QUEM TEM FOME</span></div>
    <h1 style="margin-top:30px;font-size:118px"><span ${a(0.8, 'display:inline-block')}>Farto de</span> <span ${a(1.2, 'display:inline-block')}>fast food?</span></h1>
    <h1 style="margin-top:18px;font-size:100px;opacity:0;animation:pop .7s 2.4s forwards"><span class="hl">Há quem cozinhe para ti.</span></h1>
    <p style="margin-top:30px;font-size:42px;line-height:1.3;font-weight:500;color:#e4ecf8;opacity:0;animation:up .7s 3.6s forwards">Em tua casa, em marmitas ou para ir buscar. Pedes sem criar conta.</p>
    <div style="margin-top:44px;opacity:0;animation:pop .6s 5s forwards"><span class="btn" style="animation:pulse 1.2s 6s infinite">Ver cozinheiros · link na bio</span></div>`),
  'story-2-chefs': page(img(24), '50% 35%', `
    <div ${a(0.4)}><span class="k">PARA CHEFS E COZINHEIROS</span></div>
    <h1 style="margin-top:30px;font-size:110px;opacity:0;animation:up .7s .8s forwards">Cozinhas bem?</h1>
    <h1 style="margin-top:14px;font-size:96px;opacity:0;animation:pop .7s 1.8s forwards"><span class="hl">Só pagas por cada serviço garantido.</span></h1>
    <div style="margin-top:40px;display:flex;flex-direction:column;gap:22px">
      <div class="row" ${a(3.2)}><i>✓</i>Página montra com os teus pratos</div>
      <div class="row" ${a(3.8)}><i>✓</i>Pedidos e agenda organizados</div>
      <div class="row" ${a(4.4)}><i>✓</i>Sem mensalidades</div>
    </div>
    <div style="margin-top:44px;opacity:0;animation:pop .6s 5.6s forwards"><span class="btn" style="animation:pulse 1.2s 6.6s infinite">Criar perfil · link na bio</span></div>`),
  'story-3-fundadores': page(img(22), '45% 50%', `
    <div ${a(0.4)}><span class="k">VAGAS LIMITADAS</span></div>
    <h1 style="margin-top:30px;font-size:104px;opacity:0;animation:up .7s .8s forwards">Procuramos os primeiros</h1>
    <h1 style="margin-top:14px;font-size:124px;opacity:0;animation:pop .8s 1.8s forwards"><span class="hl">Fundadores.</span></h1>
    <p style="margin-top:30px;font-size:42px;line-height:1.3;font-weight:500;color:#e4ecf8;opacity:0;animation:up .7s 3s forwards">Chefs, pastelaria, salgados, marmitas: se cozinhas bem, há lugar para ti.</p>
    <div style="margin-top:34px;display:flex;flex-direction:column;gap:22px">
      <div class="row" ${a(4)}><i>★</i>Selo de Fundador no perfil</div>
      <div class="row" ${a(4.6)}><i>★</i>Destaque na plataforma</div>
    </div>
    <div style="margin-top:44px;opacity:0;animation:pop .6s 5.8s forwards"><span class="btn" style="animation:pulse 1.2s 6.8s infinite">Quero ser Fundador · link na bio</span></div>`),
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const FPS = 30;
  for (const [name, html] of Object.entries(STORIES)) {
    fs.rmSync('frames', { recursive: true, force: true }); fs.mkdirSync('frames');
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => document.getAnimations().forEach(x => x.pause()));
    for (let f = 0; f < DUR * FPS; f++) {
      await p.evaluate(t => document.getAnimations().forEach(x => { x.currentTime = t; }), f * 1000 / FPS);
      await p.screenshot({ path: `frames/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
    }
    execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i frames/%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart ${name}.mp4`);
    execSync(`ffmpeg -loglevel error -y -ss 7.5 -i ${name}.mp4 -frames:v 1 ${name}-final.png`);
    console.log('ok', name);
  }
  await b.close();
})();
