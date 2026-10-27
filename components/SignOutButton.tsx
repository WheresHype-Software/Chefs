import { signOut } from "@/app/auth/actions";

/** Ends the session; a plain form so it works before hydration too. */
export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={`cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-muted hover:text-ink ${className}`}>
        Sair
      </button>
    </form>
  );
}
