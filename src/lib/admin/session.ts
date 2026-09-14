import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DURACAO_SESSAO_S, lerTokenSessao, type SessaoAdmin } from "./session-token";

export { criarTokenSessao, destinoSeguro, lerTokenSessao, type SessaoAdmin } from "./session-token";

/**
 * Cookie side of the admin session. Stateless: nothing to store, nothing to
 * clean up; rotating SESSION_SECRET logs everyone out.
 */
export const COOKIE_SESSAO = "sessao_admin";

export async function gravarCookieSessao(token: string) {
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO_S,
  });
}

export async function apagarCookieSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function sessaoAtual(): Promise<SessaoAdmin | null> {
  return lerTokenSessao((await cookies()).get(COOKIE_SESSAO)?.value);
}

/** For pages and actions: returns the session or sends the visitor to the login. */
export async function exigirAdmin(voltarPara = "/admin"): Promise<SessaoAdmin> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect(`/admin/login?next=${encodeURIComponent(voltarPara)}`);
  return sessao;
}
