import Link from "next/link";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { sairAction } from "./login/actions";

export const dynamic = "force-dynamic";

// Placeholder until the real-event panel (rest of step 7) lands.
export default async function AdminPage() {
  await exigirAdmin("/admin");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-white">{A.painel.titulo}</h1>
      <p className="text-white/60">{A.painel.emBreve}</p>
      <Link
        href="/demo"
        className="flex min-h-14 items-center justify-center rounded-lg bg-white text-lg font-semibold text-black hover:bg-white/90"
      >
        {A.painel.demo}
      </Link>
      <form action={sairAction}>
        <button type="submit" className="min-h-11 text-sm text-white/50 underline underline-offset-4">
          {A.sair}
        </button>
      </form>
    </main>
  );
}
