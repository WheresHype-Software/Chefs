// Monta os anúncios (Story 9:16, Post 4:5, Story curta) com as gravações reais da app dentro de um telemóvel.
// Correr a partir de uma cópia fora do repo (para usar o Playwright global): FOTOS=<repo>/marketing/ad-flow/fotos NODE_PATH=$(npm root -g) node ad-make.js
// Uso (numa pasta temporária com rec/vid-*/ já gravados por rec.js):
//   for w in signup page book; do mkdir -p frames/$w; ffmpeg -i rec/vid-$w/*.webm -vf fps=30 -q:v 2 frames/$w/%05d.jpg; done
//   node ad-make.js [story|post|story-curta ...]
// Escreve out/<nome>.mp4 (H.264, 30 fps) e out/<nome>-capa.png.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const FOTOS = process.env.FOTOS || path.join(__dirname, 'fotos');
const CWD = process.cwd();
const FPS = 30;
const FIRE = 'M5 27.6C3.9 26 4.6 23.4 6.2 21.2C6.6 22.8 7.4 23.8 8.5 24.2C8.4 22 9.4 20.2 11 18.8C12.6 20.2 13.6 22 13.5 24.2C14.6 23.8 15.4 22.8 15.8 21.2C17.4 23.4 18.1 26 17 27.6Q11 28.6 5 27.6Z';
const pan = (w) => `<svg width="${w}" height="${Math.round(w * 28 / 32)}" viewBox="0 0 32 28" style="display:block"><rect x="1.4" y="8.6" width="19.2" height="1.8" rx="0.9" fill="#fff"/><path d="M2.2 10.2h17.6l-1.6 5.4a2.6 2.6 0 0 1-2.5 1.9H6.3a2.6 2.6 0 0 1-2.5-1.9z" fill="#fff"/><path d="M20.2 9.4l10.2-1.5a1.3 1.3 0 0 1 .4 2.6l-10.4 1z" fill="#fff"/><path d="${FIRE}" fill="#f0b429"/></svg>`;
const photo = (n) => 'file://' + path.join(FOTOS, n + '.jpg');
const nFrames = Object.fromEntries(['signup', 'page', 'book'].map((w) => [w, fs.readdirSync(path.join(CWD, 'frames', w)).length]));

// Textos (pt-PT). Cenas: hook, signup, page, book, close.
const TXT = {
  hook: { k: 'PARA CHEFS E COZINHEIROS', t: 'Cozinhas bem?', s: 'Vê como é fácil começar a receber pedidos.' },
  signup: { k: '1 · CRIA A CONTA', t: 'Registo em segundos', s: 'Nome, email, palavra-passe. Pronto.' },
  page: { k: '2 · A TUA PÁGINA', t: 'A tua montra pessoal', s: 'Pratos, menus, avaliações e selos, num link só teu.' },
  book: { k: '3 · O CLIENTE RESERVA', t: 'Sem criar conta', s: 'Escolhe menu, dia e hora. Tu aceitas ou propões outra data.' },
  bookShort: { k: '3 · O CLIENTE RESERVA', t: 'Sem criar conta', s: 'Pedido enviado. Tu decides.' },
};

// Cada variante: formato, cenas [início, fim] e clips da app (segmentos [srcIni, srcFim, duração no anúncio]).
const V = {
  story: {
    fmt: 'story', dur: 20.4,
    sc: { hook: [0, 2.4], signup: [2.4, 7.6], page: [7.6, 10.8], book: [10.8, 16.4], close: [16.4, 20.4] }, bookTxt: 'book',
    clips: [
      { at: 2.4, src: 'signup', segs: [[0.6, 3.6, 1.3], [3.6, 11.6, 3.3]] },
      { at: 7.6, src: 'page', segs: [[0.9, 8.6, 3.2]] },
      { at: 10.8, src: 'book', segs: [[2.6, 9.9, 2.8], [9.9, 15.2, 1.6], [16.8, 18.6, 1.2]] },
    ],
  },
  post: {
    fmt: 'post', dur: 15.2,
    sc: { hook: [0, 1.8], signup: [1.8, 5.6], page: [5.6, 7.9], book: [7.9, 12.0], close: [12.0, 15.2] }, bookTxt: 'book',
    clips: [
      { at: 1.8, src: 'signup', segs: [[0.6, 3.6, 0.9], [3.6, 11.6, 2.4]] },
      { at: 5.6, src: 'page', segs: [[0.9, 8.6, 2.3]] },
      { at: 7.9, src: 'book', segs: [[2.6, 9.9, 2.0], [9.9, 15.2, 1.1], [16.8, 18.2, 0.9]] },
    ],
  },
  'story-curta': {
    fmt: 'story', dur: 8.4,
    sc: { hook: [0, 1.3], signup: [1.3, 3.7], page: [3.7, 4.9], book: [4.9, 6.0], close: [6.0, 8.4] }, bookTxt: 'bookShort',
    clips: [
      { at: 1.3, src: 'signup', segs: [[3.6, 11.6, 2.0]] },
      { at: 3.7, src: 'page', segs: [[0.9, 5.5, 1.2]] },
      { at: 4.9, src: 'book', segs: [[16.8, 18.0, 1.1]] },
    ],
  },
};

