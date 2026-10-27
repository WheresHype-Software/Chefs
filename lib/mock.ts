// Demo data used when no Supabase project is configured. Mirrors supabase/seed.sql.
import { isoDay } from "./format";
import type { Calendar, ChefCard, ChefProfile, Offer } from "./types";

type Seed = Omit<ChefCard, "distanceKm" | "offers" | "cover" | "promoted" | "badges"> & {
  offers: Omit<Offer, "id" | "leadHours" | "minGuests" | "maxGuests">[];
  weekdays: number[]; // 0 = Sunday
};

const SEEDS: Seed[] = [
  {
    id: "c-marta", slug: "marta-figueiredo", name: "Marta Figueiredo", tier: "professional",
    headline: "Portuguesa contemporânea", area: "Campo de Ourique", lat: 38.717, lng: -9.167, radiusKm: 15,
    bio: "Receitas de família do Minho com técnica de restaurante. Faço as compras, sirvo à mesa e deixo a cozinha arrumada.",
    rating: 4.9, reviewCount: 38, responseHours: 3, isNew: false,
    categories: ["Portuguesa", "Marisco e peixe"], services: ["home", "events"], weekdays: [4, 5, 6, 0],
    offers: [
      { title: "Jantar do Minho", description: "Caldo verde com broa · Bacalhau confitado com grão · Arroz de pato · Pudim abade de Priscos", mode: "home", priceModel: "per_person", price: 55, unit: "pessoa", timeSlots: ["13:00", "19:30", "20:00", "20:30"] },
      { title: "Mariscada à mesa", description: "Ameijoas à Bulhão Pato · Camarão ao alho · Arroz de marisco · Sericaia", mode: "home", priceModel: "per_person", price: 72, unit: "pessoa", timeSlots: ["13:00", "19:30", "20:00", "20:30"] },
    ],
  },
  {
    id: "c-rui", slug: "rui-barata", name: "Rui Barata", tier: "professional",
    headline: "Grelhados no carvão", area: "Estrela", lat: 38.713, lng: -9.16, radiusKm: 20,
    bio: "Levo a grelha a carvão e trato de tudo no terraço ou no jardim. Petiscos para partilhar e peixe do dia.",
    rating: 4.7, reviewCount: 17, responseHours: 6, isNew: false,
    categories: ["Grelhados", "Petiscos"], services: ["home", "events"], weekdays: [4, 5, 6, 0],
    offers: [
      { title: "Grelhada no terraço", description: "Petiscos e prato principal na grelha a carvão", mode: "home", priceModel: "per_person", price: 48, unit: "pessoa", timeSlots: ["13:00", "19:00", "20:00"] },
      { title: "Festa de grupo", description: "10 a 30 pessoas, menu à medida", mode: "home", priceModel: "quote", price: null, unit: "evento", timeSlots: ["13:00", "19:00", "20:00"] },
    ],
  },
  {
    id: "c-ines", slug: "ines-cordeiro", name: "Inês Cordeiro", tier: "home",
    headline: "Marmitas semanais", area: "Alvalade", lat: 38.753, lng: -9.143, radiusKm: 8,
    bio: "Cozinho ao domingo para a sua semana: sopa, prato e fruta. Opção vegetariana todas as semanas.",
    rating: 4.8, reviewCount: 21, responseHours: 2, isNew: false,
    categories: ["Saudável", "Portuguesa"], services: ["meal_prep", "delivery", "pickup"], weekdays: [1, 0],
    offers: [
      { title: "Semana completa", description: "Sopa e prato · entrega à segunda", mode: "delivery", priceModel: "per_person", price: 11, unit: "refeição", timeSlots: ["Entrega 18:00–20:00"] },
      { title: "Só sopas", description: "Cinco sopas de meio litro", mode: "pickup", priceModel: "per_person", price: 4, unit: "sopa", timeSlots: ["Levantar 12:00"] },
    ],
  },
  {
    id: "c-joana", slug: "joana-lopes", name: "Joana Lopes", tier: "home",
    headline: "Pastelaria caseira", area: "Benfica", lat: 38.751, lng: -9.2, radiusKm: 10,
    bio: "Bolos de aniversário, tartes e pastéis de nata feitos na hora. Encomendas com três dias de antecedência.",
    rating: null, reviewCount: 0, responseHours: 4, isNew: true,
    categories: ["Pastelaria"], services: ["delivery", "pickup"], weekdays: [2, 3, 4, 5, 6],
    offers: [
      { title: "Bolo de aniversário", description: "Doze fatias, decoração à escolha", mode: "delivery", priceModel: "fixed", price: 32, unit: "bolo", timeSlots: ["Entrega"] },
      { title: "Pastéis de nata", description: "Caixa de doze, para levantar", mode: "pickup", priceModel: "fixed", price: 18, unit: "caixa", timeSlots: ["Levantar 10:00", "Levantar 17:00"] },
    ],
  },
  {
    id: "c-tiago", slug: "tiago-mendes", name: "Tiago Mendes", tier: "professional",
    headline: "Cozinha de autor", area: "Belém", lat: 38.698, lng: -9.206, radiusKm: 30,
    bio: "Menu de degustação com produto da época, vinhos portugueses e serviço de sala.",
    rating: 5.0, reviewCount: 64, responseHours: 1, isNew: false,
    categories: ["Cozinha de autor", "Marisco e peixe"], services: ["home", "events"], weekdays: [4, 5, 6, 0],
    offers: [
      { title: "Degustação de outono", description: "Sete momentos", mode: "home", priceModel: "per_person", price: 75, unit: "pessoa", timeSlots: ["13:00", "20:00"] },
      { title: "Com harmonização", description: "Sete momentos e quatro vinhos", mode: "home", priceModel: "per_person", price: 98, unit: "pessoa", timeSlots: ["13:00", "20:00"] },
    ],
  },
  {
    id: "c-carla", slug: "carla-nunes", name: "Carla Nunes", tier: "home",
    headline: "Petiscos e eventos", area: "Alfama", lat: 38.712, lng: -9.13, radiusKm: 15,
    bio: "Petiscos de Lisboa para festas em casa: pastéis de bacalhau, bifanas, salada de polvo.",
    rating: 4.8, reviewCount: 12, responseHours: 5, isNew: false,
    categories: ["Petiscos", "Portuguesa"], services: ["events", "home", "delivery", "pickup"], weekdays: [4, 5, 6, 0],
    offers: [
      { title: "Mesa de petiscos", description: "Oito petiscos, entrega e montagem", mode: "delivery", priceModel: "per_person", price: 22, unit: "pessoa", timeSlots: ["12:30", "19:00", "20:00"] },
      { title: "Chef em casa", description: "Três tempos tradicionais", mode: "home", priceModel: "per_person", price: 40, unit: "pessoa", timeSlots: ["12:30", "19:00", "20:00"] },
    ],
  },
  {
    id: "c-andre", slug: "andre-sousa", name: "André Sousa", tier: "professional",
    headline: "Cozinha vegetal", area: "Avenidas Novas", lat: 38.737, lng: -9.148, radiusKm: 12,
    bio: "Cozinha vegetal com sabor português. Marmitas semanais ou jantares em casa, sem carne nem peixe.",
    rating: 4.9, reviewCount: 29, responseHours: 2, isNew: false,
    categories: ["Vegetariana", "Vegan"], services: ["meal_prep", "home", "delivery"], weekdays: [1, 0],
    offers: [
      { title: "Marmitas vegetais", description: "Cinco dias · entrega ao domingo", mode: "delivery", priceModel: "per_person", price: 12, unit: "refeição", timeSlots: ["Entrega 18:00–20:00"] },
      { title: "Jantar vegetal em casa", description: "Quatro tempos", mode: "home", priceModel: "per_person", price: 50, unit: "pessoa", timeSlots: ["20:00"] },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const MOCK_CHEFS: ChefCard[] = SEEDS.map(({ weekdays: _w, offers, ...c }) => ({
  ...c,
  distanceKm: null,
  cover: null,
  promoted: false,
  badges: ["identity", "portfolio"],
  offers: offers.map((o, i) => ({
    ...o,
    id: `${c.id}-o${i}`,
    leadHours: 48,
    minGuests: o.unit === "pessoa" ? 2 : 1,
    maxGuests: 20,
  })),
}));

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function mockCalendar(chefId: string, from: Date, to: Date): Calendar {
  const seed = SEEDS.find((s) => s.id === chefId);
  const available: string[] = [];
  const booked: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() + 2);
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (d < start || !seed?.weekdays.includes(d.getDay())) continue;
    const iso = isoDay(d);
    // A stable sprinkle of already-booked days so the calendar looks lived-in.
    if (hash(chefId + iso) % 4 === 0) booked.push(iso);
    else available.push(iso);
  }
  return { available, booked };
}

export function mockProfile(slug: string): ChefProfile | null {
  const c = MOCK_CHEFS.find((x) => x.slug === slug);
  if (!c) return null;
  return {
    ...c,
    languages: ["Português", "Inglês"],
    socials: { instagram: `@${c.slug.split("-")[0]}.cozinha` },
    yearsExperience: 12,
    paymentMethods: ["MB WAY", "Transferência", "Dinheiro"],
    depositPercent: 30,
    cancellation: { preset: "moderate", text: null },
    experience: [
      { place: "[Restaurante]", role: "Chef de partida", years: "2014–2020" },
      { place: "Por conta própria", role: "Chef privada", years: "2020–hoje" },
    ],
    certifications: [{ title: "Formação HACCP", issuer: "[Entidade]", verified: true }],
    gallery: c.offers.map((o) => ({ url: null, caption: o.title })).concat([{ url: null, caption: "Mesa posta" }]),
    reviews:
      c.reviewCount > 0
        ? [
            { id: "r1", author: "Sofia R.", date: "2026-10-10", what: `${c.offers[0]!.title} · 8 pessoas`, comment: "Tratou de tudo, da entrada à loiça. Os meus pais ainda falam do jantar.", overall: 5, reply: "Obrigada! Foi um prazer cozinhar para a vossa família." },
            { id: "r2", author: "James W.", date: "2026-09-21", what: `${c.offers[1]?.title ?? c.offers[0]!.title} · 4 pessoas`, comment: "Our best meal in Lisbon. Every dish was explained and the food was incredible.", overall: 5, reply: null },
          ]
        : [],
    categoryAverages:
      c.reviewCount > 0
        ? [
            { label: "Comida", value: 5 },
            { label: "Apresentação", value: 4.9 },
            { label: "Pontualidade", value: 4.8 },
            { label: "Comunicação", value: 5 },
            { label: "Qualidade/preço", value: 4.8 },
          ]
        : [],
  };
}
