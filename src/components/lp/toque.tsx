import { cn } from "@/lib/utils";

/**
 * O gesto do produto: um celular encostando no cartão. Só formas e três
 * ondas, nas cores da direção. Nada de robôs, cérebros ou partículas.
 */
export function Toque({ className, legenda }: { className?: string; legenda?: string }) {
  return (
    <figure className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        viewBox="0 0 320 240"
        role="img"
        aria-label="Celular encostando no cartão NFC"
        className="h-auto w-full max-w-[320px]"
      >
        {/* Cartão */}
        <g transform="translate(40 128) rotate(-8)">
          <rect x="0" y="0" width="150" height="94" rx="10" fill="var(--lp-surface)" stroke="var(--lp-line)" strokeWidth="2" />
          <rect x="14" y="16" width="34" height="24" rx="4" fill="var(--lp-accent-soft)" stroke="var(--lp-accent)" strokeWidth="1.5" />
          <rect x="14" y="60" width="78" height="6" rx="3" fill="var(--lp-line)" />
          <rect x="14" y="72" width="52" height="6" rx="3" fill="var(--lp-line)" />
          <text x="136" y="80" textAnchor="end" fontSize="11" fontWeight="700" fill="var(--lp-ink)" fontFamily="var(--lp-display)">
            bussula
          </text>
        </g>

        {/* Ondas NFC */}
        <g fill="none" stroke="var(--lp-accent)" strokeWidth="3" strokeLinecap="round">
          <path className="lp-wave" d="M150 96 a28 28 0 0 1 0 40" />
          <path className="lp-wave" d="M160 84 a44 44 0 0 1 0 64" />
          <path className="lp-wave" d="M170 72 a60 60 0 0 1 0 88" />
        </g>

        {/* Celular */}
        <g transform="translate(196 28) rotate(10)">
          <rect x="0" y="0" width="92" height="184" rx="18" fill="var(--lp-ink)" />
          <rect x="6" y="6" width="80" height="172" rx="14" fill="var(--lp-surface)" />
          <rect x="30" y="12" width="32" height="6" rx="3" fill="var(--lp-ink)" opacity="0.6" />
          {/* Tela do formulário */}
          <rect x="16" y="34" width="44" height="7" rx="3.5" fill="var(--lp-ink)" opacity="0.85" />
          <rect x="16" y="50" width="60" height="12" rx="4" fill="var(--lp-bg-2)" stroke="var(--lp-line)" />
          <rect x="16" y="68" width="60" height="12" rx="4" fill="var(--lp-bg-2)" stroke="var(--lp-line)" />
          <rect x="16" y="90" width="10" height="10" rx="2" fill="none" stroke="var(--lp-ink)" strokeWidth="1.5" opacity="0.6" />
          <rect x="30" y="92" width="44" height="6" rx="3" fill="var(--lp-line)" />
          <rect x="16" y="106" width="10" height="10" rx="2" fill="none" stroke="var(--lp-ink)" strokeWidth="1.5" opacity="0.6" />
          <rect x="30" y="108" width="36" height="6" rx="3" fill="var(--lp-line)" />
          <rect x="16" y="140" width="60" height="18" rx="6" fill="var(--lp-accent)" />
          <rect x="34" y="147" width="24" height="4" rx="2" fill="var(--lp-accent-ink)" />
        </g>
      </svg>
      {legenda && (
        <figcaption className="text-center text-sm text-(--lp-muted)">{legenda}</figcaption>
      )}
    </figure>
  );
}
