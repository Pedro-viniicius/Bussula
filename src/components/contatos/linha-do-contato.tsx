"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { revelarContatoAction } from "@/app/(painel)/admin/contatos/actions";
import { Etiqueta } from "@/components/interface/primitivos";
import { Quando } from "@/components/interface/tempo";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ContatoRevelado } from "@/dominio/contatos/tipos";
import { ROTULO_DA_ORIGEM } from "@/dominio/respostas/tipos";
import { A } from "@/lib/texts/admin";
import type { ContatoDaLista } from "@/servicos/contatos";
import { formatarDia } from "./formato";

/** Sobre `md` a linha vira uma grade de colunas; os rótulos de cada célula ficam só para leitor de tela. */
export const COLUNAS_DA_LINHA =
  "md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_7rem_7rem_minmax(0,1.6fr)] md:items-start md:gap-x-4";

/**
 * Um contato da lista.
 *
 * Nasce mascarado. "Revelar contato" chama a Server Action, que confere a
 * sessão, audita e só então devolve o dado completo. Ele vive apenas no estado
 * deste componente: recarregar a página ou sair dela volta tudo ao mascarado,
 * e cada novo "Revelar" gera uma nova linha de auditoria. Antes de revelar não
 * existe nenhum `href` do WhatsApp no HTML.
 */
