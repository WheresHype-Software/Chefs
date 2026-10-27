export type FormMessageValue = { ok: boolean; text: string };

/** Inline outcome of a form action: success in muted green, errors announced as alerts. */
export function FormMessage({ message }: { message: FormMessageValue | null }) {
  if (!message) return null;
  return (
    <p role={message.ok ? "status" : "alert"} className={`m-0 text-sm ${message.ok ? "text-ok" : "text-danger"}`}>
      {message.text}
    </p>
  );
}
