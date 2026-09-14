import { M } from "@/lib/texts/messages";

export function Encerrado({ nomeEvento }: { nomeEvento: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted-foreground">{nomeEvento}</p>
      <h1 className="text-2xl font-bold">{M.encerrado.titulo}</h1>
      <p className="max-w-sm text-muted-foreground">{M.encerrado.texto}</p>
    </main>
  );
}
