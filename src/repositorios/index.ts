/**
 * Onde se escolhe de onde vêm os dados.
 *
 * Este é o único arquivo do projeto que sabe que existem duas implementações.
 * Os serviços importam daqui e nunca perguntam qual está em uso — trocar o
 * modo de teste por um banco de verdade é trocar a flag de
 * `src/lib/mock/config.ts`, e nada mais.
 */
import type { RepositorioDeFormularios } from "@/dominio/formularios/repositorio";
import type { RepositorioDeRespostas } from "@/dominio/respostas/repositorio";
import { USAR_MOCKS } from "@/lib/mock/config";
import { repositorioDeFormulariosEmMemoria } from "./em-memoria/formularios";
import { repositorioDeRespostasEmMemoria } from "./em-memoria/respostas";
import { repositorioDeFormulariosNoBanco } from "./formularios-no-banco";
import { repositorioDeRespostasNoBanco } from "./respostas-no-banco";

export const formulariosGravados: RepositorioDeFormularios = USAR_MOCKS
  ? repositorioDeFormulariosEmMemoria
  : repositorioDeFormulariosNoBanco;

export const respostasGravadas: RepositorioDeRespostas = USAR_MOCKS
  ? repositorioDeRespostasEmMemoria
  : repositorioDeRespostasNoBanco;
