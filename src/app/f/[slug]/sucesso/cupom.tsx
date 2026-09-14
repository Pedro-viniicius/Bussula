"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { M } from "@/lib/texts/messages";

const semAssinatura = () => () => {};

function lerStorage(chave: string): string | null {
  try {
    return sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}

/**
 * Reads the coupon from sessionStorage (set right before navigation) with the
 * query string as a fallback for browsers that block storage. The server
 * snapshot is the query string, so SSR and hydration agree.
 */
export function Cupom({ slug }: { slug: string }) {
  const params = useSearchParams();
  const daUrl = params.get("c") ?? "";
  const cupom = useSyncExternalStore(
    semAssinatura,
    () => lerStorage(`cupom:${slug}`) ?? daUrl,
    () => daUrl,
  );
  const offline = useSyncExternalStore(
    semAssinatura,
    () => lerStorage(`offline:${slug}`) === "1",
    () => false,
  );

  return (
    <>
      <p className="text-lg text-muted-foreground">{M.sucesso.titulo}</p>
      <p
        className="my-4 font-mono text-[2.6rem] leading-none font-bold tracking-wider break-all sm:text-5xl"
        aria-live="polite"
      >
        {cupom || "—"}
      </p>
      <p className="max-w-xs text-lg">{M.sucesso.instrucao}</p>
      {offline && (
        <p role="status" className="mt-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {M.sucesso.salvoOffline}
        </p>
      )}
    </>
  );
}
