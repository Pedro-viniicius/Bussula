"use client";

import { useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { LP, WHATSAPP_NUMERO } from "@/lib/texts/lp";

const T = LP.ctaFinal;

function linkWhatsapp(texto?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMERO}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/**
 * Formulário curto (nome, empresa, WhatsApp). Não grava nada: monta a mensagem
 * e abre o WhatsApp do time. Enquanto o número não existe, avisa em vez de falhar.
 */
export function FormPiloto({ idPrefixo = "cta" }: { idPrefixo?: string }) {
  const [estado, setEstado] = useState<"inicial" | "enviado" | "semNumero">("inicial");
  const temNumero = WHATSAPP_NUMERO.length > 0;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const nome = String(dados.get("nome") ?? "").trim();
    const empresa = String(dados.get("empresa") ?? "").trim();
    if (!temNumero) {
      setEstado("semNumero");
      return;
    }
    window.open(linkWhatsapp(T.mensagem(nome, empresa)), "_blank", "noopener");
    setEstado("enviado");
  }

  const campo =
    "mt-1 block w-full rounded-lg border border-(--lp-line) bg-(--lp-bg) px-3 py-3 text-base text-(--lp-ink) placeholder:text-(--lp-muted)";

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          {T.campos.nome}
          <input id={`${idPrefixo}-nome`} name="nome" required autoComplete="name" placeholder={T.campos.nomePlaceholder} className={campo} />
        </label>
        <label className="block text-sm font-medium">
          {T.campos.empresa}
          <input id={`${idPrefixo}-empresa`} name="empresa" required autoComplete="organization" placeholder={T.campos.empresaPlaceholder} className={campo} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        {T.campos.whatsapp}
        <input
          id={`${idPrefixo}-whatsapp`}
          name="whatsapp"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder={T.campos.whatsappPlaceholder}
          className={campo}
        />
      </label>

      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-(--lp-accent) px-6 text-base font-semibold whitespace-nowrap text-(--lp-accent-ink) hover:opacity-90"
      >
        {T.botao}
      </button>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-sm text-(--lp-muted)">{T.ouWhatsapp}</span>
        {temNumero ? (
          <a
            href={linkWhatsapp()}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-(--lp-line) px-5 text-base font-medium hover:border-(--lp-accent)"
          >
            <MessageCircle className="size-5" aria-hidden />
            {T.whatsappBotao}
          </a>
        ) : (
          <span className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-dashed border-(--lp-line) px-5 text-sm text-(--lp-muted)">
            <MessageCircle className="size-5" aria-hidden />
            {T.whatsappPendente}
          </span>
        )}
      </div>

      <p className="text-xs text-(--lp-muted)" aria-live="polite">
        {estado === "enviado" ? T.enviado : estado === "semNumero" ? T.whatsappPendente : T.aviso}
      </p>
    </form>
  );
}
