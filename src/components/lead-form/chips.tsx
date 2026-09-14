"use client";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
};

/**
 * Tap-to-select chips. Two columns at every width; when the count is odd the
 * last chip spans both columns so the grid never ends with a lonely cell.
 * Tapping the selected chip again clears it (the fields are optional).
 */
export function Chips({ label, name, options, value, onChange }: Props) {
  const odd = options.length % 2 === 1;
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-medium">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              data-name={name}
              onClick={() => onChange(selected ? null : opt)}
              className={cn(
                "min-h-12 rounded-lg border-2 px-3 py-2 text-base font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground active:bg-muted",
                odd && i === options.length - 1 && "col-span-2",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
