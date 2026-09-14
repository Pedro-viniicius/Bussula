"use client";

import { useActionState } from "react";
import { A } from "@/lib/texts/admin";
import { entrarAction, type EstadoLogin } from "./actions";

const campo =
  "mt-1.5 block w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-lg text-white placeholder:text-white/25 focus:border-white/50 focus:outline-none disabled:opacity-50";

/**
 * Password + 6-digit code. The code field opens the numeric keyboard and
 * accepts the OS "one-time code" autofill. Errors are one generic line so
 * the screen never says which of the two was wrong.
 */
export function LoginForm({ next, configurado }: { next: string; configurado: boolean }) {
  const [estado, agir, pendente] = useActionState<EstadoLogin, FormData>(entrarAction, {});
  const L = A.login;
  const bloqueado = pendente || !configurado;

  return (
    <div className="space-y-8">
      <form action={agir} className="space-y-5" aria-busy={pendente}>
        <input type="hidden" name="next" value={next} />
        <header>
          <p className="text-xs font-medium tracking-widest text-white/50 uppercase">{L.marca}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">{L.titulo}</h1>
          <p className="mt-1 text-white/60">{L.subtitulo}</p>
        </header>

        {!configurado && (
          <p role="status" className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {L.naoConfigurado}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-white/80">{L.senha}</span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            disabled={bloqueado}
            className={campo}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-white/80">{L.codigo}</span>
          <input
            name="codigo"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="one-time-code"
            maxLength={6}
            required
            disabled={bloqueado}
            placeholder="______"
            aria-describedby="codigo-ajuda"
            className={`${campo} text-center font-mono text-2xl tracking-[0.5em]`}
          />
          <span id="codigo-ajuda" className="mt-1.5 block text-sm leading-snug text-white/50">
            {L.codigoAjuda}
          </span>
        </label>

        {estado.erro && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={bloqueado}
          className="min-h-14 w-full rounded-lg bg-white text-lg font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-60"
        >
          {pendente ? L.entrando : L.entrar}
        </button>
      </form>

      <details className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70">
        <summary className="min-h-11 cursor-pointer list-none py-2 font-medium text-white/80 marker:hidden">
          {L.ajuda.titulo}
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          {L.ajuda.passos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-white/45">{L.ajuda.rodape}</p>
      </details>
    </div>
  );
}
