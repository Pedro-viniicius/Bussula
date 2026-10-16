"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarConfiguracaoAction } from "@/app/(painel)/admin/formularios/actions";
import { Aviso } from "@/components/interface/primitivos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAIOR_TEXTO_DO_BRINDE } from "@/dominio/constantes";
import type { ConfiguracaoDaLoja } from "@/dominio/formularios/tipos";
import { A } from "@/lib/texts/admin";
import type { ErrosDaConfiguracao } from "@/validacoes/formulario";

/** Quanto tempo "Configurações salvas." fica na tela. */
const SALVO_VISIVEL_MS = 4000;

type Props = {
  id: string;
  /** Só ATIVO e RASCUNHO editam; nos outros, os campos aparecem desabilitados e sem botão. */
  editavel: boolean;
  configuracao: ConfiguracaoDaLoja;
  cupomLigado: boolean;
  indicacaoLigada: boolean;
  temPerguntaDeNome: boolean;
  temPerguntaDeWhatsapp: boolean;
  /** Formulários ATIVOS com WhatsApp, fora o próprio: as únicas opções de destino. */
  destinosPossiveis: { id: string; nome: string }[];
  /** O destino salvo, quando ele existe mas não está mais no ar. */
  destinoForaDoAr: { id: string; nome: string } | null;
};

function mesmaConfiguracao(a: ConfiguracaoDaLoja, b: ConfiguracaoDaLoja): boolean {
  return (
    (a.textoDoBrinde ?? "") === (b.textoDoBrinde ?? "") &&
    a.nomeObrigatorio === b.nomeObrigatorio &&
    a.whatsappObrigatorio === b.whatsappObrigatorio &&
    a.formularioDeIndicacaoId === b.formularioDeIndicacaoId
  );
}

/**
 * "Configurar este formulário": o que a loja ajusta sem criar versão nova.
 *
 * As travas visíveis (nome exige WhatsApp, brinde de 1 a 120) só poupam uma
 * ida ao servidor: quem decide é a Server Action, e os erros dela voltam
 * aqui por campo. Esta tela nunca desliga um interruptor sozinha.
 */
