"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CONSENTIMENTOS } from "@/lib/texts/privacy";
import { M } from "@/lib/texts/messages";
import type { Finalidade } from "@/lib/domain";

export type Consentimentos = Record<Finalidade, boolean>;

type Props = {
  value: Consentimentos;
  onChange: (value: Consentimentos) => void;
  error?: string | null;
};

const ORDEM: Finalidade[] = ["contato_comercial", "promocao", "marketing"];

export function ConsentSection({ value, onChange, error }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-medium">{M.form.consentimentos}</legend>

      <div className="space-y-1 rounded-lg bg-muted p-3 text-sm leading-snug text-muted-foreground">
        {M.form.privacidadeResumo.map((linha) => (
          <p key={linha}>{linha}</p>
        ))}
        <a
          href="/privacidade"
          target="_blank"
          rel="noopener"
          className="inline-block min-h-11 py-2 font-medium text-foreground underline underline-offset-4"
        >
          {M.form.verPolitica}
        </a>
      </div>

      {ORDEM.map((finalidade) => {
        const id = `consent-${finalidade}`;
        const { rotulo, obrigatorio } = CONSENTIMENTOS[finalidade];
        return (
          <label
            key={finalidade}
            htmlFor={id}
            className="flex min-h-11 cursor-pointer items-start gap-3 py-1"
          >
            <Checkbox
              id={id}
              name={finalidade}
              checked={value[finalidade]}
              onCheckedChange={(checked) =>
                onChange({ ...value, [finalidade]: checked === true })
              }
              aria-required={obrigatorio}
              aria-invalid={obrigatorio && !!error}
              aria-describedby={obrigatorio && error ? `${id}-erro` : undefined}
              className="mt-0.5"
            />
            <span className="text-sm leading-snug">
              {rotulo}{" "}
              {obrigatorio && (
                <span className="text-muted-foreground">({M.form.obrigatorio})</span>
              )}
            </span>
          </label>
        );
      })}

      {error && (
        <p id="consent-contato_comercial-erro" role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
