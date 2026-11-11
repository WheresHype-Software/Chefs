const { chromium } = require('playwright');
const which = process.argv[2];
const BASE = 'http://localhost:3320';
const CSS = `nextjs-portal{display:none!important}
#tapdot{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(20,32,51,.28);border:3px solid rgba(255,255,255,.9);box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none;z-index:2147483647;opacity:0;transition:opacity .15s,transform .25s;transform:scale(1.4)}
#tapdot.on{opacity:1;transform:scale(1)}
html{scroll-behavior:auto!important}`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir: `vid-${which}`, size: { width: 780, height: 1688 } } });
  await ctx.addInitScript((css) => {
    addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); const d = document.createElement('div'); d.id = 'tapdot'; document.body.appendChild(d); });
  }, CSS);
  const pg = await ctx.newPage();
  const W = (ms) => pg.waitForTimeout(ms);
  const tap = async (loc, hold = 380) => {
    await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox();
    const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    await pg.evaluate(([x, y]) => { const d = document.getElementById('tapdot'); d.style.left = x + 'px'; d.style.top = y + 'px'; d.classList.add('on'); }, [x, y]);
    await W(hold); await pg.touchscreen.tap(x, y); await W(180);
    await pg.evaluate(() => document.getElementById('tapdot')?.classList.remove('on'));
  };
  const type = async (loc, text) => { await tap(loc, 250); await loc.pressSequentially(text, { delay: 55 }); await W(250); };
  const scrollBy = async (dy, ms = 900) => { await pg.evaluate(async ([dy, ms]) => { const s = scrollY, t0 = performance.now(); await new Promise(r => { const f = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, s + dy * e); k < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }); }, [dy, ms]); };
  const snap = (n) => pg.screenshot({ path: `${which}-${n}.png` });

  if (which === 'signup') {
    await pg.goto(BASE + '/entrar', { waitUntil: 'networkidle' }); await W(900);
    await tap(pg.getByRole('tab', { name: 'Criar conta' })); await W(700); await snap(1);
    await tap(pg.getByRole('button', { name: /Quero cozinhar/ })); await W(700); await snap(2);
    await type(pg.getByLabel('Nome'), 'Marta Figueiredo');
    await type(pg.getByLabel('Email'), 'marta@exemplo.pt');
    await type(pg.getByLabel('Palavra-passe'), 'tachos2026');
    await tap(pg.getByRole('checkbox')); await W(300); await snap(3);
    await tap(pg.getByRole('button', { name: 'Criar conta de chef' })); await W(2200); await snap(4);
  }
  if (which === 'page') {
    await pg.goto(BASE + '/chef/marta-figueiredo', { waitUntil: 'networkidle' }); await W(1200);
    await scrollBy(560, 1600); await W(900); await snap(1);
    const menus = await pg.locator('#menus').boundingBox().catch(() => null);
    await scrollBy(menus ? menus.y - 70 : 1200, 1800); await W(1000); await snap(2);
    await scrollBy(520, 1400); await W(800); await snap(3);
  }
  if (which === 'book') {
    await pg.goto(BASE + '/chef/marta-figueiredo', { waitUntil: 'networkidle' }); await W(1000);
    await tap(pg.getByRole('link', { name: 'Pedir reserva' }).or(pg.getByRole('button', { name: 'Pedir reserva' })).first()); await W(1100);
    await tap(pg.getByRole('radio', { name: /Marmitas da semana/ })); await W(500);
    await scrollBy(330, 700); await W(300); await snap(1);
    await tap(pg.getByRole('button', { name: /disponível/ }).nth(1)); await W(500);
    await tap(pg.getByRole('button', { name: '12:00' }).or(pg.getByRole('radio', { name: '12:00' })).first()); await W(400); await snap(2);
    await type(pg.getByLabel('Nome'), 'Sofia Ramos');
    await type(pg.getByLabel('Email'), 'sofia@exemplo.pt');
    await type(pg.getByLabel('Telemóvel'), '912 345 678'); await snap(3);
    await tap(pg.locator('form button[type=submit]').last()); await W(2500); await snap(4);
  }
  await ctx.close(); await b.close();
})();
