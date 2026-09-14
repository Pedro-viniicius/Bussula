export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">
        Confira o endereço ou aproxime o celular do cartão novamente.
      </p>
    </main>
  );
}
