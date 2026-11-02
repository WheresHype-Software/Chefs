import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { cleanupTestData, createUser, makeAdmin, moveBookingToToday } from "./support/supabase-admin";
import { bookingDay, run } from "./support/run";
import { expectSaved, openPage, reportBrowserErrors, samplePhoto, signIn } from "./support/ui";

/**
 * The whole marketplace story, each person in their own browser:
 * a chef applies, an admin approves, the chef publishes an offer and opens a day,
 * a guest books it, the chef takes it to completed, and the guest leaves a review.
 */
test.describe.serial("booking lifecycle", () => {
  const target = bookingDay();
  const chefFirstName = run.chef.name.split(" ")[0]!;
  let contexts: BrowserContext[] = [];
  let chef: Page;
  let admin: Page;
  let client: Page;
  let bookingUrl: string;
  let bookingId: string;

  test.beforeAll(async ({ browser }) => {
    await cleanupTestData(); // leftovers from an interrupted run
    await createUser(run.chef.email, run.password, { name: run.chef.name, role: "chef" });
    await makeAdmin(await createUser(run.admin.email, run.password, { name: run.admin.name, role: "client" }));
    contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
    [chef, admin, client] = await Promise.all(contexts.map((c) => c.newPage()));
    for (const [role, page] of Object.entries({ chef, admin, client })) reportBrowserErrors(page, role);
  });

  test.afterAll(async () => {
    await Promise.all(contexts.map((c) => c.close()));
    if (!process.env.E2E_KEEP_DATA) await cleanupTestData();
  });

  test("chef creates a profile, uploads photos and applies", async () => {
    await signIn(chef, run.chef.email, run.password, "/dashboard/perfil");

    await chef.getByLabel("Nome público").fill(run.chef.name);
    await chef.getByLabel("Nome público").blur();
    // Leaving the name fills in the page link from it.
    await expect(chef.getByLabel(/^Link/)).toHaveValue(run.chef.slug);
    await chef.getByLabel("Especialidade (uma linha)").fill("Cozinha de teste");
    await chef.getByLabel("Sobre si").fill("Perfil criado pelos testes automáticos. É apagado no fim de cada execução.");
    await chef.getByRole("combobox", { name: "Zona de base" }).fill("Alvalade, Lisboa");
    await chef.getByLabel("Instagram").fill("@ao.lume.teste");
    await chef.getByRole("button", { name: "Criar perfil" }).click();
    await expectSaved(chef, "Perfil guardado.");

    await openPage(chef, "/dashboard/fotos");
    await chef.getByLabel("Carregar fotografia").setInputFiles(await samplePhoto(chef, "retrato.jpg"));
    await expectSaved(chef, "Fotografia carregada.");
    const dishes = await Promise.all(["prato-1.jpg", "prato-2.jpg", "prato-3.jpg"].map((name) => samplePhoto(chef, name)));
    await chef.getByLabel("Adicionar fotografias").setInputFiles(dishes);
    await expectSaved(chef, "3 fotografias carregadas.");

    await openPage(chef, "/dashboard/perfil");
    await chef.getByRole("button", { name: "Enviar para revisão" }).click();
    await expectSaved(chef, "Enviado para revisão.");
    await chef.reload();
    await expect(chef.getByText("Estado: em revisão")).toBeVisible();
  });

  test("admin reviews the application and approves it", async () => {
    await signIn(admin, run.admin.email, run.password, "/admin");

    const card = admin.getByRole("article").filter({ has: admin.getByRole("heading", { name: run.chef.name }) });
    await expect(card).toBeVisible();
    // Applications are a queue of summary rows; only the first starts open.
    const summary = card.getByRole("button", { expanded: false });
    if (await summary.count()) await summary.click();
    await card.getByRole("button", { name: "Aprovar e publicar" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `${run.chef.name} aprovado` })).toBeVisible();
  });

  test("approved chef publishes an offer and opens a day", async () => {
    await openPage(chef, "/dashboard/ofertas");
    await chef.getByRole("button", { name: "Nova oferta" }).click();
    await chef.getByLabel("Título").fill(run.offer.title);
    await chef.getByLabel("Descrição").fill("Menu de teste para levantar.");
    await chef.getByLabel("Onde").selectOption({ label: "Levantamento" });
    await chef.getByLabel("Valor (€)").fill(String(run.offer.price));
    await chef.getByLabel("Antecedência (horas)").fill("0");
    await chef.getByLabel("Horas (separadas por vírgula)").fill("20:00");
    await chef.getByRole("button", { name: "Guardar" }).click();
    await expect(chef.getByText(run.offer.title)).toBeVisible();

    await openPage(chef, `/dashboard/agenda?mes=${target.month}`);
    await chef.getByRole("button", { name: `${target.day}: fechado`, exact: true }).click();
    await expect(chef.getByRole("button", { name: `${target.day}: disponível`, exact: true })).toBeVisible();
    // Reload to prove it was saved, not just shown optimistically.
    await expect(async () => {
      await chef.reload();
      await expect(chef.getByRole("button", { name: `${target.day}: disponível`, exact: true })).toBeVisible({ timeout: 2_000 });
    }).toPass();
  });

  test("chef sends a certificate and the admin grants the Chef title", async () => {
    await openPage(chef, "/dashboard/perfil");
    await expect(chef.getByText(`Cozinheiro ${run.chef.name}`).first()).toBeVisible();
    await chef.getByLabel("Nome do certificado").fill("Curso de Cozinha (teste)");
    await chef.getByLabel("Ficheiro").setInputFiles(await samplePhoto(chef, "certificado.jpg"));
    await chef.getByRole("button", { name: "Enviar certificado" }).click();
    await expectSaved(chef, "Certificado enviado.");
    await expect(chef.getByText("Em verificação")).toBeVisible();

    await openPage(admin, "/admin");
    const request = admin.getByRole("article").filter({ has: admin.getByRole("heading", { name: `Cozinheiro ${run.chef.name}` }) });
    await expect(request.getByRole("img", { name: /Certificado/ })).toBeVisible();
    await request.getByRole("button", { name: "Verificar como Chef" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `já aparece como Chef ${run.chef.name}` })).toBeVisible();

    await openPage(client, `/chef/${run.chef.slug}`);
    await expect(client.getByRole("heading", { name: `Chef ${run.chef.name}`, level: 1 })).toBeVisible();
    await expect(client.getByText("Chef verificado").first()).toBeVisible();
  });

  test("a guest finds the chef and requests a booking", async () => {
    await openPage(client, `/chef/${run.chef.slug}`);
    await expect(client.getByRole("heading", { name: run.chef.name, level: 1 })).toBeVisible();

    const form = client.locator("form.booking-form");
    await expect(form.getByRole("radio", { name: new RegExp(run.offer.title) })).toHaveAttribute("aria-checked", "true");
    if (target.isNextMonth) await form.getByRole("button", { name: "Mês seguinte" }).click();
    await form.getByRole("button", { name: `${target.day}, disponível`, exact: true }).click();
    await form.getByRole("button", { name: "20:00", exact: true }).click();
    await form.getByLabel("Nome", { exact: true }).fill(run.client.name);
    await form.getByLabel("Email", { exact: true }).fill(run.client.email);
    await form.getByLabel("Telemóvel").fill(run.client.phone);
    await form.getByLabel("Notas para o chef").fill("Sem glúten, por favor.");
    await expect(form.getByText(`${run.offer.price * run.offer.guests} €`)).toBeVisible();
    await form.getByRole("button", { name: "Pedir reserva" }).click();

    await expect(client.getByRole("heading", { name: `Pedido enviado a ${chefFirstName}` })).toBeVisible();
    await client.getByRole("link", { name: "Ver estado e conversar" }).click();
    await expect(client).toHaveURL(/\/reserva\/[0-9a-f-]{36}$/);
    bookingUrl = new URL(client.url()).pathname;
    bookingId = bookingUrl.split("/").pop()!;
    await expect(client.getByText("Sem glúten, por favor.")).toBeVisible();
  });

  test("chef accepts, replies, confirms the deposit and completes the booking", async () => {
    await openPage(chef, `/dashboard/pedidos/${bookingId}`);
    await expect(chef.getByRole("definition").filter({ hasText: run.client.email })).toBeVisible();

    await chef.getByRole("button", { name: "Aceitar" }).click();
    const confirm = chef.getByRole("button", { name: "Sinal recebido · confirmar" });
    await expect(confirm).toBeVisible();

    await chef.getByPlaceholder("Escreva uma mensagem…").fill("Combinado, sem glúten.");
    await chef.getByRole("button", { name: "Enviar" }).click();
    await expect(chef.getByText("Combinado, sem glúten.")).toBeVisible();

    await client.reload();
    await expect(client.getByRole("heading", { name: `${chefFirstName} aceitou o seu pedido` })).toBeVisible();
    await expect(client.getByText("Combinado, sem glúten.")).toBeVisible();

    await confirm.click();
    // Completing unlocks the review, so it waits for the service day.
    await expect(chef.getByText(/Pode marcar como concluída a partir de/)).toBeVisible();
    await moveBookingToToday(bookingId); // the service day arrives
    await chef.reload();
    const complete = chef.getByRole("button", { name: "Marcar concluída" });
    await complete.click();
    await expect(complete).toBeHidden();
    await expect(chef.getByRole("button", { name: "Aceitar" })).toBeHidden();
  });

  test("guest reviews the chef and the review is public", async () => {
    await openPage(client, bookingUrl);
    const review = client.locator("form").filter({ hasText: `Como correu com ${chefFirstName}?` });
    await expect(review).toBeVisible();
    // One tap is enough; the categories follow the overall score.
    await review.getByRole("radio", { name: "5 de 5: Excelente" }).click();
    await review.getByLabel("Comentário").fill(run.review);
    await review.getByRole("button", { name: "Publicar avaliação" }).click();
    await expect(client.getByRole("heading", { name: "Obrigado pela avaliação" })).toBeVisible();

    await client.goto(`/chef/${run.chef.slug}`);
    await expect(client.getByText(run.review)).toBeVisible();
    await expect(client.getByRole("list", { name: "Distribuição das avaliações" })).toContainText("5 ★");
  });
});
