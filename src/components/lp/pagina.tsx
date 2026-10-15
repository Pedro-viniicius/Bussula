import { Canais, ComoFunciona, CtaFinal, Faq, Hero, Nav, Painel, Piloto, Privacidade, Problema, ProvaSocial, Usos, Visao } from "./secoes";
import { RevelarAoRolar } from "./revelar";

/**
 * Ritmo de fundos: branco e cinza-claro se alternam; as duas seções
 * azul-escuras (privacidade e convite final) são os pontos de contraste.
 */
export function PaginaLp() {
  return (
    <div className="lp min-h-full flex-1">
      <Nav />
      <main>
        <Hero />
        <Problema />
        <ComoFunciona />
        <Painel />
        <Usos />
        <Privacidade />
        <Canais />
        <Visao />
        <Piloto />
        <ProvaSocial />
        <Faq />
      </main>
      <CtaFinal />
      <RevelarAoRolar />
    </div>
  );
}
