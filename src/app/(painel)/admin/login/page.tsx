import { redirect } from "next/navigation";
import { configAdminOuAviso } from "@/lib/admin/config";
import { destinoSeguro, sessaoAtual } from "@/lib/admin/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const destino = destinoSeguro(typeof next === "string" ? next : undefined);
  if (await sessaoAtual()) redirect(destino);

  // The page only learns *whether* the login is usable; names and reasons go to the server log.
  const validacao = configAdminOuAviso();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <LoginForm next={destino} configurado={validacao.ok} />
    </main>
  );
}