export function ConfiguracaoDoFormulario({
  id,
  editavel,
  configuracao,
  cupomLigado,
  indicacaoLigada,
  temPerguntaDeNome,
  temPerguntaDeWhatsapp,
  destinosPossiveis,
  destinoForaDoAr,
}: Props) {
  const C = A.formularios.configuracao;
  const router = useRouter();
  const nadaParaConfigurar = !temPerguntaDeNome && !temPerguntaDeWhatsapp && !cupomLigado && !indicacaoLigada;
  const prefixo = useId();
  const [salvando, iniciarSalvamento] = useTransition();

  // A última versão gravada: o botão só liga quando algo difere dela.
  const [gravada, setGravada] = useState(configuracao);
  const [valores, setValores] = useState(configuracao);
  const [erros, setErros] = useState<ErrosDaConfiguracao & { brinde?: string }>({});
  const [erroGeral, setErroGeral] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const campoDoBrinde = useRef<HTMLInputElement>(null);
  const campoDoDestino = useRef<HTMLSelectElement>(null);
  const campoDoNome = useRef<HTMLInputElement>(null);
  const focoPendente = useRef(false);

  useEffect(() => {
    if (!salvo) return;
    const relogio = setTimeout(() => setSalvo(false), SALVO_VISIVEL_MS);
    return () => clearTimeout(relogio);
  }, [salvo]);

  // O foco só vai para o primeiro campo com erro depois que a tela volta a aceitar toque.
  useEffect(() => {
    if (!focoPendente.current || salvando) return;
    focoPendente.current = false;
    const campo = erros.brinde || erros.textoDoBrinde ? campoDoBrinde : erros.formularioDeIndicacaoId ? campoDoDestino : campoDoNome;
    campo.current?.focus();
  }, [salvando, erros]);

  const brinde = valores.textoDoBrinde ?? "";
  const mudou = !mesmaConfiguracao(valores, gravada);
  const bloqueado = !editavel || salvando;

  // O destino salvo que saiu do ar continua escolhido até o gerente trocar.
  const destinoAtual = valores.formularioDeIndicacaoId ?? "";
  const foraDoArSelecionado = destinoForaDoAr !== null && destinoAtual === destinoForaDoAr.id;

  function mudar(parte: Partial<ConfiguracaoDaLoja>, campoComErro?: keyof ErrosDaConfiguracao | "brinde") {
    setValores((atual) => ({ ...atual, ...parte }));
    setSalvo(false);
    setErroGeral(false);
    if (campoComErro) setErros((atuais) => ({ ...atuais, [campoComErro]: undefined }));
  }

  function validarNoCliente(): (ErrosDaConfiguracao & { brinde?: string }) | null {
    const texto = brinde.trim();
    if (cupomLigado && texto.length === 0) return { brinde: C.brinde.vazio };
    if (texto.length > MAIOR_TEXTO_DO_BRINDE) return { brinde: C.brinde.longo };
    return null;
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (bloqueado || !mudou) return;

    const local = validarNoCliente();
    if (local) {
      setErros(local);
      setErroGeral(false);
      focoPendente.current = true;
      return;
    }

    setErros({});
    setErroGeral(false);
    setSalvo(false);
    const enviado = { ...valores, textoDoBrinde: brinde.trim() || null };

    iniciarSalvamento(async () => {
      try {
        const resultado = await salvarConfiguracaoAction(id, enviado);
        if (resultado.ok) {
          setGravada(enviado);
          setValores(enviado);
          setSalvo(true);
          router.refresh();
          return;
        }
        if (resultado.erros) {
          setErros(resultado.erros);
          focoPendente.current = true;
          return;
        }
        setErroGeral(true);
      } catch {
        setErroGeral(true);
      }
    });
  }

  // Sem pergunta de nome/WhatsApp e sem módulos, só haveria interruptores
  // desabilitados: a seção inteira some (a spec descreve isso como "só coleta respostas").
  if (nadaParaConfigurar) return null;

  const idBrinde = `${prefixo}-brinde`;
  const idDestino = `${prefixo}-destino`;
  const idNome = `${prefixo}-nome`;
  const idWhatsapp = `${prefixo}-whatsapp`;

  const nomeBloqueadoPeloWhatsapp = !valores.whatsappObrigatorio && !valores.nomeObrigatorio;
  const whatsappTravadoPeloNome = valores.nomeObrigatorio;
  const erroDoBrinde = erros.brinde ?? erros.textoDoBrinde;
  const erroDoNome = erros.nomeObrigatorio;
  const erroDoWhatsapp = erros.whatsappObrigatorio;
  const erroDeSituacao = erros.situacao;

  return (
    <form onSubmit={enviar} noValidate aria-busy={salvando} className="mt-4 border-t border-border pt-4">
      <h4 className="text-sm font-medium">{C.titulo}</h4>
      {!editavel && <p className="mt-1 text-sm text-muted-foreground">{C.somenteLeitura}</p>}

      <fieldset disabled={bloqueado} className="mt-3 space-y-5 disabled:opacity-100">
        <Interruptor
          id={idNome}
          referencia={campoDoNome}
          rotulo={C.nome.rotulo}
          ligado={valores.nomeObrigatorio}
          desabilitado={bloqueado || !temPerguntaDeNome || nomeBloqueadoPeloWhatsapp}
          ajuda={
            !temPerguntaDeNome
              ? C.nome.semPergunta
              : nomeBloqueadoPeloWhatsapp
                ? C.nome.precisaDoWhatsapp
                : C.nome.ajuda
          }
          erro={erroDoNome}
          aoMudar={(ligado) => mudar({ nomeObrigatorio: ligado }, "nomeObrigatorio")}
        />

        <div className="space-y-3">
          <Interruptor
            id={idWhatsapp}
            rotulo={C.whatsapp.rotulo}
            ligado={valores.whatsappObrigatorio}
            desabilitado={bloqueado || !temPerguntaDeWhatsapp || whatsappTravadoPeloNome}
            ajuda={
              !temPerguntaDeWhatsapp
                ? C.whatsapp.semPergunta
                : whatsappTravadoPeloNome
                  ? C.whatsapp.travadoPeloNome
                  : C.whatsapp.ajuda
            }
            erro={erroDoWhatsapp}
            aoMudar={(ligado) => mudar({ whatsappObrigatorio: ligado }, "whatsappObrigatorio")}
          />
          {cupomLigado && temPerguntaDeWhatsapp && !valores.whatsappObrigatorio && (
            <Aviso tom="atencao" role="status">
              {C.whatsapp.semWhatsappSemCupom}
            </Aviso>
          )}
        </div>

        {indicacaoLigada && (
          <div>
            <Label htmlFor={idDestino} className="text-sm">
              {C.destino.rotulo}
            </Label>
            <select
              id={idDestino}
              ref={campoDoDestino}
              value={destinoAtual}
              disabled={bloqueado}
              aria-invalid={erros.formularioDeIndicacaoId ? true : undefined}
              aria-describedby={`${idDestino}-ajuda`}
              onChange={(e) => mudar({ formularioDeIndicacaoId: e.target.value || null }, "formularioDeIndicacaoId")}
              className="mt-1.5 min-h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive"
            >
              <option value="">{C.destino.opcaoPadrao}</option>
              {destinoForaDoAr && (
                <option value={destinoForaDoAr.id} disabled>
                  {C.destino.foraDoAr(destinoForaDoAr.nome)}
                </option>
              )}
              {destinosPossiveis.map((destino) => (
                <option key={destino.id} value={destino.id}>
                  {destino.nome}
                </option>
              ))}
            </select>
            <p id={`${idDestino}-ajuda`} className="mt-1 text-xs text-muted-foreground">
              {destinosPossiveis.length === 0 ? C.destino.ajudaSemOutros : C.destino.ajuda}
            </p>
            {erros.formularioDeIndicacaoId && <MensagemDeErro>{erros.formularioDeIndicacaoId}</MensagemDeErro>}
            {foraDoArSelecionado && (
              <Aviso tom="atencao" role="status" className="mt-2">
                {C.destino.avisoForaDoAr}
              </Aviso>
            )}
          </div>
        )}

        {cupomLigado && (
          <div>
            <Label htmlFor={idBrinde} className="text-sm">
              {C.brinde.rotulo}
            </Label>
            <Input
              id={idBrinde}
              ref={campoDoBrinde}
              value={brinde}
              disabled={bloqueado}
              autoComplete="off"
              aria-invalid={erroDoBrinde ? true : undefined}
              aria-describedby={`${idBrinde}-ajuda ${idBrinde}-contador${erroDoBrinde ? ` ${idBrinde}-erro` : ""}`}
              onChange={(e) => mudar({ textoDoBrinde: e.target.value }, "brinde")}
              className="mt-1.5"
            />
            <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <p id={`${idBrinde}-ajuda`}>{C.brinde.ajuda}</p>
              <p id={`${idBrinde}-contador`} className="tabular-nums">
                {C.brinde.contador(brinde.length, MAIOR_TEXTO_DO_BRINDE)}
              </p>
            </div>
            {erroDoBrinde && <MensagemDeErro id={`${idBrinde}-erro`}>{erroDoBrinde}</MensagemDeErro>}
            <p className="mt-1 text-xs text-muted-foreground">{C.brinde.nota}</p>

            <div className="mt-3 rounded-xl border border-acento/40 bg-acento-suave p-4">
              <p className="text-xs text-muted-foreground">
                {C.previa.titulo} · {C.previa.exemplo}
              </p>
              <p className="mt-1 text-sm font-medium text-acento-forte">{C.previa.cupom}</p>
              <p translate="no" className="font-mono text-xl font-bold tracking-widest text-acento-forte">
                {C.previa.codigo}
              </p>
              {brinde.trim() && <p className="mt-1 break-words text-base">{brinde.trim()}</p>}
            </div>
          </div>
        )}
      </fieldset>

      {erroDeSituacao && (
        <p role="alert" className="mt-3 text-sm font-medium text-perigo">
          {erroDeSituacao}
        </p>
      )}

      {editavel && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" size="sm" disabled={!mudou || salvando} aria-busy={salvando}>
            {salvando ? C.salvando : C.salvar}
          </Button>
          <p aria-live="polite" className="text-sm font-medium text-sucesso">
            {salvo ? C.salvo : ""}
          </p>
        </div>
      )}
      {erroGeral && (
        <p role="alert" className="mt-2 text-sm font-medium text-perigo">
          {C.erroGeral}
        </p>
      )}
      {editavel && <p className="mt-2 text-xs text-muted-foreground">{C.notaSemVersao}</p>}
    </form>
  );
}

