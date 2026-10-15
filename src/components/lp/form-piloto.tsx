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
export function FormPiloto() {
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
    "mt-2 block w-full rounded-xl border border-hairline bg-canvas-alt px-4 py-3.5 text-[17px] text-ink placeholder:text-ink-muted focus:border-brand focus:bg-canvas focus:outline-none";

  return (
    <form onSubmit={enviar} className="space-y-5 text-left">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-[15px] font-medium text-ink">
          {T.campos.nome}
          <input name="nome" required autoComplete="name" placeholder={T.campos.nomePlaceholder} className={campo} />
        </label>
        <label className="block text-[15px] font-medium text-ink">
          {T.campos.empresa}
          <input name="empresa" required autoComplete="organization" placeholder={T.campos.empresaPlaceholder} className={campo} />
        </label>
      </div>
      <label className="block text-[15px] font-medium text-ink">
        {T.campos.whatsapp}
        <input name="whatsapp" type="tel" required inputMode="tel" autoComplete="tel" placeholder={T.campos.whatsappPlaceholder} className={campo} />
      </label>

      <button
        type="submit"
        className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-brand px-7 text-[17px] font-medium text-white transition-colors hover:bg-brand-dark active:bg-brand-dark"
      >
        {T.botao}
      </button>

      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
        <span className="text-[15px] text-ink-muted">{T.ouWhatsapp}</span>
        {temNumero ? (
          <a href={linkWhatsapp()} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-brand hover:underline">
            <MessageCircle className="size-4" aria-hidden />
            {T.whatsappBotao}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-hairline px-3 py-1 text-[14px] text-ink-muted">
            <MessageCircle className="size-4" aria-hidden />
            {T.whatsappPendente}
          </span>
        )}
      </div>

      <p className="text-center text-[13px] text-ink-muted" aria-live="polite">
        {estado === "enviado" ? T.enviado : estado === "semNumero" ? T.whatsappPendente : T.aviso}
      </p>
    </form>
  );
}
