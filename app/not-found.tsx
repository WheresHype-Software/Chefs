import Link from "next/link";
import { SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col items-start gap-5 px-5 py-24 md:px-8">
        <span className="lab text-muted">404</span>
        <h1 className="d m-0 text-[clamp(38px,6vw,64px)] leading-none">Esta página não está no menu.</h1>
        <Link href="/" className="btn">
          Voltar ao mapa
        </Link>
      </main>
    </div>
  );
}
