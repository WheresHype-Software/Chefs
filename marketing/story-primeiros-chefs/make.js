// Story animada "Os primeiros chefs já estão no mapa" (1080×1920, 30 fps, 15 s).
// Uso: node make.js   (recortes em ./recortes, feitos a partir de procurar-primeiros-chefs.webp)
const { chromium } = require('playwright');
const fs = require('fs'); const { execSync } = require('child_process');
process.chdir(__dirname);

const FIRE = 'M5 27.6C3.9 26 4.6 23.4 6.2 21.2C6.6 22.8 7.4 23.8 8.5 24.2C8.4 22 9.4 20.2 11 18.8C12.6 20.2 13.6 22 13.5 24.2C14.6 23.8 15.4 22.8 15.8 21.2C17.4 23.4 18.1 26 17 27.6Q11 28.6 5 27.6Z';
const pan = (w, c = '#fff') => `<svg width="${w}" height="${Math.round(w * 28 / 32)}" viewBox="0 0 32 28" style="display:block"><rect x="1.4" y="8.6" width="19.2" height="1.8" rx="0.9" fill="${c}"/><path d="M2.2 10.2h17.6l-1.6 5.4a2.6 2.6 0 0 1-2.5 1.9H6.3a2.6 2.6 0 0 1-2.5-1.9z" fill="${c}"/><path d="M20.2 9.4l10.2-1.5a1.3 1.3 0 0 1 .4 2.6l-10.4 1z" fill="${c}"/><path d="${FIRE}" fill="#f0b429"/></svg>`;
const img = n => `data:image/png;base64,${fs.readFileSync(`recortes/${n}.png`).toString('base64')}`;
const DUR = 15, FPS = 30;
const A = (name, dur, delay, ease = 'cubic-bezier(.2,.8,.2,1)') => `opacity:0;animation:${name} ${dur}s ${ease} ${delay}s forwards;`;

// Ecrã mobile: telemóvel em (335, 560), ecrã 640 px; mapa = recorte da captura (x 1090..1679, y 17..1107) a 640/589.
const PH = { x: 335, y: 560 }, SX = PH.x + 20, SY = PH.y + 20, HEAD = 84, S = 640 / 589;
const MX = SX, MY = SY + HEAD;
const P = (sx, sy) => [Math.round(MX + (sx - 1090) * S), Math.round(MY + (sy - 17) * S)];
const CHEFS = [ // pins reais da captura
  { p: P(1337, 207), nome: 'Beatriz Beato', papel: 'Cozinheira · À Moda da Bea' },
  { p: P(1251, 441), nome: 'Flávio Fukumura', papel: 'Chef · cozinha japonesa' },
  { p: P(1253, 554), nome: 'Victor Hugo Munhoz', papel: 'Chef · fusão' },
  { p: P(1328, 627), nome: 'Ana Batista', papel: 'Chef · cozinha caseira' },
];
const VAZIOS = [P(1420, 330), P(1545, 560), P(1420, 715)]; // lugares livres
const TU = P(1480, 197);

const ring = ([x, y], d) => `<div class="ring" style="left:${x}px;top:${y}px;animation:ring 1.8s ease-out ${d}s infinite"></div>`;
const label = (c, i) => `<div class="lab" style="right:${1080 - c.p[0] + 50}px;top:${c.p[1] - 38}px;${A('slide', .55, 2.0 + i * 0.45)}">
  <b>${c.nome}</b><span>${c.papel}</span></div>`;
