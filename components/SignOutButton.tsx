import { signOut } from "@/app/auth/actions";

type Props = { className?: string; /** Full outline button (menus) instead of a quiet text link. */ block?: boolean };

/** Ends the session; a plain form so it works before hydration too. */
export function SignOutButton({ className = "", block = false }: Props) {
  const look = block ? "btn btn-o w-full" : "cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-muted hover:text-ink";
  return (
    <form action={signOut}>
      <button type="submit" className={`${look} ${className}`}>
        Sair
      </button>
    </form>
  );
}
