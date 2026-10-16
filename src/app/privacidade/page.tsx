import Link from "next/link";
import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { CONTROLADOR, MARCA } from "@/lib/marca";
import { PRAZO_PROVISORIO, PRIVACIDADE } from "@/lib/texts/publico";

export const metadata: Metadata = {
  title: `Privacidade — ${MARCA.nome}`,
  description: `Como a ${MARCA.nome} usa e protege o que as pessoas respondem nos formulários.`,
  robots: { index: false, follow: false },
};

// PROVISÓRIO: texto pendente de revisão do advogado (LGPD). Os dados da empresa
// vêm de CONTROLADOR; enquanto vazios, a página avisa em vez de inventar.
export default function PrivacidadePage() {
  const R = PRIVACIDADE.responsavel;
  const dados = [
    { rotulo: R.razaoSocial, valor: CONTROLADOR.razaoSocial },
    { rotulo: R.cnpj, valor: CONTROLADOR.cnpj },
    { rotulo: R.endereco, valor: CONTROLADOR.endereco },
  ].filter((d) => d.valor.trim());
  const email = CONTROLADOR.emailPrivacidade.trim();
  const completo = dados.length === 3 && email !== "";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-background px-5 py-10 sm:py-16">
      <Marca />
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">{PRIVACIDADE.titulo}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{PRIVACIDADE.resumo}</p>

      <div className="mt-10 space-y-8 leading-relaxed">
        <section aria-labelledby="priv-responsavel">
          <h2 id="priv-responsavel" className="text-xl font-semibold">
            {R.titulo}
          </h2>
          {dados.length > 0 || email ? (
            <>
              <p className="mt-2 text-muted-foreground">{R.texto(MARCA.nome)}</p>
              <dl className="mt-3 space-y-1">
                {dados.map((d) => (
                  <div key={d.rotulo} className="sm:flex sm:gap-2">
                    <dt className="font-medium">{d.rotulo}:</dt>
                    <dd className="text-muted-foreground">{d.valor}</dd>
                  </div>
                ))}
                {email && (
                  <div className="sm:flex sm:gap-2">
                    <dt className="font-medium">{R.email}:</dt>
                    <dd>
                      <a
                        className="font-medium text-acento underline underline-offset-4"
                        href={`mailto:${email}`}
                      >
                        {email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : null}
          {!completo && <p className="mt-2 text-muted-foreground">{R.pendente}</p>}
        </section>

        {PRIVACIDADE.secoes.map((secao, i) => (
          <section key={secao.titulo} aria-labelledby={`priv-${i}`}>
            <h2 id={`priv-${i}`} className="text-xl font-semibold">
              {secao.titulo}
            </h2>
            {secao.itens && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
                {secao.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {secao.texto && (
              <p className="mt-2 text-muted-foreground">
                {typeof secao.texto === "function" ? secao.texto(PRAZO_PROVISORIO) : secao.texto}
              </p>
            )}
            {secao.comContato && (
              <p className="mt-2 text-muted-foreground">{email ? R.contatoComEmail : R.contatoSemEmail}</p>
            )}
            {secao.rodape && <p className="mt-2 text-muted-foreground">{secao.rodape}</p>}
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex min-h-11 items-center font-semibold text-acento underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {PRIVACIDADE.voltar}
      </Link>
    </main>
  );
}