export function LinhaDoContato({ contato }: { contato: ContatoDaLista }) {
  const C = A.contatos;
  const [revelado, setRevelado] = useState<ContatoRevelado | null>(null);
  const [erro, setErro] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const [pendente, iniciar] = useTransition();
  const acoes = useRef<HTMLDivElement>(null);
  const botaoRevelar = useRef<HTMLButtonElement>(null);
  const foco = useRef<"acoes" | "revelar" | null>(null);

  // O foco vai para a primeira ação da linha ao revelar, e volta ao "Revelar" ao ocultar.
  useEffect(() => {
    if (foco.current === "acoes") acoes.current?.querySelector<HTMLElement>("a, button")?.focus();
    if (foco.current === "revelar") botaoRevelar.current?.focus();
    foco.current = null;
  }, [revelado]);

  const rotulo = contato.nomeOculto ?? contato.telefoneOculto;

  function revelar() {
    setErro(false);
    iniciar(async () => {
      try {
        const dados = await revelarContatoAction(contato.id);
        if (!dados) {
          setErro(true);
          return;
        }
        foco.current = "acoes";
        setRevelado(dados);
        setAnuncio(C.acoes.anunciarRevelado);
      } catch {
        setErro(true);
      }
    });
  }

  function ocultar() {
    foco.current = "revelar";
    setRevelado(null);
    setAnuncio("");
  }

  const cupom = contato.cupom;
  const jaTinha = cupom.situacao === "ja_tinha";
  const mostrarCupom = contato.formularioTemCupom || cupom.emitido || jaTinha;

  return (
    <li
      aria-label={contato.nomeOculto ?? C.lista.semNome}
      className={`rounded-xl border border-border bg-card p-4 ${COLUNAS_DA_LINHA}`}
    >
      {/* Contato */}
      <div className="min-w-0">
        <span className="sr-only">{C.lista.colunas.contato}: </span>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 md:block">
          {revelado ? (
            <p className={`font-semibold break-words ${revelado.nome ? "" : "text-muted-foreground"}`}>
              {revelado.nome ?? C.lista.semNome}
            </p>
          ) : (
            <p
              className={`truncate font-semibold ${contato.nomeOculto ? "" : "font-normal text-muted-foreground"}`}
              title={contato.nomeOculto ?? undefined}
            >
              {contato.nomeOculto ?? C.lista.semNome}
            </p>
          )}
          <Etiqueta tom={contato.aceitaMensagens ? "sucesso" : "neutro"} className="md:mt-1">
            {contato.aceitaMensagens ? C.lista.aceita : C.lista.naoAceitou}
          </Etiqueta>
        </div>
        <p className="mt-1 text-sm tabular-nums break-words">{revelado ? revelado.telefone : contato.telefoneOculto}</p>
      </div>

      {/* Formulário, origem e cupom */}
      <div className="mt-2 min-w-0 text-sm md:mt-0">
        <span className="sr-only">{C.lista.colunas.formulario}: </span>
        <p className="break-words">
          <span className="md:hidden">{C.lista.formulario}: </span>
          {contato.formularioNome}
        </p>
        <p className="text-muted-foreground">{ROTULO_DA_ORIGEM[contato.origem]}</p>
        {mostrarCupom && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {cupom.emitido ? (
              <Etiqueta tom={cupom.expirado ? "neutro" : "sucesso"}>{cupom.expirado ? C.cupom.vencido : C.cupom.valido}</Etiqueta>
            ) : jaTinha ? (
              <Etiqueta>{C.cupom.jaTinha}</Etiqueta>
            ) : (
              <Etiqueta>{C.cupom.sem}</Etiqueta>
            )}
            {!jaTinha && (
              <span className="text-xs text-muted-foreground">
                {cupom.emitido && cupom.validoAte
                  ? cupom.expirado
                    ? C.cupom.venceuEm(formatarDia(cupom.validoAte))
                    : C.cupom.validoAte(formatarDia(cupom.validoAte))
                  : C.cupom.naoGerado}
              </span>
            )}
          </div>
        )}
        {revelado?.cupom && (
          <p className="mt-1 font-medium tabular-nums" translate="no">
            {C.cupom.codigo(revelado.cupom.codigo)}
          </p>
        )}
      </div>

      {/* Quando */}
      <p className="mt-2 text-sm text-muted-foreground md:mt-0">
        <span className="sr-only">{C.lista.colunas.quando}: </span>
        <Quando data={contato.criadoEm} />
        {revelado && <span className="block text-xs md:mt-1">{C.acoes.revelado}</span>}
      </p>

      {/* Indicações */}
      <p className="mt-1 text-sm md:mt-0">
        <span className="sr-only">{C.lista.colunas.indicacoes}: </span>
        {contato.indicacoes > 0
          ? C.lista.indicacoes(contato.indicacoes)
          : contato.formularioTemIndicacao
            ? C.lista.nenhumaIndicacao
            : null}
      </p>

      {/* Ações */}
      <div className="mt-3 md:mt-0">
        <span className="sr-only">{C.lista.colunas.acoes}: </span>
        <div ref={acoes} className="flex flex-wrap items-center gap-2">
          {revelado ? (
            <>
              {revelado.linkWhatsapp && (
                <a
                  href={revelado.linkWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${C.acoes.chamarDe(rotulo)} ${C.acoes.abreWhatsapp}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {C.acoes.chamar}
                </a>
              )}
              {revelado.linkEnvioDoCupom && (
                <a
                  href={revelado.linkEnvioDoCupom}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${C.acoes.enviarCupomDe(rotulo)} ${C.acoes.abreWhatsapp}`}
                  className={buttonVariants({ size: "sm", variant: revelado.linkWhatsapp ? "outline" : "default" })}
                >
                  {C.acoes.enviarCupom}
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={ocultar} aria-label={C.acoes.ocultarDe(rotulo)}>
                {C.acoes.ocultar}
              </Button>
              {!contato.aceitaMensagens && !revelado.linkEnvioDoCupom && (
                <p className="text-xs text-muted-foreground">{C.acoes.naoAceitou}</p>
              )}
              {!contato.aceitaMensagens && revelado.linkEnvioDoCupom && (
                <p className="basis-full text-xs text-muted-foreground">{C.acoes.apoioSoCupom}</p>
              )}
            </>
          ) : (
            <Button
              ref={botaoRevelar}
              variant="secondary"
              size="sm"
              onClick={revelar}
              disabled={pendente}
              aria-label={C.acoes.revelarDe(rotulo)}
            >
              {pendente ? C.acoes.revelando : C.acoes.revelar}
            </Button>
          )}
        </div>
        {erro && (
          <p role="alert" className="mt-2 text-sm text-perigo">
            {C.acoes.erroAoRevelar}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {anuncio}
        </p>
      </div>
    </li>
  );
}
