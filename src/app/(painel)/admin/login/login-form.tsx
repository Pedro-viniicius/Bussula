"use client";

import { useActionState } from "react";
import { A } from "@/lib/texts/admin";
import { entrarAction, type EstadoLogin } from "./actions";

const campo =
  "mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-lg text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none";

export function LoginForm({ next }: { next: string }) {
  const [estado, agir, pendente] = useActionState<EstadoLogin, FormData>(entrarAction, {});
  return (
    <form action={agir} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <header>
        <p className="text-sm font-medium tracking-wide text-white/50 uppercase">Fiat Day</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">{A.login.titulo}</h1>
        <p className="mt-1 text-white/60">{A.login.subtitulo}</p>
      </header>

      <label className="block">
        <span className="text-sm font-medium text-white/80">{A.login.senha}</span>
        <input name="senha" type="password" autoComplete="current-password" required className={campo} />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-white/80">{A.login.codigo}</span>
        <input
          name="codigo"
          inputMode="numeric"
          pattern="[0-9 ]*"
          autoComplete="one-time-code"
          maxLength={7}
          required
          placeholder="000 000"
          className={`${campo} font-mono tracking-[0.3em]`}
        />
        <span className="mt-1 block text-xs text-white/50">{A.login.codigoAjuda}</span>
      </label>

      {estado.erro && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="min-h-14 w-full rounded-lg bg-white text-lg font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-60"
      >
        {pendente ? A.login.entrando : A.login.entrar}
      </button>
    </form>
  );
}
