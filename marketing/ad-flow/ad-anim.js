// Anúncios animados (Story 9:16, Post 4:5, Story curta) com os ecrãs da app RECRIADOS em HTML dentro de um telemóvel:
// registo de chef → página pública → cliente reserva sem conta → fecho Fundador. Mesmos textos e estilo da app, letra maior.
// Correr fora do repo (Playwright global): FOTOS=<repo>/marketing/ad-flow/fotos NODE_PATH=$(npm root -g) node ad-anim.js [story|post|story-curta]
// Escreve out/<nome>.mp4 (H.264, 30 fps) e out/<nome>-capa.png na pasta atual.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const FOTOS = process.env.FOTOS || path.join(__dirname, 'fotos');
const CWD = process.cwd();
const FPS = 30;
const FIRE = 'M5 27.6C3.9 26 4.6 23.4 6.2 21.2C6.6 22.8 7.4 23.8 8.5 24.2C8.4 22 9.4 20.2 11 18.8C12.6 20.2 13.6 22 13.5 24.2C14.6 23.8 15.4 22.8 15.8 21.2C17.4 23.4 18.1 26 17 27.6Q11 28.6 5 27.6Z';
const pan = (w, c = '#fff') => `<svg width="${w}" height="${Math.round(w * 28 / 32)}" viewBox="0 0 32 28" style="display:block;flex:none"><rect x="1.4" y="8.6" width="19.2" height="1.8" rx="0.9" fill="${c}"/><path d="M2.2 10.2h17.6l-1.6 5.4a2.6 2.6 0 0 1-2.5 1.9H6.3a2.6 2.6 0 0 1-2.5-1.9z" fill="${c}"/><path d="M20.2 9.4l10.2-1.5a1.3 1.3 0 0 1 .4 2.6l-10.4 1z" fill="${c}"/><path d="${FIRE}" fill="#f0b429"/></svg>`;
const photo = (n) => 'file://' + path.join(FOTOS, n + '.jpg');

const TXT = {
  hook: { k: 'PARA CHEFS E COZINHEIROS', t: 'Cozinhas bem?', s: 'Vê como é fácil começar a receber pedidos.' },
  signup: { k: '1 · CRIA A CONTA', t: 'Registo em segundos', s: 'Nome, email, palavra-passe. Pronto.' },
  page: { k: '2 · A TUA PÁGINA', t: 'A tua montra pessoal', s: 'Pratos, menus, avaliações e selos, num link só teu.' },
  book: { k: '3 · O CLIENTE RESERVA', t: 'Sem criar conta', s: 'Escolhe menu, dia e hora. Tu aceitas ou propões outra data.' },
  bookShort: { k: '3 · O CLIENTE RESERVA', t: 'Sem criar conta', s: 'Pedido enviado. Tu decides.' },
};

// sc: cenas [início, fim]; loc: tempo interno de cada ecrã [desvio, duração nominal] (5.0 / 3.2 / 5.4 = velocidade normal).
const V = {
  story: { fmt: 'story', dur: 20.6, bookTxt: 'book',
    sc: { hook: [0, 2.0], signup: [2.0, 6.4], page: [6.4, 9.0], book: [9.0, 13.6], bn: [13.6, 17.0], close: [17.0, 20.6] },
    loc: { signup: [0, 5.0], page: [0, 3.2], book: [0, 5.4] } },
  post: { fmt: 'post', dur: 16.2, bookTxt: 'book',
    sc: { hook: [0, 1.6], signup: [1.6, 4.8], page: [4.8, 6.8], book: [6.8, 10.2], bn: [10.2, 13.2], close: [13.2, 16.2] },
    loc: { signup: [0, 5.0], page: [0, 3.2], book: [0, 5.4] } },
  'story-curta': { fmt: 'story', dur: 8.6, bookTxt: 'bookShort',
    sc: { hook: [0, 1.2], signup: [1.2, 3.3], page: [1e9, 1e9 + 1], book: [1e9 + 1, 1e9 + 2], bn: [3.3, 6.0], close: [6.0, 8.6] },
    loc: { signup: [0.7, 4.3], page: [0, 3.2], book: [0, 5.4] } },
};

