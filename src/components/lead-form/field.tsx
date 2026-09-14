import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
};

/** Label + control + inline error, wired with aria-describedby. */
export function Field({ id, label, hint, error, children }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
