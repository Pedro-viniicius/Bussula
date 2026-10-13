import Link from "next/link";
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
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
import { Toque } from "./toque";
import { PainelMock } from "./painel-mock";
import { DemoMascara } from "./demo-mascara";
import { FormPiloto } from "./form-piloto";

export type Variante = "a" | "b";
type P = { variante: Variante };

/* ---------- blocos de apoio ---------- */

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

function Rotulo({ children, centro = false }: { children: React.ReactNode; centro?: boolean }) {
  return (
    <p className={cn("text-xs font-semibold tracking-[0.14em] text-(--lp-accent) uppercase", centro && "text-center")}>
      {children}
    </p>
  );
}

function Titulo({ children, centro = false, className }: { children: React.ReactNode; centro?: boolean; className?: string }) {
  return (
    <h2 className={cn("mt-3 max-w-3xl text-3xl leading-tight font-bold sm:text-4xl", centro && "mx-auto text-center", className)}>
      {children}
    </h2>
  );
}

export function BotaoCta({
  href = "#piloto-form",
  children,
  secundario = false,
  className,
}: {
  href?: string;
  children: React.ReactNode;
  secundario?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-base font-semibold transition-opacity",
        secundario
          ? "border border-(--lp-line) bg-(--lp-surface) text-(--lp-ink) hover:border-(--lp-accent)"
          : "bg-(--lp-accent) text-(--lp-accent-ink) hover:opacity-90",
        className,
      )}
    >
      {children}
    </a>
  );
}

/* ---------- 0. navegação ---------- */

export function Nav({ variante }: P) {
  const N = LP.nav;
  const base = variante === "a" ? "/lp" : "/lp/b";
  const links = [
    [`${base}#como-funciona`, N.comoFunciona],
    [`${base}#privacidade`, N.privacidade],
    [`${base}#piloto`, N.piloto],
    [`${base}#perguntas`, N.perguntas],
  ] as const;
  return (
    <header className="sticky top-0 z-20 border-b border-(--lp-line) bg-(--lp-bg)/85 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link href={base} className="lp-display text-lg font-bold tracking-tight">
          {N.marca}
        </Link>
        <nav aria-label="Seções da página" className="hidden items-center gap-6 text-sm text-(--lp-ink-2) md:flex">
          {links.map(([href, txt]) => (
            <a key={href} href={href} className="hover:text-(--lp-ink)">
              {txt}
            </a>
          ))}
        </nav>
        <a
          href="#piloto-form"
          className="inline-flex min-h-10 items-center rounded-lg bg-(--lp-accent) px-4 text-sm font-semibold text-(--lp-accent-ink) hover:opacity-90"
        >
          {N.cta}
        </a>
      </Container>
    </header>
  );
}

/* ---------- 1. hero ---------- */

