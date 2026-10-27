import type { BookingView } from "./types";

/** Example booking shown in demo mode (no Supabase configured). */
export function demoBookingView(): BookingView {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  const at = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  return {
    viewer: "client",
    booking: {
      id: "demo",
      ref: "AL-DEMO",
      status: "accepted",
      offer_title: "Jantar do Minho",
      fulfilment_mode: "home",
      date: d.toISOString().slice(0, 10),
      time_label: "20:00",
      guests: 6,
      address: "Rua Ferreira Borges 112, Lisboa",
      notes: "Uma pessoa vegetariana.",
      estimate: 330,
      quoted_price: null,
      proposed_date: null,
      proposed_time: null,
      pickup_code: null,
      created_at: at(5),
    },
    chef: {
      id: "c-marta",
      slug: "marta-figueiredo",
      name: "Marta Figueiredo",
      area: "Campo de Ourique",
      responseHours: 3,
      paymentMethods: ["mbway", "transfer", "cash"],
      depositPercent: 30,
    },
    client: { name: "Sofia Ramos", email: "sofia@email.pt", phone: "+351 912 345 678" },
    policy: { preset: "moderate", text: null },
    pickupAddress: null,
    events: [
      { to: "requested", at: at(5) },
      { to: "accepted", at: at(2) },
    ],
    messages: [
      { id: "m1", sender: "system", body: "Pedido enviado · Jantar do Minho", at: at(5) },
      {
        id: "m2",
        sender: "client",
        body: "Olá Marta! É o jantar de aniversário da minha mãe. Temos forno e placa de indução, mas poucas travessas grandes.",
        at: at(5),
      },
      {
        id: "m3",
        sender: "chef",
        body: "Olá Sofia, que bom! Levo eu as travessas e a loiça de serviço. Para a pessoa vegetariana faço um arroz de cogumelos em vez do pato, pode ser?",
        at: at(2.1),
      },
      { id: "m4", sender: "system", body: "Marta aceitou o pedido", at: at(2) },
      { id: "m5", sender: "chef", body: "Para confirmar, peço um sinal de 99 € por MB WAY. Chego às 18:00 para preparar.", at: at(1.9) },
    ],
    review: null,
  };
}
