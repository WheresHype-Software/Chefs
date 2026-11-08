/**
 * Um barrete de cozinheiro, desenhado na mesma grelha de 24px dos outros ícones.
 *
 * Serve para marcar o lado dos chefs sem precisar de o escrever: quem cozinha reconhece-o antes
 * de ler a página. Usa currentColor, por isso funciona em cima do escuro e do claro.
 */
export function ChefHat({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* A parte alta: três bolas que se tocam, tiradas num só contorno. */}
      <path d="M7.2 14.8a4.3 4.3 0 0 1-1.1-8.4 4.1 4.1 0 0 1 5.9-2.6 4.1 4.1 0 0 1 5.9 2.6 4.3 4.3 0 0 1-1.1 8.4" />
      {/* A tira, com as duas pregas. */}
      <path d="M7.2 14.8h9.6v3.9a1.3 1.3 0 0 1-1.3 1.3H8.5a1.3 1.3 0 0 1-1.3-1.3z" />
      <path d="M10.4 14.8v5.2M13.6 14.8v5.2" strokeWidth={1.2} opacity={0.65} />
    </svg>
  );
}
