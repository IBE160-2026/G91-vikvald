import { CircleAlert } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { iconProps } from "./icon";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// text-field (DESIGN.md "Forms"): visible label above, a 48 px field with a
// border-control edge. With an error: 1.5 px red border, and an icon and the
// message below, linked to the field with aria-describedby and aria-invalid.
// Built on the shadcn/ui Input and Label.
export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string;
  // Something shown inside the field on the right, e.g. the «Vis» button.
  trailing?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, trailing, className, ...inputProps },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          {...inputProps}
          ref={ref}
          id={id}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(hasError && "border-[1.5px] border-danger", trailing && "pr-9", className)}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {hasError ? (
        <p id={errorId} className="flex items-start gap-2 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
});
