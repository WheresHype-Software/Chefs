-- Ao Lume: pagamento com cartão
--
-- O cartão não se paga na nossa página: a EuPago devolve o endereço de um formulário seguro
-- (com 3D Secure) para onde o browser do cliente é enviado. Esse endereço tem de ser guardado,
-- senão um cliente que feche o separador a meio não tem como voltar ao pagamento que começou.

alter table public.payments add column redirect_url text;

-- O estado do pagamento passa a incluir para onde continuar, e deixa de ser preciso adivinhar.
create or replace function public.payment_state(p_booking uuid, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b public.bookings; p public.payments;
begin
  if public.booking_actor(p_booking, p_token) is null then raise exception 'not_allowed'; end if;
  select * into b from public.bookings where id = p_booking;
  select * into p from public.payments where booking_id = p_booking order by created_at desc limit 1;

  return jsonb_build_object(
    'bookingStatus', b.status,
    'depositStatus', b.deposit_status,
    'depositAmount', b.deposit_amount,
    'depositDueAt', b.deposit_due_at,
    'payment', case when p.id is null then null else jsonb_build_object(
      'id', p.id,
      'method', p.method,
      'status', p.status,
      'amount', p.amount,
      'entity', p.mb_entity,
      'reference', p.mb_reference,
      'expiresAt', coalesce(p.mb_expires_at, p.expires_at),
      'phoneMasked', p.phone_masked,
      'redirectUrl', p.redirect_url,
      'createdAt', p.created_at
    ) end
  );
end $$;
