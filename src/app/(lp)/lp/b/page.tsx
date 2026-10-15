import { permanentRedirect } from "next/navigation";

// A comparação entre duas direções acabou: a identidade Bússola é a única. Links antigos caem em /lp.
export default function DirecaoBAntiga() {
  permanentRedirect("/lp");
}
