"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORIGENS, type Origem } from "@/lib/domain";
import { gerarCupom } from "@/lib/coupon";
import { M } from "@/lib/texts/messages";
import { leadSchema, type LeadInput } from "@/lib/validation/lead";
import { mascararTelefone } from "@/lib/validation/phone";
import { Chips } from "./chips";
import { ConsentSection, type Consentimentos } from "./consent-section";
import { Field } from "./field";
import { enviarLead } from "./submit";

export type EventoPublico = {
  slug: string;
  nome: string;
  modelos: string[];
  politicaVersao: string;
};

type Erros = Partial<Record<"nome" | "telefone" | "email" | "consentimentos", string>>;

const CONSENTIMENTOS_VAZIOS: Consentimentos = {
  contato_comercial: false,
  promocao: false,
  marketing: false,
};

function lerOrigem(valor: string | null): Origem {
  return (ORIGENS as readonly string[]).includes(valor ?? "") ? (valor as Origem) : "direto";
}

export function LeadForm({ evento }: { evento: EventoPublico }) {
  const router = useRouter();
  const params = useSearchParams();
  const origem = lerOrigem(params.get("o"));
  const vendedorCodigo = params.get("v")?.trim() || null;
  // Kiosk mode: the salesperson types leads on their own phone, back to back.
  const modoManual = origem === "manual";

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [modelo, setModelo] = useState<string | null>(null);
  const [prazo, setPrazo] = useState<string | null>(null);
  const [consentimentos, setConsentimentos] = useState(CONSENTIMENTOS_VAZIOS);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ultimoCupom, setUltimoCupom] = useState<string | null>(null);
  const enviandoRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const modelos = [...evento.modelos, M.form.naoSei];

  function montarInput(): LeadInput {
    return {
      nome,
      telefone,
      email,
      modeloInteresse: modelo,
      prazoCompra: prazo as LeadInput["prazoCompra"],
      consentimentos: consentimentos as LeadInput["consentimentos"],
      origem,
      vendedorCodigo,
      cupom: gerarCupom(evento.slug),
      chaveIdempotencia: crypto.randomUUID(),
      turnstileToken: null,
      site: (formRef.current?.elements.namedItem("site") as HTMLInputElement | null)?.value ?? "",
    };
  }

  /** Validate one field on blur — never on every keystroke. */
  function validarCampo(campo: keyof Erros) {
    const shape = leadSchema.shape;
    const valor =
      campo === "nome" ? nome
      : campo === "telefone" ? telefone
      : campo === "email" ? email
      : consentimentos;
    const resultado = shape[campo].safeParse(valor);
    setErros((e) => ({
      ...e,
      [campo]: resultado.success ? undefined : resultado.error.issues[0]?.message,
    }));
  }

  function limpar() {
    setNome("");
    setTelefone("");
    setEmail("");
    setModelo(null);
    setPrazo(null);
    setConsentimentos(CONSENTIMENTOS_VAZIOS);
    setErros({});
    formRef.current?.querySelector<HTMLInputElement>("#nome")?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Ref, not state: state updates are async and a double tap lands before re-render.
    if (enviandoRef.current) return;

    const input = montarInput();
    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) {
      const novos: Erros = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as keyof Erros;
        if (campo in { nome: 1, telefone: 1, email: 1, consentimentos: 1 } && !novos[campo]) {
          novos[campo] = issue.message;
        }
      }
      setErros(novos);
      const primeiro = Object.keys(novos)[0];
      formRef.current
        ?.querySelector<HTMLElement>(primeiro === "consentimentos" ? "#consent-contato_comercial" : `#${primeiro}`)
        ?.focus();
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErroGeral(null);
    try {
      const resultado = await enviarLead(input);
      if (!resultado.ok) {
        if (resultado.campo) setErros({ [resultado.campo]: resultado.erro });
        else setErroGeral(resultado.erro);
        return;
      }
      if (modoManual) {
        setUltimoCupom(resultado.cupom);
        limpar();
        window.scrollTo({ top: 0 });
        return;
      }
      try {
        sessionStorage.setItem(`cupom:${evento.slug}`, resultado.cupom);
        if (resultado.enfileirado) sessionStorage.setItem(`offline:${evento.slug}`, "1");
      } catch {
        /* private mode: the query string below carries the coupon */
      }
      router.push(`/f/${evento.slug}/sucesso?c=${resultado.cupom}`);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      {modoManual && (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
          <p>{M.manual.aviso}</p>
          {ultimoCupom && (
            <p role="status" className="mt-1 font-semibold">
              {M.manual.enviado} <span className="font-mono text-lg">{ultimoCupom}</span>
            </p>
          )}
        </div>
      )}

      <Field id="nome" label={M.form.nome} error={erros.nome}>
        <Input
          id="nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => validarCampo("nome")}
          autoFocus
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          placeholder={M.form.nomePlaceholder}
          required
          aria-invalid={!!erros.nome}
          aria-describedby={erros.nome ? "nome-erro" : undefined}
        />
      </Field>

      <Field id="telefone" label={M.form.whatsapp} error={erros.telefone}>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          onBlur={() => validarCampo("telefone")}
          autoComplete="tel-national"
          enterKeyHint="next"
          placeholder={M.form.whatsappPlaceholder}
          required
          aria-invalid={!!erros.telefone}
          aria-describedby={erros.telefone ? "telefone-erro" : undefined}
        />
      </Field>

      <Field id="email" label={M.form.email} hint={M.form.emailOpcional} error={erros.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validarCampo("email")}
          autoComplete="email"
          autoCapitalize="none"
          enterKeyHint="done"
          placeholder={M.form.emailPlaceholder}
          aria-invalid={!!erros.email}
          aria-describedby={erros.email ? "email-erro" : undefined}
        />
      </Field>

      <Chips label={M.form.modelo} name="modelo" options={modelos} value={modelo} onChange={setModelo} />

      <Chips label={M.form.prazo} name="prazo" options={M.prazos} value={prazo} onChange={setPrazo} />

      <ConsentSection
        value={consentimentos}
        onChange={(v) => {
          setConsentimentos(v);
          if (v.contato_comercial) setErros((e) => ({ ...e, consentimentos: undefined }));
        }}
        error={erros.consentimentos}
      />

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div className="absolute -left-[9999px] top-0" aria-hidden="true">
        <label htmlFor="site">Site</label>
        <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {erroGeral && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {erroGeral}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={enviando} aria-busy={enviando}>
        {enviando ? (
          <>
            <Loader2Icon className="animate-spin" aria-hidden="true" />
            {M.form.enviando}
          </>
        ) : (
          M.form.enviar
        )}
      </Button>
    </form>
  );
}