export function Hero({ variante }: P) {
  const H = LP.hero;
  const provas = (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-(--lp-ink-2)">
      {H.provas.map((p) => (
        <li key={p} className="flex items-center gap-1.5">
          <Check className="size-4 text-(--lp-accent)" aria-hidden />
          {p}
        </li>
      ))}
    </ul>
  );

  if (variante === "b") {
    return (
      <section className="pt-14 pb-10 sm:pt-20">
        <Container className="flex flex-col items-center text-center">
          <p className="rounded-full border border-(--lp-line) px-3 py-1 text-xs text-(--lp-muted)">{H.selo}</p>
          <h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">{H.titulo}</h1>
          <p className="mt-6 max-w-2xl text-lg text-(--lp-ink-2) sm:text-xl">{H.subtitulo}</p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <BotaoCta>{H.ctaPrimario}</BotaoCta>
            <BotaoCta href="#como-funciona" secundario>
              {H.ctaSecundario}
            </BotaoCta>
          </div>
          <div className="mt-6">{provas}</div>
        </Container>
        <Container className="mt-12 grid items-center gap-8 lg:grid-cols-[1fr_2fr]">
          <Toque className="mx-auto max-w-[280px] lg:max-w-none" />
          <div>
            <PainelMock modo="compacto" />
            <p className="mt-2 text-center text-xs text-(--lp-muted)">{H.legendaMock}</p>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="pt-12 pb-8 sm:pt-16 lg:pb-16">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <p className="inline-block rounded-full bg-(--lp-accent-soft) px-3 py-1 text-xs font-medium text-(--lp-accent)">
            {H.selo}
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">{H.titulo}</h1>
          <p className="mt-5 max-w-xl text-lg text-(--lp-ink-2) sm:text-xl">{H.subtitulo}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <BotaoCta>{H.ctaPrimario}</BotaoCta>
            <BotaoCta href="#como-funciona" secundario>
              {H.ctaSecundario}
            </BotaoCta>
          </div>
          <div className="mt-6">{provas}</div>
          <Toque className="mt-8 max-w-[260px] lg:mt-12 lg:max-w-[300px]" />
        </div>
        <div>
          <PainelMock modo="compacto" />
          <p className="mt-2 text-center text-xs text-(--lp-muted)">{H.legendaMock}</p>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 2. problema ---------- */

export function Problema({ variante }: P) {
  const S = LP.problema;
  return (
    <section className={cn("py-16 sm:py-20", variante === "a" && "bg-(--lp-bg-2)")}>
      <Container>
        <Rotulo>{S.rotulo}</Rotulo>
        <Titulo>{S.titulo}</Titulo>
        {variante === "a" ? (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {S.dores.map((d, i) => (
              <div key={d.titulo} className="rounded-(--lp-radius) border border-(--lp-line) bg-(--lp-surface) p-6">
                <span className="text-sm font-semibold text-(--lp-accent) tabular-nums">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{d.titulo}</h3>
                <p className="mt-2 text-(--lp-ink-2)">{d.texto}</p>
              </div>
            ))}
          </div>
        ) : (
          <ol className="mt-10 divide-y divide-(--lp-line) border-y border-(--lp-line)">
            {S.dores.map((d, i) => (
              <li key={d.titulo} className="grid gap-2 py-6 sm:grid-cols-[4rem_1fr] sm:gap-6">
                <span className="lp-display text-3xl text-(--lp-accent)">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold">{d.titulo}</h3>
                  <p className="mt-2 max-w-2xl text-(--lp-ink-2)">{d.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Container>
    </section>
  );
}

/* ---------- 3. como funciona ---------- */

export function ComoFunciona({ variante }: P) {
  const S = LP.comoFunciona;
  const icones = [Nfc, Clock, Monitor];
  return (
    <section id="como-funciona" className="scroll-mt-16 py-16 sm:py-20">
      <Container>
        <Rotulo centro={variante === "b"}>{S.rotulo}</Rotulo>
        <Titulo centro={variante === "b"}>{S.titulo}</Titulo>
        {variante === "a" ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {S.passos.map((p, i) => {
              const Icone = icones[i];
              return (
                <div key={p.numero} className="relative rounded-(--lp-radius) border border-(--lp-line) bg-(--lp-surface) p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-(--lp-accent-soft) text-(--lp-accent)">
                      <Icone className="size-5" aria-hidden />
                    </span>
                    <span className="text-5xl font-bold text-(--lp-line) tabular-nums">{p.numero}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{p.titulo}</h3>
                  <p className="mt-2 text-(--lp-ink-2)">{p.texto}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <ol className="mx-auto mt-12 max-w-3xl space-y-10">
            {S.passos.map((p, i) => {
              const Icone = icones[i];
              return (
                <li key={p.numero} className="grid gap-4 sm:grid-cols-[5rem_1fr] sm:gap-8">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                    <span className="lp-display text-4xl text-(--lp-accent)">{p.numero}</span>
                    <Icone className="size-6 text-(--lp-muted)" aria-hidden />
                  </div>
                  <div className="border-l border-(--lp-line) pl-5 sm:pl-8">
                    <h3 className="text-2xl font-semibold">{p.titulo}</h3>
                    <p className="mt-2 text-lg text-(--lp-ink-2)">{p.texto}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-10 flex justify-center">
          <BotaoCta>{LP.nav.cta}</BotaoCta>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 4. painel em destaque ---------- */

export function Painel({ variante }: P) {
  const S = LP.painel;
  return (
    <section className={cn("py-16 sm:py-20", variante === "a" ? "bg-(--lp-bg-2)" : "bg-(--lp-bg-2)")}>
      <Container>
        <div className={cn(variante === "b" && "text-center")}>
          <Rotulo centro={variante === "b"}>{S.rotulo}</Rotulo>
          <Titulo centro={variante === "b"}>{S.titulo}</Titulo>
          <p className={cn("mt-4 max-w-2xl text-lg text-(--lp-ink-2)", variante === "b" && "mx-auto")}>{S.texto}</p>
        </div>
        <PainelMock className="mt-10" />
        <p className="mt-3 text-center text-xs text-(--lp-muted)">{S.legenda}</p>
      </Container>
    </section>
  );
}

/* ---------- 5. usos ---------- */

export function Usos({ variante }: P) {
  const S = LP.usos;
  const icones = [UserRound, Star, MessageCircle, DoorOpen, ListChecks, ShieldCheck];
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <Rotulo>{S.rotulo}</Rotulo>
        <Titulo>{S.titulo}</Titulo>
        <ul className={cn("mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", variante === "b" && "gap-px bg-(--lp-line) sm:gap-px")}>
          {S.casos.map((c, i) => {
            const Icone = icones[i];
            return (
              <li
                key={c.titulo}
                className={cn(
                  "flex gap-4 p-5",
                  variante === "a" ? "rounded-(--lp-radius) border border-(--lp-line) bg-(--lp-surface)" : "bg-(--lp-bg)",
                )}
              >
                <Icone className="mt-0.5 size-5 shrink-0 text-(--lp-accent)" aria-hidden />
                <div>
                  <h3 className="font-semibold">{c.titulo}</h3>
                  <p className="mt-1 text-sm text-(--lp-ink-2)">{c.texto}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ---------- 6. privacidade ---------- */

export function Privacidade({ variante }: P) {
  const S = LP.privacidade;
  return (
    <section id="privacidade" className={cn("scroll-mt-16 py-16 sm:py-20", "bg-(--lp-bg-2)")}>
      <Container className={cn("grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16", variante === "b" && "lg:[&>*:first-child]:order-2")}>
        <div>
          <Rotulo>{S.rotulo}</Rotulo>
          <Titulo>{S.titulo}</Titulo>
          <p className="mt-4 text-lg text-(--lp-ink-2)">{S.texto}</p>
          <ul className="mt-8 space-y-5">
            {S.garantias.map((g) => (
              <li key={g.titulo} className="flex gap-3">
                <ShieldCheck className="mt-1 size-5 shrink-0 text-(--lp-accent)" aria-hidden />
                <div>
                  <h3 className="font-semibold">{g.titulo}</h3>
                  <p className="mt-1 text-sm text-(--lp-ink-2)">{g.texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-lg font-semibold">{S.fechamento}</p>
        </div>
        <div className="lg:sticky lg:top-24">
          <DemoMascara />
        </div>
      </Container>
    </section>
  );
}

/* ---------- 7. canais ---------- */

export function Canais({ variante }: P) {
  const S = LP.canais;
  const icDisp = [Nfc, QrCode, Keyboard];
  const icBreve = [MessageCircle, Monitor, DoorOpen, Plug];
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <Rotulo centro={variante === "b"}>{S.rotulo}</Rotulo>
        <Titulo centro={variante === "b"}>{S.titulo}</Titulo>

        <div className="mt-10 grid gap-8 lg:grid-cols-[3fr_4fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-(--lp-accent)">
              <Check className="size-4" aria-hidden /> {S.disponivelRotulo}
            </p>
            <ul className="mt-3 grid gap-3">
              {S.disponiveis.map((c, i) => {
                const Icone = icDisp[i];
                return (
                  <li key={c.titulo} className="flex items-center gap-4 rounded-(--lp-radius) border-2 border-(--lp-accent)/60 bg-(--lp-surface) p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--lp-accent) text-(--lp-accent-ink)">
                      <Icone className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold">{c.titulo}</h3>
                      <p className="text-sm text-(--lp-ink-2)">{c.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-(--lp-muted)">
              <Clock className="size-4" aria-hidden /> {S.emBreveRotulo}
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {S.emBreve.map((c, i) => {
                const Icone = icBreve[i];
                return (
                  <li key={c.titulo} className="flex items-center gap-4 rounded-(--lp-radius) border border-dashed border-(--lp-line) p-4 text-(--lp-muted)">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-dashed border-(--lp-line)">
                      <Icone className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="flex flex-wrap items-center gap-2 font-semibold text-(--lp-ink-2)">
                        {c.titulo}
                        <span className="rounded-full border border-(--lp-line) px-2 py-0.5 text-[10px] tracking-wide uppercase">
                          {S.emBreveRotulo}
                        </span>
                      </h3>
                      <p className="text-sm">{c.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 8. visão ---------- */

export function Visao({ variante }: P) {
  const S = LP.visao;
  const icones = [Package, Tag, Users, Bell, MessageCircle, BookOpen];
  return (
    <section className="bg-(--lp-bg-2) py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-center gap-3">
          <Rotulo>{S.rotulo}</Rotulo>
          <span className="rounded-full border border-dashed border-(--lp-line) px-2 py-0.5 text-[10px] tracking-wide text-(--lp-muted) uppercase">
            {LP.canais.emBreveRotulo}
          </span>
        </div>
        <Titulo>{S.titulo}</Titulo>
        <p className="mt-4 max-w-2xl text-lg text-(--lp-ink-2)">{S.texto}</p>
        <ul className={cn("mt-10 grid gap-3", variante === "a" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
          {S.itens.map((it, i) => {
            const Icone = icones[i];
            return (
              <li key={it.titulo} className="flex gap-4 rounded-(--lp-radius) border border-dashed border-(--lp-line) p-5">
                <Icone className="mt-0.5 size-5 shrink-0 text-(--lp-muted)" aria-hidden />
                <div>
                  <h3 className="font-semibold text-(--lp-ink-2)">{it.titulo}</h3>
                  <p className="mt-1 text-sm text-(--lp-muted)">{it.texto}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ---------- 9. piloto ---------- */

export function Piloto({ variante }: P) {
  const S = LP.piloto;
  return (
    <section id="piloto" className="scroll-mt-16 py-16 sm:py-20">
      <Container>
        <div
          className={cn(
            "rounded-(--lp-radius) p-6 sm:p-10",
            variante === "a" ? "bg-(--lp-ink) text-white" : "border border-(--lp-accent)/50 bg-(--lp-accent-soft)",
          )}
        >
          <p className="text-xs font-semibold tracking-[0.14em] text-(--lp-accent) uppercase">{S.rotulo}</p>
          <h2 className="mt-3 max-w-2xl text-3xl leading-tight font-bold sm:text-4xl">{S.titulo}</h2>
          <p className={cn("mt-4 max-w-2xl text-lg", variante === "a" ? "text-white/75" : "text-(--lp-ink-2)")}>{S.texto}</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {S.etapas.map((e, i) => (
              <li key={e.titulo} className={cn("border-t pt-4", variante === "a" ? "border-white/20" : "border-(--lp-accent)/40")}>
                <span className="text-sm font-semibold text-(--lp-accent) tabular-nums">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{e.titulo}</h3>
                <p className={cn("mt-1 text-sm", variante === "a" ? "text-white/75" : "text-(--lp-ink-2)")}>{e.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <BotaoCta>{S.cta}</BotaoCta>
            <span className={cn("text-sm", variante === "a" ? "text-white/60" : "text-(--lp-muted)")}>{S.investimento}</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------- 10. prova social (reservado) ---------- */

export function ProvaSocial() {
  const S = LP.provaSocial;
  const caixa = "rounded-(--lp-radius) border-2 border-dashed border-(--lp-line) p-6 text-(--lp-muted)";
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <Rotulo>{S.rotulo}</Rotulo>
        <Titulo>{S.titulo}</Titulo>
        <div className="mt-10 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <figure className={cn(caixa, "flex flex-col justify-between")}>
            <blockquote className="text-xl">“{S.depoimento}”</blockquote>
            <figcaption className="mt-6 text-sm">{S.autor}</figcaption>
          </figure>
          <div className="grid gap-4">
            {S.numeros.map((n, i) => (
              <div key={i} className={caixa}>
                <p className="text-2xl font-bold">{n.valor}</p>
                <p className="mt-1 text-sm">{n.rotulo}</p>
              </div>
            ))}
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-4">
          {S.logos.map((l, i) => (
            <li key={i} className={cn(caixa, "flex min-h-20 items-center justify-center text-center text-sm")}>
              {l}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ---------- 11. faq ---------- */

export function Faq({ variante }: P) {
  const S = LP.faq;
  return (
    <section id="perguntas" className="scroll-mt-16 bg-(--lp-bg-2) py-16 sm:py-20">
      <Container className="max-w-3xl">
        <Rotulo centro={variante === "b"}>{S.rotulo}</Rotulo>
        <Titulo centro={variante === "b"}>{S.titulo}</Titulo>
        <div className="mt-10 divide-y divide-(--lp-line) border-y border-(--lp-line)">
          {S.itens.map((it) => (
            <details key={it.pergunta} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-left text-lg font-semibold">
                {it.pergunta}
                <ChevronDown className="lp-chevron size-5 shrink-0 text-(--lp-muted) transition-transform" aria-hidden />
              </summary>
              <p className="pb-5 text-(--lp-ink-2)">{it.resposta}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- 12. cta final ---------- */

export function CtaFinal({ variante }: P) {
  const S = LP.ctaFinal;
  return (
    <section id="piloto-form" className="scroll-mt-16 py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Rotulo>{LP.piloto.rotulo}</Rotulo>
          <Titulo>{S.titulo}</Titulo>
          <p className="mt-4 text-lg text-(--lp-ink-2)">{S.texto}</p>
          <Toque className={cn("mt-8 max-w-[240px]", variante === "b" && "opacity-90")} />
        </div>
        <div className="rounded-(--lp-radius) border border-(--lp-line) bg-(--lp-surface) p-6 sm:p-8">
          <FormPiloto idPrefixo={variante} />
        </div>
      </Container>
    </section>
  );
}

/* ---------- rodapé ---------- */

export function Rodape({ variante }: P) {
  const R = LP.rodape;
  return (
    <footer className="border-t border-(--lp-line) py-10 text-sm text-(--lp-muted)">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="lp-display text-lg font-bold text-(--lp-ink)">{R.marca}</p>
          <p className="mt-1">{R.frase}</p>
          <ul className="mt-4 space-y-1">
            {R.linhas.map((l) => (
              <li key={l}>{l}</li>
            ))}
            <li>{R.politica}</li>
          </ul>
        </div>
        <div className="flex items-center gap-3">
          <span>{R.direcoes.comparar}</span>
          <Link href="/lp" className={cn("rounded-md border px-2.5 py-1", variante === "a" ? "border-(--lp-accent) text-(--lp-accent)" : "border-(--lp-line)")}>
            {R.direcoes.a}
          </Link>
          <Link href="/lp/b" className={cn("rounded-md border px-2.5 py-1", variante === "b" ? "border-(--lp-accent) text-(--lp-accent)" : "border-(--lp-line)")}>
            {R.direcoes.b}
          </Link>
        </div>
      </Container>
    </footer>
  );
}
