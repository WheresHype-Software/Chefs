// Minimal fake Supabase (PostgREST + auth) so the real app renders a demo chef for the ad recording.
const http = require('http');
const ID = '11111111-1111-4111-8111-111111111111';
const offers = [
  { id: 'o1', title: 'Jantar de autor em casa', description: 'Menu de 4 momentos, cozinhado na tua cozinha. Eu trato da loiça.', mode: 'home', priceModel: 'per_person', price: 45, unit: 'pessoa', minGuests: 2, maxGuests: 12, leadHours: 48, timeSlots: ['19:30', '20:00'] },
  { id: 'o2', title: 'Marmitas da semana', description: '5 refeições caseiras, prontas a aquecer.', mode: 'pickup', priceModel: 'fixed', price: 40, unit: 'pack', minGuests: 1, maxGuests: 4, leadHours: 24, timeSlots: ['12:00', '18:00'] },
  { id: 'o3', title: 'Festa ou evento', description: 'Para aniversários e celebrações. Diz-me o que imaginas.', mode: 'home', priceModel: 'quote', price: null, unit: 'evento', minGuests: 10, maxGuests: 60, leadHours: 168, timeSlots: [] },
];
const card = { id: ID, slug: 'marta-figueiredo', name: 'Marta Figueiredo', tier: 'professional', headline: 'Cozinha portuguesa de autor', bio: 'Cresci entre tachos na cozinha da minha avó. Hoje levo essa cozinha, com um toque moderno, a casa de quem quer comer bem sem sair da mesa.', area: 'Lisboa', lat: 38.72, lng: -9.14, radiusKm: 30, distanceKm: 3.2, rating: 4.9, reviewCount: 27, responseHours: 2, badges: ['identity', 'certified', 'founder'], isNew: false, promoted: false, categories: ['Portuguesa', 'Mediterrânica', 'Marisco'], services: ['home', 'pickup', 'events'], cover: '/_ad/f10.jpg', offers };
const gallery = [['f10', 'Bacalhau confitado'], ['f13', 'Salada de quinoa e romã'], ['f30', 'Costeleta na frigideira'], ['f26', 'Massa fresca com parmesão'], ['f14', 'Tostada de abacate'], ['f16', 'Entradas para eventos']];
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const days = (from, n) => Array.from({ length: n }, (_, i) => iso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + from + i))));
const rev = (i, a, c) => ({ id: 'r' + i, author_name: a, created_at: new Date(Date.now() - i * 9e8).toISOString(), comment: c, overall: 5, chef_reply: null, food: 5, presentation: 5, punctuality: 5, communication: 5, value: 4.8, bookings: { offer_title: 'Jantar de autor em casa', guests: 6 } });
const T = {
  chefs: { languages: ['Português', 'Inglês'], socials: { instagram: 'martafigueiredo.chef' }, years_experience: 9, payment_methods: ['mbway', 'multibanco'], deposit_percent: 30 },
  chef_experience: [{ place: 'Restaurante em Lisboa', role: 'Sous-chef', start_year: 2016, end_year: 2022 }],
  chef_certifications: [{ title: 'Curso de Cozinha', issuer: 'Escola de Hotelaria', verified: true }],
  chef_photos: [{ chef_id: ID, url: '/_ad/f8.jpg', caption: '', kind: 'portrait' }, ...gallery.map(([f, c]) => ({ chef_id: ID, url: `/_ad/${f}.jpg`, caption: c, kind: 'gallery' }))],
  cancellation_policies: { preset: 'flexible', custom_text: null },
  reviews: [rev(1, 'Sofia R.', 'Jantar de aniversário perfeito. Os convidados ainda falam do bacalhau!'), rev(2, 'Miguel T.', 'Super simpática, pontual e a comida estava incrível.'), rev(3, 'Ana L.', 'As marmitas salvaram-me a semana. Já encomendei outra vez.')],
  offers: { title: 'Marmitas da semana', fulfilment_mode: 'pickup', chefs: { badges: card.badges } },
  platform_settings: { payments_enabled: false, commission_percent: 12, commission_min: 3, deposit_margin_percent: 5, deposit_due_hours: 48, payout_hold_hours: 24, iban_hold_hours: 24, iban_hold_first_time: true, agreement_version: '1' },
};
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    const u = new URL(req.url, 'http://x'); const p = u.pathname;
    const send = (code, j) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
    const one = /pgrst\.object/.test(req.headers.accept || '');
    if (p === '/rest/v1/rpc/chefs_near') return send(200, process.env.MANY ? [card, ...[[1,'Rui Costa',.004,.003],[2,'Joana Lima',-.003,.006],[3,'Pedro Alves',.03,-.02],[4,'Inês Rocha',-.02,.03]].map(([i,n,a,b]) => ({ ...card, id: card.id.slice(0,-1)+i, slug: 'c'+i, name: n, lat: card.lat+a, lng: card.lng+b }))] : [card]);
    if (p === '/rest/v1/rpc/chef_calendar') return send(200, { available: days(2, 26).filter((_, i) => i % 3 !== 1), booked: days(3, 26).filter((_, i) => i % 5 === 0) });
    if (p === '/rest/v1/rpc/request_booking') { console.log('BOOKING', body.slice(0, 200)); return send(200, { bookingId: '22222222-2222-4222-8222-222222222222', ref: 'AL-7K3Q', token: 'demo-token', chefName: card.name }); }
    if (p.startsWith('/rest/v1/')) {
      const t = p.slice(9); let v = T[t];
      if (v === undefined) { console.log('UNKNOWN', req.method, req.url); return send(200, one ? null : []); }
      if (req.method !== 'GET') { console.log('WRITE', t, body.slice(0, 200)); return send(201, one ? v : [v]); }
      if (one) return send(200, Array.isArray(v) ? v[0] : v);
      return send(200, Array.isArray(v) ? v : [v]);
    }
    if (p === '/auth/v1/signup') { console.log('SIGNUP', body.slice(0, 200)); return send(200, { id: ID, aud: 'authenticated', email: 'x', identities: [], user_metadata: {} }); }
    if (p.startsWith('/auth/v1/user')) return send(401, { message: 'no session' });
    console.log('OTHER', req.method, req.url); send(404, {});
  });
}).listen(54321, () => console.log('mock on 54321'));