const G = {
  story: { W: 1080, H: 1920, appW: 450, phone: { left: null, top: 619 }, text: 'left:90px;right:90px;bottom:1340px', tk: 30, tt: 78, ts: 38,
    close: { top: 250, bottom: 250, h1: 104, row: 44, btn: 46 }, bn: { top: 250, h1: 92, ic: 112, bt: 52, bs: 34, gap: 48 } },
  post: { W: 1080, H: 1350, appW: 462, phone: { left: 540, top: 115 }, text: 'left:64px;width:440px;top:0;bottom:0;justify-content:center', tk: 22, tt: 62, ts: 30,
    close: { top: 70, bottom: 70, h1: 88, row: 38, btn: 40 }, bn: { top: 60, h1: 72, ic: 80, bt: 40, bs: 28, gap: 30 } },
};
const ICON = {
  mag: '<svg viewBox="0 0 40 40" fill="none" stroke="#142033" stroke-width="3.4" stroke-linecap="round"><path d="M20 6a10 10 0 0 1 10 10c0 8-10 18-10 18S10 24 10 16A10 10 0 0 1 20 6z"/><circle cx="20" cy="16" r="3.6"/></svg>',
  cal: '<svg viewBox="0 0 40 40" fill="none" stroke="#142033" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="9" width="26" height="24" rx="4"/><path d="M7 16h26M14 5v7M26 5v7M14 24l4 4 8-8"/></svg>',
  plate: '<svg viewBox="0 0 40 40" fill="none" stroke="#142033" stroke-width="3.4" stroke-linecap="round"><circle cx="20" cy="21" r="12"/><circle cx="20" cy="21" r="6"/><path d="M5 6v9M5 15v19M35 6c-3 2-3 8 0 10v18"/></svg>',
  star: '<svg viewBox="0 0 40 40"><path d="M20 5l4.6 9.6 10.4 1.4-7.6 7.3 1.9 10.4L20 28.6l-9.3 5.1 1.9-10.4L5 16l10.4-1.4z" fill="#142033"/></svg>',
};
const BEN = [
  ['mag', 'Captar clientes', 'Clientes perto de ti encontram-te, mesmo sem saberem o teu nome.'],
  ['cal', 'Gerir reservas', 'Pedidos, agenda e conversa com o cliente num só sítio.'],
  ['plate', 'Perfil com os teus pratos', 'Fotos, menus e preços. Um link para a bio.'],
  ['star', 'Avaliações verificadas', 'Só quem reservou avalia. E tu podes responder.'],
];

