import { cn } from "@/lib/utils";

/**
 * O gesto do produto: o celular encostando no cartão NFC da equipe.
 * O cartão é azul-escuro e leva o logo oficial (branco) sem alteração,
 * reto e com área de proteção maior que a altura do logo.
 */
export function Toque({ className, rotulo = "Celular encostando no cartão NFC da equipe" }: { className?: string; rotulo?: string }) {
  return (
    <svg viewBox="0 0 360 260" role="img" aria-label={rotulo} className={cn("h-auto w-full", className)}>
      {/* Cartão NFC */}
      <g transform="translate(24 120)">
        <rect width="190" height="120" rx="14" fill="var(--color-brand-dark)" />
        <rect x="18" y="18" width="38" height="28" rx="6" fill="var(--color-brand-light)" />
        <image href="/brand/bussola-logo-branco.png" x="98" y="88" width="74" height="15" preserveAspectRatio="xMinYMid meet" />
      </g>

      {/* Ondas de aproximação */}
      <g fill="none" stroke="var(--color-brand)" strokeWidth="3.5" strokeLinecap="round">
        <path className="lp-wave" d="M196 108 a30 30 0 0 1 0 44" />
        <path className="lp-wave" d="M208 94 a48 48 0 0 1 0 72" />
        <path className="lp-wave" d="M220 80 a66 66 0 0 1 0 100" />
      </g>

      {/* Celular */}
      <g transform="translate(232 18) rotate(9)">
        <rect width="100" height="204" rx="20" fill="var(--color-ink)" />
        <rect x="6" y="6" width="88" height="192" rx="15" fill="#ffffff" />
        <rect x="36" y="13" width="28" height="6" rx="3" fill="var(--color-ink)" opacity="0.7" />
        <rect x="16" y="36" width="50" height="8" rx="4" fill="var(--color-ink)" />
        <rect x="16" y="54" width="68" height="14" rx="5" fill="var(--color-canvas-alt)" stroke="var(--color-hairline)" />
        <rect x="16" y="74" width="68" height="14" rx="5" fill="var(--color-canvas-alt)" stroke="var(--color-hairline)" />
        <rect x="16" y="98" width="11" height="11" rx="3" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" />
        <rect x="32" y="101" width="48" height="5" rx="2.5" fill="var(--color-hairline)" />
        <rect x="16" y="116" width="11" height="11" rx="3" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" />
        <rect x="32" y="119" width="38" height="5" rx="2.5" fill="var(--color-hairline)" />
        <rect x="16" y="160" width="68" height="20" rx="10" fill="var(--color-brand)" />
        <rect x="36" y="168" width="28" height="4" rx="2" fill="#ffffff" />
      </g>
    </svg>
  );
}
