"use server";

import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/admin/audit";
import { apagarCookieSessao, criarTokenSessao, destinoSeguro, gravarCookieSessao, sessaoAtual } from "@/lib/admin/session";
import { verificarTotp } from "@/lib/admin/totp";
import { log } from "@/lib/logger";
import { extrairIp, hashIp } from "@/lib/security/ip-hash";
import { A } from "@/lib/texts/admin";

export type EstadoLogin = { erro?: string };

function senhaConfere(digitada: string): boolean {
  const esperada = process.env.ADMIN_PASSWORD ?? "";
  if (esperada.length < 16) return false; // misconfigured: fail closed
  const a = Buffer.from(digitada);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function entrarAction(_estado: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const senha = String(form.get("senha") ?? "");
  const codigo = String(form.get("codigo") ?? "");
  const next = destinoSeguro(String(form.get("next") ?? ""));
  const ipHash = hashIp(extrairIp(await headers()));

  const segredoTotp = process.env.ADMIN_TOTP_SECRET;
  if (!segredoTotp) log.error("ADMIN_TOTP_SECRET ausente: login do admin bloqueado");

  const ok = !!segredoTotp && senhaConfere(senha) && verificarTotp(segredoTotp, codigo);
  if (!ok) {
    // Slow every failure a little; the audit row is the real alarm.
    await new Promise((r) => setTimeout(r, 800));
    await registrarAuditoria(db, { acao: "login_falhou", entidade: "admin", metadados: { ipHash } });
    log.warn("login do admin falhou", { ipHash });
    return { erro: A.login.erro };
  }

  const { token, sessao } = criarTokenSessao();
  await registrarAuditoria(db, { acao: "login_ok", entidade: "admin", usuarioId: sessao.id, metadados: { ipHash } });
  await gravarCookieSessao(token);
  redirect(next);
}

export async function sairAction() {
  const sessao = await sessaoAtual();
  if (sessao) await registrarAuditoria(db, { acao: "logout", entidade: "admin", usuarioId: sessao.id });
  await apagarCookieSessao();
  redirect("/admin/login");
}