// Ecrãs da app (espaço de desenho 360 × 779, escalado para o ecrã do telemóvel).
const APP = () => `
<div class="scr" id="sg">
  ${HD()}
  <div style="padding:22px 20px 0">
    <h2 class="t2">Criar conta</h2>
    <p class="mu" style="margin-top:6px">Para quem quer comer bem e para quem cozinha.</p>
  </div>
  <div id="sg-choose" class="pane">
    <div class="lb" style="margin-bottom:12px">Como vais usar o Ao Lume?</div>
    <div class="card" id="sg-c1"><div class="ic"><svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#1d4aa1" stroke-width="2"><circle cx="13" cy="13" r="10"/><circle cx="13" cy="13" r="5.5"/></svg></div><div><b>Quero reservar</b><span>Encontrar chefs e pedir jantares, marmitas ou bolos.</span></div><em>→</em></div>
    <div class="card dk" id="sg-c2"><div class="ic">${pan(30)}</div><div><b>Quero cozinhar</b><span>Criar a minha página de chef e receber pedidos de clientes.</span></div><em>→</em></div>
  </div>
  <div id="sg-form" class="pane">
    <div class="chipdk">Conta de chef: para cozinhar e receber pedidos</div>
    <div class="fld"><div class="lb">Nome</div><div class="in" id="sg-in1"><span></span></div></div>
    <div class="fld"><div class="lb">Email</div><div class="in" id="sg-in2"><span></span></div></div>
    <div class="fld"><div class="lb">Palavra-passe</div><div class="in" id="sg-in3"><span></span></div></div>
    <div class="chkrow"><div class="chk" id="sg-chk">✓</div><div>Li e aceito os Termos e condições</div></div>
    <div class="btnp" id="sg-go">Criar conta de chef</div>
  </div>
</div>
<div class="scr" id="pg">
  ${HD()}
  <div id="pg-vp" style="position:absolute;top:56px;left:0;right:0;bottom:0;overflow:hidden">
   <div id="pg-sc">
    <div style="margin:14px 14px 0;height:200px;border-radius:16px;overflow:hidden"><img id="pg-cover" src="${photo('f10')}" style="width:100%;height:100%;object-fit:cover;object-position:50% 40%"></div>
    <div style="padding:0 20px">
      <div id="pg-av" class="av"><div style="width:100%;height:100%;background:url(${photo('f16')}) 78% 6%/190% auto no-repeat"></div></div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <span class="chip cb" id="pg-ch1">✓ Identidade verificada</span><span class="chip yl" id="pg-ch2">★ Fundador</span>
      </div>
      <h2 class="t2" style="margin-top:12px">Chef Marta Figueiredo</h2>
      <p class="mu" style="font-size:17px;margin-top:4px">Cozinha portuguesa de autor</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px">
        <img class="gi" src="${photo('f13')}"><img class="gi" src="${photo('f30')}"><img class="gi" src="${photo('f26')}">
      </div>
      <div class="lb" id="pg-menus" style="margin-top:24px;font-size:19px">Menus e preços</div>
      <div class="mcard"><b>Jantar de autor em casa</b><span>Menu de 4 momentos, na tua cozinha.</span><i>45 € / pessoa</i></div>
      <div class="mcard"><b>Marmitas da semana</b><span>5 refeições caseiras, prontas a aquecer.</span><i>40 € / pack</i></div>
      <div class="mcard"><b>Festa ou evento</b><span>Para aniversários e celebrações.</span><i>Sob orçamento</i></div>
      <div class="mcard" style="background:#fff8e6;border-color:#f6dc97"><span style="color:#b07b00;font-size:16px;letter-spacing:2px">★★★★★</span><b style="font-weight:600;margin-top:4px">“Os convidados ainda falam do bacalhau!”</b><span>Sofia R.</span></div>
      <div style="height:120px"></div>
    </div>
   </div>
  </div>
  <div class="bar"><div><b style="font-size:19px">desde 40 €</b></div><div class="btnp sm" id="pg-go">Pedir reserva</div></div>
</div>
<div class="scr" id="bk" style="background:transparent">
  <div id="bk-dim" style="position:absolute;inset:0;background:rgba(20,32,51,.45)"></div>
  <div id="bk-sh">
   <div id="bk-sc" style="padding:22px 20px 40px">
    <h2 class="t2" style="font-size:26px">Pedir reserva</h2>
    <div style="display:flex;gap:14px;margin-top:8px;color:#1d4aa1;font-size:15px;font-weight:600"><span>✓ Sem criar conta</span><span>✓ Não paga ao pedir</span></div>
    <div class="step"><i>1</i>Menu</div>
    <div class="opt" id="bk-o1"><div class="rd"></div><div><b>Jantar de autor em casa</b><span>Em sua casa</span></div><em>45 €</em></div>
    <div class="opt" id="bk-o2"><div class="rd"></div><div><b>Marmitas da semana</b><span>Levantamento</span></div><em>40 €</em></div>
    <div class="step"><i>2</i>Dia <span style="margin-left:auto;font-size:15px;font-weight:600;color:#5b6678">novembro 2026</span></div>
    <div class="cal">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d) => `<u>${d}</u>`).join('')}${[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((d) => `<div id="bk-d${d}" class="${[13, 15, 16, 18, 19, 21, 22].includes(d) ? 'av2' : d === 14 ? 'bkd' : ''}">${d}</div>`).join('')}</div>
    <div class="step"><i>3</i>Hora</div>
    <div style="display:flex;gap:10px"><div class="hc" id="bk-h12">12:00</div><div class="hc">18:00</div></div>
    <div class="step" id="bk-dados"><i>4</i>Os seus dados</div>
    <div class="fld"><div class="lb">Nome</div><div class="in" id="bk-n"><span></span></div></div>
    <div class="fld"><div class="lb">Telemóvel</div><div class="in" id="bk-p"><span></span></div></div>
    <div class="btnp" id="bk-go" style="margin-top:18px">Pedir reserva</div>
    <p class="mu" style="text-align:center;font-size:14px;margin-top:10px">Ainda não paga nada · só depois de o chef aceitar</p>
   </div>
   <div id="bk-sent">
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle id="bk-c1" cx="32" cy="32" r="30" stroke="#1d4aa1" stroke-width="2.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path id="bk-c2" d="M20 33l8 8 16-18" stroke="#1d4aa1" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
    <h2 class="t2 st" style="font-size:31px;margin-top:16px">Pedido enviado a Chef Marta</h2>
    <p class="mu st" style="margin-top:10px;font-size:17px">Chef Marta tem 48 horas para aceitar, recusar ou propor outra data. Ainda não paga nada.</p>
    <div class="st" style="margin-top:18px">
      <div class="dl"><span>Menu</span><b>Marmitas da semana</b></div>
      <div class="dl"><span>Quando</span><b>domingo, 15 nov. · 12:00</b></div>
      <div class="dl"><span>Pedido</span><b>AL-7K3Q</b></div>
    </div>
   </div>
  </div>
</div>
<div id="tap"></div>`;
const HD = () => `<div class="hd"><div style="display:flex;align-items:center;gap:7px;font-size:23px;font-weight:800;letter-spacing:-.03em">${pan(30, '#142033')}ao lume</div><div style="display:flex;flex-direction:column;gap:4px"><i></i><i></i><i></i></div></div>`;