// Geometria por formato.
const G = {
  story: { W: 1080, H: 1920, appW: 450, phone: { left: null, top: 619 }, text: 'left:90px;right:90px;bottom:1340px', tk: 30, tt: 78, ts: 38,
    close: { top: 250, bottom: 250, h1: 104, row: 44, btn: 46 } },
  post: { W: 1080, H: 1350, appW: 462, phone: { left: 540, top: 115 }, text: 'left:64px;width:440px;top:0;bottom:0;justify-content:center', tk: 22, tt: 62, ts: 30,
    close: { top: 70, bottom: 70, h1: 88, row: 38, btn: 40 } },
};

function html(v) {
  const g = G[v.fmt]; const isStory = v.fmt === 'story';
  const appH = Math.round(g.appW * 844 / 390), sb = Math.round(g.appW * 0.1), bz = 15;
  const pw = g.appW + bz * 2, ph = appH + sb + bz * 2;
  const pleft = g.phone.left ?? Math.round((g.W - pw) / 2);
  const scenes = ['hook', 'signup', 'page', 'book'].map((n) => {
    const t = TXT[n === 'book' ? v.bookTxt : n];
    return `<div class="tx" id="tx-${n}"><div><span class="k" style="font-size:${g.tk}px">${t.k}</span></div><h1 style="font-size:${g.tt}px">${t.t}</h1><p style="font-size:${g.ts}px">${t.s}</p></div>`;
  }).join('');
  const c = g.close;
  return `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800;900&display=swap" rel="stylesheet"><style>
*{margin:0;box-sizing:border-box}body{width:${g.W}px;height:${g.H}px;overflow:hidden;background:#12306e;color:#fff;font-family:'Schibsted Grotesk',sans-serif;position:relative}
.abs{position:absolute}
#bg{inset:0;background:radial-gradient(120% 70% at 80% 10%,#2a5fc4 0%,rgba(29,74,161,0) 55%),linear-gradient(165deg,#1d4aa1 0%,#12306e 62%,#0d2556 100%)}
.ph{inset:0;width:100%;height:100%;object-fit:cover}
.grad{inset:0}
.tx{position:absolute;${g.text};display:flex;flex-direction:column;gap:${isStory ? 18 : 16}px;opacity:0}
.k{display:inline-block;font-weight:800;letter-spacing:.12em;padding:.42em .85em;border-radius:999px;background:#f0b429;color:#142033}
h1{font-weight:900;letter-spacing:-.035em;line-height:1.04;text-shadow:0 4px 30px rgba(0,0,0,.25)}
.tx p{font-weight:500;line-height:1.28;color:#dbe5f6}
#phone{position:absolute;left:${pleft}px;top:${g.phone.top}px;width:${pw}px;height:${ph}px;border-radius:${Math.round(pw * 0.13)}px;background:#0a0f1c;padding:${bz}px;box-shadow:0 40px 90px rgba(4,12,35,.55),0 0 0 3px #2b3446 inset,0 0 0 1.5px #5a6478;will-change:transform}
#scr{width:100%;height:100%;border-radius:${Math.round(pw * 0.13) - bz}px;overflow:hidden;background:#fff;position:relative}
#sb{height:${sb}px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 ${Math.round(sb * .7)}px ${Math.round(sb * .14)}px;color:#142033;font-weight:700;font-size:${Math.round(sb * .36)}px}
#island{position:absolute;top:${Math.round(sb * .2)}px;left:50%;width:${Math.round(g.appW * .3)}px;height:${Math.round(sb * .52)}px;margin-left:-${Math.round(g.appW * .15)}px;background:#0a0f1c;border-radius:99px}
#app{display:block;width:${g.appW}px;height:${appH}px}
#toast{position:absolute;left:50%;top:${Math.round(ph * .42)}px;transform:translateX(-50%);background:#fff;color:#142033;border-radius:24px;padding:${isStory ? '26px 36px' : '22px 30px'};display:flex;align-items:center;gap:18px;font-size:${isStory ? 40 : 34}px;font-weight:800;white-space:nowrap;box-shadow:0 24px 60px rgba(4,12,35,.45);opacity:0}
#toast i{width:${isStory ? 56 : 48}px;height:${isStory ? 56 : 48}px;border-radius:50%;background:#1d4aa1;color:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:${isStory ? 32 : 28}px}
#demo{position:absolute;right:-12px;top:${Math.round(ph * .1)}px;background:#142033;color:#fff;border:2px solid rgba(255,255,255,.25);font-size:${isStory ? 24 : 20}px;font-weight:700;padding:8px 16px;border-radius:999px;opacity:0}
.hl{background:#f0b429;color:#142033;padding:0 .16em;border-radius:.14em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.row{display:flex;gap:22px;align-items:center;font-size:${c.row}px;font-weight:700;opacity:0}
.row i{flex:none;width:${Math.round(c.row * 1.36)}px;height:${Math.round(c.row * 1.36)}px;border-radius:50%;background:#f0b429;color:#142033;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:${Math.round(c.row * .76)}px;font-weight:900}
.btn{display:inline-block;background:#f0b429;color:#142033;font-size:${c.btn}px;font-weight:800;padding:.62em 1.1em;border-radius:999px}
</style></head><body>
<div id="bg" class="abs"></div>
<div id="hookbg" class="abs" style="inset:0"><img class="abs ph" id="hookimg" src="${photo('f24')}" style="object-position:50% 35%"><div class="abs grad" style="background:linear-gradient(180deg,rgba(18,48,110,.55) 0%,rgba(18,48,110,.25) 30%,rgba(18,48,110,.92) ${isStory ? 72 : 80}%,#12306e 100%)"></div></div>
<div id="logo" class="abs" style="top:${isStory ? 250 : 64}px;left:${isStory ? 90 : 64}px;display:flex;align-items:center;gap:14px;font-size:${isStory ? 44 : 36}px;font-weight:800;letter-spacing:-.03em">${pan(isStory ? 64 : 52)}ao lume</div>
${scenes}
<div id="phone"><div id="scr"><div id="sb"><span>9:41</span><svg height="${Math.round(sb*.32)}" viewBox="0 0 64 22"><rect x="0" y="14" width="5" height="8" rx="1" fill="#142033"/><rect x="8" y="10" width="5" height="12" rx="1" fill="#142033"/><rect x="16" y="6" width="5" height="16" rx="1" fill="#142033"/><rect x="24" y="2" width="5" height="20" rx="1" fill="#142033"/><rect x="36" y="3" width="24" height="17" rx="4" fill="none" stroke="#142033" stroke-width="2"/><rect x="39" y="6" width="17" height="11" rx="2" fill="#142033"/><rect x="61" y="9" width="2.5" height="5" rx="1" fill="#142033"/></svg></div><div id="island"></div><img id="app"></div>
<div id="toast"><i>✓</i>Conta criada</div><div id="demo">Perfil de exemplo</div></div>
<div id="closebg" class="abs" style="inset:0;opacity:0"><img class="abs ph" id="closeimg" src="${photo('f22')}" style="object-position:45% 50%"><div class="abs grad" style="background:linear-gradient(180deg,rgba(18,48,110,.7) 0%,rgba(18,48,110,.15) 24%,rgba(18,48,110,.35) 40%,rgba(18,48,110,.93) 62%,#12306e 100%)"></div></div>
<div id="close" class="abs" style="left:${isStory ? 90 : 64}px;right:${isStory ? 90 : 64}px;top:${c.top}px;bottom:${c.bottom}px;display:flex;flex-direction:column;justify-content:flex-end">
  <div id="c-logo" style="position:absolute;top:0;left:0;display:flex;align-items:center;gap:14px;font-size:${isStory ? 44 : 38}px;font-weight:800;letter-spacing:-.03em;opacity:0">${pan(isStory ? 64 : 54)}ao lume</div>
  <div id="c-k" style="opacity:0"><span class="k" style="font-size:${isStory ? 30 : 24}px">LANÇAMENTO EM PORTUGAL</span></div>
  <h1 id="c-h1" style="margin-top:${isStory ? 28 : 20}px;font-size:${c.h1}px;opacity:0">Os primeiros chefs ficam <span class="hl">Fundadores.</span></h1>
  <div style="margin-top:${isStory ? 40 : 28}px;display:flex;flex-direction:column;gap:${isStory ? 22 : 16}px">
    <div class="row" id="c-r1"><i>★</i>Selo Fundador e destaque</div>
    <div class="row" id="c-r2"><i>✓</i>Sem mensalidades</div>
    <div class="row" id="c-r3"><i>✓</i>Só pagas por cada serviço garantido</div>
  </div>
  <div id="c-btn" style="margin-top:${isStory ? 44 : 32}px;opacity:0"><span class="btn">Cria o teu perfil · link na bio</span></div>
</div>
<script>
const V=${JSON.stringify({ sc: v.sc, clips: v.clips, dur: v.dur })}, N=${JSON.stringify(nFrames)}, ROOT=${JSON.stringify('file://' + CWD + '/frames/')}, STORY=${isStory};
const cl=(x)=>Math.max(0,Math.min(1,x)), eo=(x)=>1-Math.pow(1-cl(x),3), eio=(x)=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
const ramp=(t,a,d)=>eo((t-a)/d);
const $=(id)=>document.getElementById(id);
function frameFor(t){
  let c=null; for(const x of V.clips) if(t>=x.at) c=x;
  if(!c) return ['signup', V.clips[0].segs[0][0]];
  let r=t-c.at; for(const [a,b,d] of c.segs){ if(r<=d) return [c.src, a+(b-a)*(r/d)]; r-=d; }
  const l=c.segs[c.segs.length-1]; return [c.src,l[1]];
}
async function render(t){
  const S=V.sc, [h0,h1]=S.hook, [c0,c1]=S.close;
  // fundo do gancho
  $('hookbg').style.opacity=1-ramp(t,h1-.35,.45);
  $('hookimg').style.transform='scale('+(1.12-.08*cl(t/h1))+')';
  $('logo').style.opacity=ramp(t,.05,.4)*(1-ramp(t,h1-.3,.3));
  // textos das cenas
  for(const n of ['hook','signup','page','book']){
    const [a,b]=S[n], el=$('tx-'+n);
    const i=ramp(t,a+(n==='hook'?.15:.05),.45), o=n==='book'?ramp(t,b-.05,.35):ramp(t,b-.12,.25);
    el.style.opacity=i*(1-o); el.style.transform='translateY('+((1-i)*40-o*30)+'px)';
  }
  // telemóvel: sobe no gancho, sai no fecho
  const pin=eio((t-(h1*.45))/(h1*.55)), pout=eio((t-c0)/.6);
  $('phone').style.transform='translateY('+((1-pin)*(STORY?900:0)+pout*(STORY?700:0))+'px) translateX('+((1-pin)*(STORY?0:640)+pout*(STORY?0:640))+'px) rotate('+((1-pin)*(STORY?6:4))+'deg)';
  $('phone').style.opacity=Math.min(cl((t-h1*.4)/(h1*.3)),1-cl((t-c0-.2)/.4));
  // "Conta criada"
  const [s0,s1]=S.signup, ti=ramp(t,s1-.75,.3), to=ramp(t,s1-.05,.25);
  $('toast').style.opacity=ti*(1-to); $('toast').style.transform='translateX(-50%) scale('+(.7+.3*ti)+')';
  $('demo').style.opacity=ramp(t,S.page[0]+.2,.3)*(1-ramp(t,c0-.1,.3));
  // fecho
  $('closebg').style.opacity=ramp(t,c0,.5); $('closeimg').style.transform='scale('+(1.1-.08*cl((t-c0)/(c1-c0)))+')';
  const st=(id,d)=>{const k=ramp(t,c0+d,.5); $(id).style.opacity=k; $(id).style.transform='translateY('+(1-k)*40+'px)';};
  const fast=(c1-c0)<3.2; const sp=fast?.7:1;
  st('c-logo',.15); st('c-k',.3*sp); st('c-h1',.55*sp); st('c-r1',1.15*sp); st('c-r2',1.45*sp); st('c-r3',1.75*sp); st('c-btn',2.1*sp);
  const pb=t-(c0+2.6*sp); $('c-btn').firstChild.style.transform='scale('+(pb>0?1+.045*Math.sin(pb*Math.PI*1.7)**2:1)+')';
  // imagem da app
  const [src,s]=frameFor(t); const idx=Math.max(1,Math.min(N[src],Math.round(s*30)+1));
  const url=ROOT+src+'/'+String(idx).padStart(5,'0')+'.jpg', img=$('app');
  if(img.dataset.u!==url){ img.dataset.u=url; img.src=url; await img.decode().catch(()=>{}); }
}
</script></body></html>`;
}

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(V);
  fs.mkdirSync(path.join(CWD, 'out'), { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const name of names) {
    const v = V[name], g = G[v.fmt];
    const file = path.join(CWD, `ad-${name}.html`); fs.writeFileSync(file, html(v));
    const p = await b.newPage({ viewport: { width: g.W, height: g.H } });
    await p.goto('file://' + file, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    const dir = path.join(CWD, 'adframes', name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const total = Math.round(v.dur * FPS);
    for (let f = 0; f < total; f++) {
      await p.evaluate((t) => render(t), f / FPS);
      await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    }
    // capa: fecho já completo
    await p.evaluate((t) => render(t), v.sc.close[1] - 0.5);
    await p.screenshot({ path: path.join(CWD, 'out', `${name}-capa.png`) });
    execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${dir}/%04d.jpg -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -r ${FPS} -movflags +faststart ${path.join(CWD, 'out', name + '.mp4')}`);
    console.log('ok', name, total, 'frames');
    await p.close();
  }
  await b.close();
})();
