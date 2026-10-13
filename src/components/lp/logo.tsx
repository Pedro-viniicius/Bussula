import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo oficial da Bússola. Só existe a versão branca, então ele aparece
 * apenas sobre fundo escuro (barra de navegação, seções brand-dark).
 *
 * Os PNGs em /public/brand são os originais da pasta de identidade com a
 * margem transparente removida. Nada foi redesenhado, recolorido, cortado,
 * esticado ou ganhou efeito. A proporção é sempre a do arquivo.
 *
 * Área de proteção: quem usa este componente reserva ao redor pelo menos a
 * altura do logo (o símbolo ocupa a altura inteira).
 */
const ARQUIVOS = {
  simples: { src: "/brand/bussola-logo-branco.png", w: 916, h: 185 },
  registrada: { src: "/brand/bussola-logo-branco-r.png", w: 954, h: 184 },
} as const;

export function Logo({
  altura = 18,
  versao = "simples",
  className,
}: {
  altura?: number;
  versao?: keyof typeof ARQUIVOS;
  className?: string;
}) {
  const a = ARQUIVOS[versao];
  return (
    <Image
      src={a.src}
      width={a.w}
      height={a.h}
      alt="Bússola"
      unoptimized
      priority={versao === "simples"}
      style={{ height: altura, width: "auto" }}
      className={cn("block select-none", className)}
    />
  );
}