const ghost = ([x, y], i) => `<div class="ghost" style="left:${x - 40}px;top:${y - 40}px;${A('drop', .6, 5.3 + i * 0.3)}">?</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800;900&display=swap" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;color:#fff;font-family:'Schibsted Grotesk',sans-serif;position:relative;
  background:radial-gradient(1100px 800px at 90% 0%,#1d4aa1 0%,rgba(29,74,161,0) 70%),#12306e}
@keyframes up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes rise{from{opacity:0;transform:translateY(260px)}to{opacity:1;transform:none}}
@keyframes sheet{from{opacity:1;transform:translateY(1100px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:none}}
@keyframes slide{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes drop{0%{opacity:0;transform:translateY(-90px)}60%{opacity:1;transform:translateY(8px)}100%{opacity:1;transform:none}}
@keyframes out{from{opacity:1}to{opacity:0;transform:translateY(-40px)}}
@keyframes dim{to{opacity:.35}}
@keyframes ring{0%{transform:translate(-50%,-50%) scale(.9);opacity:.9}100%{transform:translate(-50%,-50%) scale(2.1);opacity:0}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
h1{font-weight:900;letter-spacing:-.035em;line-height:1.05}
.hl{background:#f0b429;color:#142033;padding:0 12px;border-radius:12px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.phone{position:absolute;left:${PH.x}px;top:${PH.y}px;width:680px;height:1330px;background:#0b1630;border-radius:76px;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 0 0 3px #2b3d63}
.screen{position:relative;width:640px;height:1290px;border-radius:58px;overflow:hidden;background:#eef0ee}
.head{height:${HEAD}px;background:#fff;display:flex;align-items:center;padding:0 26px 0 30px;gap:12px;color:#142033;font-size:34px;font-weight:800;letter-spacing:-.03em;border-bottom:1px solid #e3e8f0}
.entrar{margin-left:auto;background:#1d4aa1;color:#fff;font-size:24px;font-weight:700;letter-spacing:0;padding:13px 24px;border-radius:12px}
.burger{width:34px;margin-left:18px;display:flex;flex-direction:column;gap:6px}.burger i{height:4px;border-radius:2px;background:#142033}
.island{position:absolute;left:50%;top:14px;width:150px;height:40px;margin-left:-75px;border-radius:20px;background:#0b1630}
.mapa img{width:640px;display:block}
.verlista{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);background:#1d4aa1;color:#fff;font-size:28px;font-weight:700;padding:22px 40px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.ring{position:absolute;width:84px;height:84px;border-radius:50%;border:5px solid #f0b429;opacity:0}
.lab{position:absolute;background:#fff;color:#142033;border-radius:22px;padding:9px 20px 10px 22px;box-shadow:0 12px 34px rgba(0,0,0,.35);white-space:nowrap;text-align:right}
.lab.na:after{display:none}
.lab:after{content:'';position:absolute;right:-12px;top:50%;margin-top:-12px;border:12px solid transparent;border-right:0;border-left-color:#fff}
.lab b{display:block;font-size:30px;font-weight:800;letter-spacing:-.02em}
.lab span{display:block;font-size:22px;font-weight:600;color:#1d4aa1;margin-top:2px}
.ghost{position:absolute;width:80px;height:80px;border-radius:50%;border:5px dashed #1d4aa1;background:rgba(255,255,255,.85);color:#1d4aa1;font-size:44px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.2)}
.tu{position:absolute;width:118px;height:118px;border-radius:50%;background:#f0b429;color:#142033;border:6px solid #fff;font-size:44px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,.4)}
.selo{display:inline-flex;align-items:center;gap:10px;background:#f0b429;color:#142033;font-size:28px;font-weight:800;letter-spacing:.08em;padding:11px 22px;border-radius:999px}
.row{display:flex;gap:22px;align-items:center;font-size:42px;font-weight:700}
.row i{flex:none;width:58px;height:58px;border-radius:50%;background:#f0b429;color:#142033;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:32px;font-weight:900}
.btn{display:inline-block;background:#f0b429;color:#142033;font-size:48px;font-weight:800;padding:32px 54px;border-radius:999px;box-shadow:0 14px 40px rgba(0,0,0,.3)}
</style></head><body>

<!-- mapa real com os pins dos primeiros chefs -->
<div class="phone" style="${A('rise', .9, .25)}"><div class="screen">
  <div class="head">${pan(46, '#142033')}ao lume<span class="entrar">Entrar</span><span class="burger"><i></i><i></i><i></i></span></div>
  <div class="mapa"><img src="${img('mapa')}"></div>
  <div class="verlista">Ver lista</div>
</div></div>
<div style="position:absolute;inset:0;animation:dim .5s 8.4s forwards">
  ${CHEFS.map((c, i) => ring(c.p, 1.1 + i * 0.2)).join('')}
  ${CHEFS.map(label).join('')}
</div>
${VAZIOS.map(ghost).join('')}
<div class="tu" style="left:${TU[0] - 59}px;top:${TU[1] - 59}px;${A('drop', .7, 6.4)}">Tu?</div>
<div class="ring" style="left:${TU[0]}px;top:${TU[1]}px;width:118px;height:118px;animation:ring 1.4s ease-out 7.1s infinite"></div>
<div class="lab na" style="left:${TU[0] - 130}px;top:${TU[1] - 160}px;text-align:left;${A('pop', .5, 7.0)}"><b>O teu lugar</b><span>★ Selo Fundador</span></div>

<!-- topo -->
<div style="position:absolute;top:250px;left:80px;display:flex;align-items:center;gap:14px;font-size:44px;font-weight:800;letter-spacing:-.03em;${A('up', .5, .05)}">${pan(64)}ao lume</div>
<div style="position:absolute;left:80px;right:60px;top:345px;animation:out .4s ease-in 4.7s forwards">
  <h1 style="font-size:88px;${A('up', .6, .15)}">Os primeiros chefs já estão <span class="hl">no mapa.</span></h1>
</div>
<div style="position:absolute;left:80px;right:60px;top:345px">
  <h1 style="font-size:88px;${A('up', .6, 4.95)}">O próximo pin pode <span class="hl">ser o teu.</span></h1>
</div>

<!-- folha final: fundadores + CTA -->
<div style="position:absolute;left:0;right:0;top:930px;bottom:0;background:#12306e;border-radius:48px 48px 0 0;box-shadow:0 -20px 60px rgba(0,0,0,.45);padding:56px 80px 0;opacity:0;animation:sheet .8s cubic-bezier(.2,.8,.2,1) 8.5s forwards">
  <div style="${A('up', .5, 9.0)}"><span class="selo">★ FUNDADOR</span></div>
  <h1 style="margin-top:24px;font-size:68px;${A('up', .6, 9.2)}">Os primeiros ficam com o selo e destaque.</h1>
  <div style="margin-top:36px;display:flex;flex-direction:column;gap:22px">
    <div class="row" style="${A('up', .5, 9.8)}"><i>✓</i>Só pagas por cada serviço garantido</div>
    <div class="row" style="${A('up', .5, 10.2)}"><i>✓</i>Sem mensalidades</div>
  </div>
  <p style="margin-top:30px;font-size:35px;line-height:1.3;font-weight:500;color:#dbe5f5;${A('up', .5, 10.6)}">Chefs, pastelaria, salgados, marmitas: se cozinhas bem, há lugar para ti.</p>
  <div style="margin-top:38px;${A('pop', .6, 11.2)}"><span class="btn" style="animation:pulse 1.3s ease-in-out 11.9s infinite">Cria a tua página · link na bio</span></div>
</div>
</body></html>`;

(async () => {
  fs.mkdirSync('saida', { recursive: true });
  fs.writeFileSync('saida/story.html', html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  if (!await p.evaluate(() => document.fonts.check("900 50px 'Schibsted Grotesk'"))) throw new Error('Letra não carregou');
  await p.evaluate(() => document.getAnimations().forEach(x => x.pause()));
  const seek = t => p.evaluate(t => document.getAnimations().forEach(x => { x.currentTime = t; }), t);
  if (process.env.PREVIEW) { // só alguns frames para rever
    for (const t of process.env.PREVIEW.split(',')) { await seek(+t * 1000); await p.screenshot({ path: `${process.env.FRAMES}/t${t}.png` }); }
    return b.close();
  }
  const tmp = process.env.FRAMES || 'frames';
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  for (let f = 0; f < DUR * FPS; f++) { await seek(f * 1000 / FPS); await p.screenshot({ path: `${tmp}/${String(f).padStart(4, '0')}.png` }); }
  await seek(7800); await p.screenshot({ path: 'saida/story-primeiros-chefs-capa.png' });
  await b.close();
  execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${tmp}/%04d.png -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 17 -preset slow -movflags +faststart saida/story-primeiros-chefs.mp4`);
  console.log('ok');
})();