const APPCSS = `
#app{position:absolute;left:0;width:360px;transform-origin:0 0;font-family:'Schibsted Grotesk',sans-serif;color:#142033;overflow:hidden}
.scr{position:absolute;inset:0;background:#f3f6fb;overflow:hidden}
.hd{height:56px;background:#fff;border-bottom:1px solid #e3e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 18px}
.hd i{display:block;width:22px;height:2.5px;background:#142033;border-radius:2px}
.t2{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.08}
.mu{color:#5b6678;font-size:16px;line-height:1.4;font-weight:500}
.lb{font-size:15px;font-weight:700;color:#33405a}
.pane{position:absolute;left:20px;right:20px;top:176px}
.card{display:flex;gap:12px;align-items:center;background:#fff;border:1.5px solid #dde4ef;border-radius:16px;padding:16px;margin-bottom:12px}
.card b{display:block;font-size:19px;font-weight:800}.card span{display:block;font-size:14.5px;color:#5b6678;line-height:1.35;margin-top:3px}
.card em{font-style:normal;font-size:22px;color:#1d4aa1;margin-left:auto}
.card .ic{flex:none;width:48px;height:48px;border-radius:12px;background:#e8eef9;display:flex;align-items:center;justify-content:center;font-size:24px}
.card.dk{background:#142033;border-color:#142033;color:#fff}.card.dk span{color:#c5cfe0}.card.dk em{color:#f0b429}.card.dk .ic{background:#2a3a57}
.chipdk{background:#142033;color:#fff;border-radius:12px;padding:12px 14px;font-size:14.5px;font-weight:600;margin-bottom:14px}
.fld{margin-top:12px}.fld .lb{margin-bottom:6px}
.in{height:52px;border:1.5px solid #d5dce8;border-radius:11px;background:#fff;padding:0 14px;font-size:18px;display:flex;align-items:center;white-space:nowrap;overflow:hidden}
.in.f{border-color:#1d4aa1;box-shadow:0 0 0 3px rgba(29,74,161,.16)}
.in.f span::after{content:'';display:inline-block;width:2px;height:22px;background:#1d4aa1;margin-left:1px;vertical-align:-4px;opacity:var(--cb,1)}
.chkrow{display:flex;gap:10px;align-items:center;margin-top:16px;font-size:15px;color:#33405a}
.chk{flex:none;width:26px;height:26px;border-radius:7px;border:2px solid #b9c3d4;background:#fff;color:transparent;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900}
.chk.on{background:#1d4aa1;border-color:#1d4aa1;color:#fff}
.btnp{height:56px;border-radius:12px;background:#1d4aa1;color:#fff;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:16px}
.btnp.sm{height:50px;margin:0;padding:0 22px;font-size:17px}
.av{width:96px;height:96px;border-radius:22px;border:4px solid #fff;overflow:hidden;margin-top:-48px;position:relative;box-shadow:0 8px 24px rgba(20,32,51,.18);background:#ddd}
.chip{font-size:14.5px;font-weight:700;padding:7px 12px;border-radius:999px}
.chip.cb{background:#1d4aa1;color:#fff}.chip.yl{background:#f0b429;color:#142033}
.gi{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;display:block}
.mcard{background:#fff;border:1.5px solid #dde4ef;border-radius:14px;padding:14px 16px;margin-top:10px;display:flex;flex-direction:column}
.mcard b{font-size:18px;font-weight:800}.mcard span{font-size:14.5px;color:#5b6678;margin-top:3px}.mcard i{font-style:normal;font-weight:800;font-size:17px;margin-top:8px;color:#1d4aa1}
.bar{position:absolute;left:0;right:0;bottom:0;height:76px;background:#fff;border-top:1px solid #e3e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 18px}
#bk-sh{position:absolute;left:0;right:0;top:44px;bottom:0;background:#fff;border-radius:24px 24px 0 0;overflow:hidden;box-shadow:0 -10px 40px rgba(20,32,51,.25)}
.step{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:800;margin:22px 0 10px}
.step i{font-style:normal;width:26px;height:26px;border-radius:50%;background:#1d4aa1;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center}
.opt{display:flex;gap:12px;align-items:center;border:1.5px solid #dde4ef;border-radius:13px;padding:12px 14px;margin-top:8px}
.opt b{display:block;font-size:16.5px;font-weight:800}.opt span{display:block;font-size:13.5px;color:#5b6678}.opt em{font-style:normal;font-weight:800;margin-left:auto;font-size:16px}
.rd{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid #b9c3d4}
.opt.on{border-color:#1d4aa1;background:#f1f5fd}.opt.on .rd{border:7px solid #1d4aa1}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center}
.cal u{text-decoration:none;font-size:12px;color:#5b6678;font-weight:700}
.cal div{height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#9aa4b5}
.cal .av2{background:#e3ebf8;color:#12306e;font-weight:800}.cal .bkd{text-decoration:line-through}
.cal .on{background:#1d4aa1;color:#fff}
.hc{border:1.5px solid #cfd7e4;border-radius:999px;padding:10px 20px;font-size:17px;font-weight:600}
.hc.on{background:#1d4aa1;border-color:#1d4aa1;color:#fff}
#bk-sent{position:absolute;inset:0;background:#fff;padding:34px 22px;opacity:0}
.dl{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #e3e8f0;padding:13px 0;font-size:16px}.dl span{color:#5b6678}.dl b{font-weight:700;text-align:right}
#tap{position:absolute;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(20,32,51,.25);border:3px solid rgba(255,255,255,.95);box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;pointer-events:none}
`;

