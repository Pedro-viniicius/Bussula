import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  DoorOpen,
  Keyboard,
  ListChecks,
  MessageCircle,
  Monitor,
  Nfc,
  Package,
  Plug,
  QrCode,
  ShieldCheck,
  Star,
  Tag,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LP } from "@/lib/texts/lp";
import { Logo } from "./logo";
import { Toque } from "./toque";
import { PainelMock } from "./painel-mock";
import { DemoMascara } from "./demo-mascara";
import { FormPiloto } from "./form-piloto";

/* ---------- blocos de apoio ---------- */

function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-6 lg:px-10", className)}>{children}</div>;
}

/** Cabeçalho de seção centralizado: eyebrow, título e no máximo duas linhas de apoio. */
function Cabecalho({
  eyebrow,
  titulo,
  texto,
  escuro = false,
  extra,
}: {
  eyebrow: string;
  titulo: string;
  texto?: string;
  escuro?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[900px] text-center" data-reveal>
      <div className="flex items-center justify-center gap-2">
        <p className={cn("lp-eyebrow", escuro ? "text-brand-light" : "text-ink-muted")}>{eyebrow}</p>
        {extra}
      </div>
      <h2 className={cn("lp-h2 mt-3", escuro ? "text-white" : "text-ink")}>{titulo}</h2>
      {texto && (
        <p className={cn("lp-lead mx-auto mt-5 max-w-[680px]", escuro ? "text-white/80" : "text-ink-muted")}>{texto}</p>
      )}
    </div>
  );
}

function BotaoPrimario({ href = "#piloto-form", children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 text-[17px] font-medium text-white transition-colors hover:bg-brand-dark active:bg-brand-dark",
        className,
      )}
    >
      {children}
    </a>
  );
}

function LinkSeta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex min-h-12 items-center gap-0.5 text-[17px] font-medium text-brand hover:underline">
      {children}
      <ChevronRight className="size-4" aria-hidden />
    </a>
  );
}

function SeloEmBreve({ escuro = false }: { escuro?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap",
        escuro ? "border-white/30 text-white/80" : "border-ink-muted/40 text-ink-muted",
      )}
    >
      <Clock className="size-3" aria-hidden />
      {LP.canais.emBreveRotulo}
    </span>
  );
}

/* ---------- navegação ---------- */

export function Nav() {
  const N = LP.nav;
  const links = [
    ["#como-funciona", N.comoFunciona],
    ["#privacidade", N.privacidade],
    ["#piloto", N.piloto],
    ["#perguntas", N.perguntas],
  ] as const;
  return (
    <header className="sticky top-0 z-30 bg-ink/92 backdrop-blur-xl backdrop-saturate-150">
      {/* Altura 56px com logo de 18px: 19px de respiro acima e abaixo, mais que a altura do símbolo. */}
      <Container className="flex h-14 items-center justify-between gap-6">
        <a href="#topo" aria-label="Bússola, início da página" className="shrink-0">
          <Logo altura={18} />
        </a>
        <nav aria-label="Seções da página" className="hidden items-center gap-8 text-[13px] text-white/80 md:flex">
          {links.map(([href, txt]) => (
            <a key={href} href={href} className="transition-colors hover:text-white">
              {txt}
            </a>
          ))}
        </nav>
        <a
          href="#piloto-form"
          className="inline-flex min-h-8 items-center rounded-full bg-brand px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-dark"
        >
          {N.cta}
        </a>
      </Container>
    </header>
  );
}

/* ---------- 1. hero ---------- */