function MensagemDeErro({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 text-sm font-medium text-perigo">
      {children}
    </p>
  );
}

/** Interruptor nativo com o estado escrito ("Sim"/"Não"): a cor nunca é o único sinal. */
function Interruptor({
  id,
  referencia,
  rotulo,
  ligado,
  desabilitado,
  ajuda,
  erro,
  aoMudar,
}: {
  id: string;
  referencia?: React.Ref<HTMLInputElement>;
  rotulo: string;
  ligado: boolean;
  desabilitado: boolean;
  ajuda: string;
  erro?: string;
  aoMudar: (ligado: boolean) => void;
}) {
  const C = A.formularios.configuracao;
  return (
    <div>
      <div className="flex min-h-11 items-center gap-3">
        <input
          id={id}
          ref={referencia}
          type="checkbox"
          role="switch"
          checked={ligado}
          disabled={desabilitado}
          aria-describedby={`${id}-ajuda`}
          aria-invalid={erro ? true : undefined}
          onChange={(e) => aoMudar(e.target.checked)}
          className="size-6 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Label htmlFor={id} className="text-sm">
          {rotulo}{" "}
          <span className="font-normal text-muted-foreground">({ligado ? C.sim : C.nao})</span>
        </Label>
      </div>
      <p id={`${id}-ajuda`} className="text-xs text-muted-foreground">
        {ajuda}
      </p>
      {erro && <MensagemDeErro>{erro}</MensagemDeErro>}
    </div>
  );
}