function html(v) {
  const g = G[v.fmt]; const isStory = v.fmt === 'story';
  const appH = Math.round(g.appW * 844 / 390), sb = Math.round(g.appW * 0.1), bz = 15;
  const S = g.appW / 360;
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
#island{position:absolute;top:${Math.round(sb * .2)}px;left:50%;width:${Math.round(g.appW * .3)}px;height:${Math.round(sb * .52)}px;margin-left:-${Math.round(g.appW * .15)}px;background:#0a0f1c;border-radius:99px;z-index:5}
#toast{position:absolute;left:50%;top:${Math.round(ph * .42)}px;transform:translateX(-50%);background:#fff;color:#142033;border-radius:24px;padding:${isStory ? '26px 36px' : '22px 30px'};display:flex;align-items:center;gap:18px;font-size:${isStory ? 40 : 34}px;font-weight:800;white-space:nowrap;box-shadow:0 24px 60px rgba(4,12,35,.45);opacity:0;z-index:6}
#toast i{width:${isStory ? 56 : 48}px;height:${isStory ? 56 : 48}px;border-radius:50%;background:#1d4aa1;color:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:${isStory ? 32 : 28}px}
#demo{position:absolute;right:-12px;top:${Math.round(ph * .1)}px;background:#142033;color:#fff;border:2px solid rgba(255,255,255,.25);font-size:${isStory ? 24 : 20}px;font-weight:700;padding:8px 16px;border-radius:999px;opacity:0;z-index:6}
.hl{background:#f0b429;color:#142033;padding:0 .16em;border-radius:.14em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.row{display:flex;gap:22px;align-items:center;font-size:${c.row}px;font-weight:700;opacity:0}
.row i{flex:none;width:${Math.round(c.row * 1.36)}px;height:${Math.round(c.row * 1.36)}px;border-radius:50%;background:#f0b429;color:#142033;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:${Math.round(c.row * .76)}px;font-weight:900}
.btn{display:inline-block;background:#f0b429;color:#142033;font-size:${c.btn}px;font-weight:800;padding:.62em 1.1em;border-radius:999px}
${APPCSS}
#app{top:${sb}px;height:${Math.round(appH / S)}px;transform:scale(${S})}
</style></head><body>
<div id="bg" class="abs"></div>
<div id="hookbg" class="abs" style="inset:0"><img class="abs ph" id="hookimg" src="${photo('f24')}" style="object-position:50% 35%"><div class="abs grad" style="background:linear-gradient(180deg,rgba(18,48,110,.55) 0%,rgba(18,48,110,.25) 30%,rgba(18,48,110,.92) ${isStory ? 72 : 80}%,#12306e 100%)"></div></div>
<div id="logo" class="abs" style="top:${isStory ? 250 : 64}px;left:${isStory ? 90 : 64}px;display:flex;align-items:center;gap:14px;font-size:${isStory ? 44 : 36}px;font-weight:800;letter-spacing:-.03em">${pan(isStory ? 64 : 52)}ao lume</div>
${scenes}
<div id="phone"><div id="scr"><div id="sb"><span>9:41</span><svg height="${Math.round(sb * .32)}" viewBox="0 0 64 22"><rect x="0" y="14" width="5" height="8" rx="1" fill="#142033"/><rect x="8" y="10" width="5" height="12" rx="1" fill="#142033"/><rect x="16" y="6" width="5" height="16" rx="1" fill="#142033"/><rect x="24" y="2" width="5" height="20" rx="1" fill="#142033"/><rect x="36" y="3" width="24" height="17" rx="4" fill="none" stroke="#142033" stroke-width="2"/><rect x="39" y="6" width="17" height="11" rx="2" fill="#142033"/><rect x="61" y="9" width="2.5" height="5" rx="1" fill="#142033"/></svg></div><div id="island"></div>
<div id="app">${APP()}</div></div>
<div id="toast"><i>✓</i>Conta criada</div><div id="demo">Perfil de exemplo</div></div>
<div id="bn" class="abs" style="left:${isStory ? 90 : 64}px;right:${isStory ? 90 : 64}px;top:${g.bn.top}px;bottom:${g.bn.top}px;display:flex;flex-direction:column;justify-content:center">
  <div id="bn-k" style="opacity:0"><span class="k" style="font-size:${isStory ? 30 : 24}px">TUDO NUM SÓ SÍTIO</span></div>
  <h1 id="bn-h1" style="margin-top:${isStory ? 24 : 16}px;font-size:${g.bn.h1}px;opacity:0">Feito para quem cozinha.</h1>
  <div style="margin-top:${isStory ? 56 : 34}px;display:flex;flex-direction:column;gap:${g.bn.gap}px">
  ${BEN.map(([ic, t, d], i) => `<div class="bnr" id="bn-${i}" style="display:flex;gap:${isStory ? 30 : 22}px;align-items:center;opacity:0"><div style="flex:none;width:${g.bn.ic}px;height:${g.bn.ic}px;border-radius:${Math.round(g.bn.ic * .3)}px;background:#f0b429;display:flex;align-items:center;justify-content:center"><div style="width:58%;height:58%">${ICON[ic]}</div></div><div><div style="font-size:${g.bn.bt}px;font-weight:800;letter-spacing:-.02em">${t}</div><div style="font-size:${g.bn.bs}px;font-weight:500;color:#dbe5f6;line-height:1.28;margin-top:4px">${d}</div></div></div>`).join('')}
  </div>
</div>
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
  <div id="c-btn" style="margin-top:${isStory ? 44 : 32}px;opacity:0"><span class="btn">${process.env.CTA || "Cria o teu perfil · link na bio"}</span></div>
</div>
<script>
const V=${JSON.stringify({ sc: v.sc, loc: v.loc })}, STORY=${isStory}, SC=${S};
const cl=(x)=>Math.max(0,Math.min(1,x)), eo=(x)=>1-Math.pow(1-cl(x),3), eio=(x)=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
const ramp=(t,a,d)=>eo((t-a)/d);
const bump=(L,a)=>{const d=L-a;return d<-.08||d>.18?0:d<0?(d+.08)/.08:1-d/.18};
const $=(id)=>document.getElementById(id);
const local=(t,n)=>{const [a,b]=V.sc[n],[o,d]=V.loc[n];return o+(t-a)/(b-a)*d;};
const typed=(id,txt,L,a,b,focus)=>{const n=Math.round(txt.length*cl((L-a)/(b-a)));$(id).firstChild.textContent=L<a?'':txt.slice(0,n);$(id).classList.toggle('f',L>=focus[0]&&L<focus[1]);$(id).style.setProperty('--cb',(Math.floor(L*2.2)%2&&L>b)?0:1);};
const press=(id,L,a)=>{$(id).style.transform='scale('+(1-.045*bump(L,a))+')';};
let bkScroll=null,pgScroll=null;
function tapAt(L,taps){const d=$('tap');let on=null;for(const [tt,id] of taps){if(L>=tt-.3&&L<=tt+.25){on=[tt,id];}}
  if(!on){d.style.opacity=0;return;} const [tt,id]=on, ar=$('app').getBoundingClientRect(), r=$(id).getBoundingClientRect();
  d.style.left=((r.left+r.width/2-ar.left)/SC)+'px'; d.style.top=((r.top+r.height/2-ar.top)/SC)+'px';
  const k=L<tt?cl((L-tt+.3)/.15):1-cl((L-tt-.1)/.15); d.style.opacity=k; d.style.transform='scale('+(L<tt?1.35-.35*cl((L-tt+.3)/.25):1-.12*bump(L,tt))+')';}
function app(t){
  const S=V.sc;
  if(pgScroll===null){const vp=$('pg-vp').getBoundingClientRect(),m=$('pg-menus').getBoundingClientRect();pgScroll=(m.top-vp.top)/SC-150;
    const sh=$('bk-sh').getBoundingClientRect(),dd=$('bk-dados').getBoundingClientRect();bkScroll=(dd.top-sh.top)/SC-20;}
  // qual ecrã
  const Ls=local(t,'signup'), Lp=local(t,'page'), Lb=local(t,'book');
  const inPage=t>=S.page[0], inBook=t>=S.book[0];
  // registo
  $('sg-choose').style.opacity=1-ramp(Ls,1.0,.3); $('sg-choose').style.transform='translateX('+(-50*ramp(Ls,1.0,.3))+'px)';
  $('sg-form').style.opacity=ramp(Ls,1.0,.35); $('sg-form').style.transform='translateX('+(60*(1-ramp(Ls,1.0,.35)))+'px)';
  press('sg-c2',Ls,.8);
  typed('sg-in1','Marta Figueiredo',Ls,1.25,2.0,[1.15,2.1]);
  typed('sg-in2','marta@exemplo.pt',Ls,2.2,2.9,[2.1,3.0]);
  typed('sg-in3','••••••••••',Ls,3.08,3.45,[3.0,3.6]);
  $('sg-chk').classList.toggle('on',Ls>=3.75);
  $('sg-go').style.opacity=Ls>=3.75?1:.5; press('sg-go',Ls,4.15); $('sg-go').textContent=Ls>4.3?'A criar conta…':'Criar conta de chef';
  // página
  const pin=ramp(t,S.page[0],.4);
  $('pg').style.transform='translateX('+(inPage?(1-pin)*100:100)+'%)';
  $('sg').style.transform='translateX('+(inPage?-30*pin:0)+'%)';
  $('pg-sc').style.transform='translateY('+(-pgScroll*eio((Lp-.7)/2.0))+'px)';
  $('pg-cover').style.transform='scale('+(1.1-.1*cl(Lp/3.2))+')';
  const av=ramp(Lp,.15,.45); $('pg-av').style.transform='scale('+(.6+.4*av)+')'; $('pg-av').style.opacity=av;
  for(const [id,a] of [['pg-ch1',.35],['pg-ch2',.5]]){const k=ramp(Lp,a,.35);$(id).style.opacity=k;$(id).style.display='inline-block';$(id).style.transform='translateY('+(1-k)*12+'px)';}
  press('pg-go',inBook?3.0:Lp,3.0);
  // reserva
  $('bk').style.display=inBook?'block':'none';
  $('bk-dim').style.opacity=ramp(Lb,0,.35);
  $('bk-sh').style.transform='translateY('+(1-eio(Lb/.5))*105+'%)';
  $('bk-o2').classList.toggle('on',Lb>=.75);
  $('bk-d15').classList.toggle('on',Lb>=1.35);
  $('bk-h12').classList.toggle('on',Lb>=1.9);
  $('bk-sc').style.transform='translateY('+(-bkScroll*eio((Lb-2.1)/.45))+'px)';
  typed('bk-n','Sofia Ramos',Lb,2.6,3.05,[2.5,3.1]);
  typed('bk-p','912 345 678',Lb,3.2,3.6,[3.1,3.7]);
  press('bk-go',Lb,3.85); $('bk-go').textContent=Lb>3.95?'A enviar…':'Pedir reserva';
  const se=ramp(Lb,4.1,.3); $('bk-sent').style.opacity=se;
  $('bk-c1').style.strokeDashoffset=1-eio((Lb-4.2)/.45); $('bk-c2').style.strokeDashoffset=1-eio((Lb-4.5)/.3);
  document.querySelectorAll('#bk-sent .st').forEach((e,i)=>{const k=ramp(Lb,4.35+i*.15,.35);e.style.opacity=k;e.style.transform='translateY('+(1-k)*14+'px)';});
  // toques
  if(inBook) tapAt(Lb,[[.75,'bk-o2'],[1.35,'bk-d15'],[1.9,'bk-h12'],[2.5,'bk-n'],[3.1,'bk-p'],[3.85,'bk-go']]);
  else if(inPage) tapAt(Lp,[[3.0,'pg-go']]);
  else if(t>=S.signup[0]) tapAt(Ls,[[.8,'sg-c2'],[1.15,'sg-in1'],[2.1,'sg-in2'],[3.0,'sg-in3'],[3.75,'sg-chk'],[4.15,'sg-go']]);
  else $('tap').style.opacity=0;
}
function render(t){
  const S=V.sc, [h0,h1]=S.hook, [c0,c1]=S.close;
  $('hookbg').style.opacity=1-ramp(t,h1-.35,.45);
  $('hookimg').style.transform='scale('+(1.12-.08*cl(t/h1))+')';
  $('logo').style.opacity=ramp(t,.05,.4)*(1-ramp(t,h1-.3,.3));
  for(const n of ['hook','signup','page','book']){
    const [a,b]=S[n], el=$('tx-'+n);
    const i=ramp(t,a+(n==='hook'?.15:.05),.45), o=n==='book'?ramp(t,b-.05,.35):ramp(t,b-.12,.25);
    el.style.opacity=i*(1-o); el.style.transform='translateY('+((1-i)*40-o*30)+'px)';
  }
  const b0=S.bn[0],b1=S.bn[1]; const pin=eio((t-(h1*.45))/(h1*.55)), pout=eio((t-b0)/.6);
  $('phone').style.transform='translateY('+((1-pin)*(STORY?900:0)+pout*(STORY?700:0))+'px) translateX('+((1-pin)*(STORY?0:640)+pout*(STORY?0:640))+'px) rotate('+((1-pin)*(STORY?6:4))+'deg)';
  $('phone').style.opacity=Math.min(cl((t-h1*.4)/(h1*.3)),1-cl((t-b0-.2)/.4));
  const bsp=Math.min(1,(b1-b0)/3.4), bo=ramp(t,b1-.15,.3);
  $('bn').style.opacity=1-bo; $('bn').style.transform='translateY('+(-30*bo)+'px)';
  const sb=(id,d,dx)=>{const k=ramp(t,b0+d*bsp,.45); $(id).style.opacity=k; $(id).style.transform=dx?'translateX('+(1-k)*80+'px)':'translateY('+(1-k)*40+'px)';};
  sb('bn-k',.35); sb('bn-h1',.5); for(let i=0;i<4;i++) sb('bn-'+i,1.0+i*.4,1);
  const [s0,s1]=S.signup, ti=ramp(t,s1-.6,.3), to=ramp(t,s1-.05,.25);
  $('toast').style.opacity=ti*(1-to); $('toast').style.transform='translateX(-50%) scale('+(.7+.3*ti)+')';
  $('demo').style.opacity=ramp(t,S.page[0]+.2,.3)*(1-ramp(t,b0-.1,.3));
  $('closebg').style.opacity=ramp(t,c0,.5); $('closeimg').style.transform='scale('+(1.1-.08*cl((t-c0)/(c1-c0)))+')';
  const st=(id,d)=>{const k=ramp(t,c0+d,.5); $(id).style.opacity=k; $(id).style.transform='translateY('+(1-k)*40+'px)';};
  const sp=(c1-c0)<3.2?.7:1;
  st('c-logo',.15); st('c-k',.3*sp); st('c-h1',.55*sp); st('c-r1',1.15*sp); st('c-r2',1.45*sp); st('c-r3',1.75*sp); st('c-btn',2.1*sp);
  const pb=t-(c0+2.6*sp); $('c-btn').firstChild.style.transform='scale('+(pb>0?1+.045*Math.sin(pb*Math.PI*1.7)**2:1)+')';
  app(t);
}
</script></body></html>`;
}

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(V);
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null; // tempos soltos para pré-visualizar
  fs.mkdirSync(path.join(CWD, 'out'), { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const name of names) {
    const v = V[name], g = G[v.fmt];
    const file = path.join(CWD, `anim-${name}.html`); fs.writeFileSync(file, html(v));
    const p = await b.newPage({ viewport: { width: g.W, height: g.H } });
    await p.goto('file://' + file, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    if (only) {
      for (const t of only) { await p.evaluate((t) => render(t), t); await p.screenshot({ path: path.join(CWD, 'out', `pv-${name}-${t}.jpg`), type: 'jpeg', quality: 85 }); }
      await p.close(); continue;
    }
    const dir = path.join(CWD, 'animframes', name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const total = Math.round(v.dur * FPS);
    for (let f = 0; f < total; f++) {
      await p.evaluate((t) => render(t), f / FPS);
      await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    }
    await p.evaluate((t) => render(t), v.sc.close[1] - 0.5);
    await p.screenshot({ path: path.join(CWD, 'out', `${name}-capa.png`) });
    execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${dir}/%04d.jpg -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -r ${FPS} -movflags +faststart ${path.join(CWD, 'out', name + '.mp4')}`);
    console.log('ok', name, total, 'frames');
    await p.close();
  }
  await b.close();
})();