export function Hero() {
  const H = LP.hero;
  return (
    <section id="topo" className="lp-secao bg-canvas pt-20! lg:pt-28!">
      <Container className="text-center">
        <p className="lp-eyebrow text-ink-muted">{H.selo}</p>
        <h1 className="lp-h1 mx-auto mt-4 max-w-[14ch] text-ink">{H.titulo}</h1>
        <p className="lp-lead mx-auto mt-6 max-w-[620px] text-ink-muted">{H.subtitulo}</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
          <BotaoPrimario>{H.ctaPrimario}</BotaoPrimario>
          <LinkSeta href="#como-funciona">{H.ctaSecundario}</LinkSeta>
        </div>
        <p className="mx-auto mt-6 max-w-[560px] text-[15px] text-ink-muted">{H.provas.join(" · ")}</p>
      </Container>

      <Container className="mt-16 max-w-[1100px] lg:mt-24">
        <div data-reveal>
          <PainelMock modo="compacto" />
          <p className="mt-4 text-center text-[13px] text-ink-muted">{H.legendaMock}</p>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 2. problema ---------- */

export function Problema() {
  const S = LP.problema;
  return (
    <section className="lp-secao bg-canvas-alt">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} />
        <div className="mx-auto mt-16 grid max-w-[1040px] gap-10 md:grid-cols-3 md:gap-12 lg:mt-24" data-reveal>
          {S.dores.map((d) => (
            <div key={d.titulo} className="border-t border-hairline pt-6">
              <h3 className="text-[21px] leading-snug font-semibold tracking-tight">{d.titulo}</h3>
              <p className="mt-3 text-ink-muted">{d.texto}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- 3. como funciona ---------- */

export function ComoFunciona() {
  const S = LP.comoFunciona;
  return (
    <section id="como-funciona" className="lp-secao scroll-mt-14 bg-canvas">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} />
        <div className="mx-auto mt-14 max-w-[620px] lg:mt-20" data-reveal>
          <Toque />
        </div>
        <ol className="mx-auto mt-16 grid max-w-[1040px] gap-10 md:grid-cols-3 md:gap-12 lg:mt-24" data-reveal>
          {S.passos.map((p) => (
            <li key={p.numero}>
              <p className="text-[15px] font-medium text-ink-muted tabular-nums">{p.numero}</p>
              <h3 className="mt-2 text-[28px] font-semibold tracking-tight">{p.titulo}</h3>
              <p className="mt-3 text-ink-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ---------- 4. painel ---------- */

export function Painel() {
  const S = LP.painel;
  return (
    <section className="lp-secao bg-canvas-alt">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} texto={S.texto} />
        <div className="mx-auto mt-14 max-w-[1120px] lg:mt-20" data-reveal>
          <PainelMock />
          <p className="mt-4 text-center text-[13px] text-ink-muted">{S.legenda}</p>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 5. usos ---------- */

export function Usos() {
  const S = LP.usos;
  const icones = [UserRound, Star, MessageCircle, DoorOpen, ListChecks, ShieldCheck];
  return (
    <section className="lp-secao bg-canvas">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-5" data-reveal>
          {S.casos.map((c, i) => {
            const Icone = icones[i];
            return (
              <li key={c.titulo} className="rounded-[24px] bg-canvas-alt p-8 lg:p-10">
                <Icone className="size-7 text-ink" strokeWidth={1.6} aria-hidden />
                <h3 className="mt-6 text-[21px] font-semibold tracking-tight">{c.titulo}</h3>
                <p className="mt-2 text-ink-muted">{c.texto}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ---------- 6. privacidade (seção escura) ---------- */

export function Privacidade() {
  const S = LP.privacidade;
  return (
    <section id="privacidade" className="lp-secao lp-escuro scroll-mt-14 bg-brand-dark text-white">
      <Container>
        <Cabecalho escuro eyebrow={S.rotulo} titulo={S.titulo} texto={S.texto} />
        <div className="mx-auto mt-14 max-w-[640px] lg:mt-20" data-reveal>
          <DemoMascara />
        </div>
        <ul className="mx-auto mt-16 grid max-w-[1040px] gap-x-12 gap-y-10 sm:grid-cols-2 lg:mt-24" data-reveal>
          {S.garantias.map((g) => (
            <li key={g.titulo} className="flex gap-4">
              <ShieldCheck className="mt-1 size-6 shrink-0 text-brand-light" strokeWidth={1.6} aria-hidden />
              <div>
                <h3 className="text-[19px] font-semibold tracking-tight">{g.titulo}</h3>
                <p className="mt-2 text-white/80">{g.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="lp-lead mx-auto mt-16 max-w-[680px] text-center font-semibold text-brand-light lg:mt-24" data-reveal>
          {S.fechamento}
        </p>
      </Container>
    </section>
  );
}

/* ---------- 7. canais ---------- */

export function Canais() {
  const S = LP.canais;
  const icDisp = [Nfc, QrCode, Keyboard];
  const icBreve = [MessageCircle, Monitor, DoorOpen, Plug];
  return (
    <section className="lp-secao bg-canvas">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} />

        <div className="mx-auto mt-14 max-w-[1040px] lg:mt-20" data-reveal>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-white">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
            {S.disponivelRotulo}
          </p>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {S.disponiveis.map((c, i) => {
              const Icone = icDisp[i];
              return (
                <li key={c.titulo} className="rounded-[24px] border-2 border-brand p-7">
                  <span className="flex size-12 items-center justify-center rounded-full bg-brand text-white">
                    <Icone className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-[21px] font-semibold tracking-tight">{c.titulo}</h3>
                  <p className="mt-1 text-ink-muted">{c.texto}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mx-auto mt-14 max-w-[1040px]" data-reveal>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-muted">
            <Clock className="size-5" aria-hidden />
            {S.emBreveRotulo}
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {S.emBreve.map((c, i) => {
              const Icone = icBreve[i];
              return (
                <li key={c.titulo} className="rounded-[24px] border border-dashed border-ink-muted/40 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <Icone className="size-6 text-ink-muted" strokeWidth={1.6} aria-hidden />
                    <SeloEmBreve />
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold text-ink-muted">{c.titulo}</h3>
                  <p className="mt-1 text-[15px] text-ink-muted">{c.texto}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 8. visão ---------- */

export function Visao() {
  const S = LP.visao;
  const icones = [Package, Tag, Users, Bell, MessageCircle, BookOpen];
  return (
    <section className="lp-secao bg-canvas-alt">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} texto={S.texto} extra={<SeloEmBreve />} />
        <ul className="mx-auto mt-14 grid max-w-[1040px] gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3" data-reveal>
          {S.itens.map((it, i) => {
            const Icone = icones[i];
            return (
              <li key={it.titulo} className="rounded-[24px] border border-dashed border-ink-muted/40 p-7">
                <Icone className="size-6 text-ink-muted" strokeWidth={1.6} aria-hidden />
                <h3 className="mt-5 text-[17px] font-semibold">{it.titulo}</h3>
                <p className="mt-1 text-[15px] text-ink-muted">{it.texto}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ---------- 9. piloto ---------- */

export function Piloto() {
  const S = LP.piloto;
  return (
    <section id="piloto" className="lp-secao scroll-mt-14 bg-canvas">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} texto={S.texto} />
        <ol className="mx-auto mt-14 grid max-w-[1040px] gap-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-8" data-reveal>
          {S.etapas.map((e, i) => (
            <li key={e.titulo} className="border-t border-hairline pt-6">
              <p className="text-[15px] font-medium text-ink-muted tabular-nums">0{i + 1}</p>
              <h3 className="mt-2 text-[19px] font-semibold tracking-tight">{e.titulo}</h3>
              <p className="mt-2 text-[15px] text-ink-muted">{e.texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14 flex flex-col items-center gap-3 lg:mt-20" data-reveal>
          <BotaoPrimario>{S.cta}</BotaoPrimario>
          <p className="text-[15px] text-ink-muted">{S.investimento}</p>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 10. prova social (reservado) ---------- */

export function ProvaSocial() {
  const S = LP.provaSocial;
  const caixa = "rounded-[24px] border-2 border-dashed border-ink-muted/30 p-8 text-ink-muted";
  return (
    <section className="lp-secao bg-canvas-alt">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} />
        <div className="mx-auto mt-14 max-w-[1040px] lg:mt-20" data-reveal>
          <figure className={cn(caixa, "text-center")}>
            <blockquote className="lp-lead">“{S.depoimento}”</blockquote>
            <figcaption className="mt-4 text-[15px]">{S.autor}</figcaption>
          </figure>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {S.numeros.map((n, i) => (
              <div key={i} className={cn(caixa, "text-center")}>
                <p className="text-[28px] font-semibold tracking-tight">{n.valor}</p>
                <p className="mt-1 text-[15px]">{n.rotulo}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {S.logos.map((l, i) => (
              <li key={i} className={cn(caixa, "flex min-h-24 items-center justify-center text-center text-[15px]")}>
                {l}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 11. faq ---------- */

export function Faq() {
  const S = LP.faq;
  return (
    <section id="perguntas" className="lp-secao scroll-mt-14 bg-canvas">
      <Container>
        <Cabecalho eyebrow={S.rotulo} titulo={S.titulo} />
        <div className="mx-auto mt-14 max-w-[680px] divide-y divide-hairline border-y border-hairline lg:mt-20" data-reveal>
          {S.itens.map((it) => (
            <details key={it.pergunta}>
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-6 py-6 text-left text-[19px] font-semibold tracking-tight">
                {it.pergunta}
                <ChevronDown className="lp-chevron size-5 shrink-0 text-ink-muted transition-transform" aria-hidden />
              </summary>
              <p className="pb-7 text-ink-muted">{it.resposta}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- 12. cta final + rodapé (seção escura) ---------- */

export function CtaFinal() {
  const S = LP.ctaFinal;
  const R = LP.rodape;
  return (
    <section id="piloto-form" className="lp-escuro scroll-mt-14 bg-brand-dark text-white">
      <div className="lp-secao">
        <Container className="text-center">
          {/* Logo com ®, 28px de altura e no mínimo 28px de respiro em todos os lados. */}
          <div className="flex justify-center p-7" data-reveal>
            <Logo altura={28} versao="registrada" />
          </div>
          <h2 className="lp-h2 mx-auto mt-10 max-w-[760px]" data-reveal>
            {S.titulo}
          </h2>
          <p className="lp-lead mx-auto mt-5 max-w-[620px] text-white/80" data-reveal>
            {S.texto}
          </p>
          <div className="mx-auto mt-12 max-w-[640px] rounded-[28px] bg-canvas p-6 sm:p-10 lg:mt-16" data-reveal>
            <FormPiloto />
          </div>
        </Container>
      </div>

      <footer className="border-t border-white/15 py-12 text-[13px] text-white/75">
        <Container className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[15px] font-medium text-white">{R.frase}</p>
            <ul className="mt-3 space-y-1">
              {R.linhas.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <p>{R.politica}</p>
        </Container>
      </footer>
    </section>
  );
}
