type Props = {
  label: string;
  name: string;
  options: readonly string[];
};

/**
 * Tap-to-select chips built on native radios: selection works the instant
 * HTML paints, before any JavaScript arrives. The value is read from the
 * form at submit time (FormData), so there is no React state to hydrate.
 * A choice can be changed but not cleared — both fields are optional anyway.
 *
 * Two columns at every width; an odd count makes the last chip span both.
 */
export function Chips({ label, name, options }: Props) {
  const odd = options.length % 2 === 1;
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <label
            key={opt}
            className={odd && i === options.length - 1 ? "col-span-2" : undefined}
          >
            <input type="radio" name={name} value={opt} className="peer sr-only" />
            <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-2 border-border bg-background px-3 py-2 text-center text-base font-medium text-foreground transition-colors select-none active:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
              {opt}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
