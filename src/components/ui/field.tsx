import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

/**
 * Form field wiring: label, optional description and error, with ids connected to the control
 * via aria-describedby / aria-invalid. The control is rendered by the `children` function.
 */
export function Field({
  label,
  description,
  error,
  className,
  id: idProp,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: string | null;
  className?: string;
  id?: string;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const generated = useId();
  const id = idProp ?? generated;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
