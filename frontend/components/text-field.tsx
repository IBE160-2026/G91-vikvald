import { CircleAlert } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { iconProps } from "./icon";

// text-field (DESIGN.md "Forms"): visible label above, a 48 px field with a
// border-control edge. With an error: 1.5 px red border, and an icon and the
// message below, linked to the field with aria-describedby and aria-invalid.
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

  const inputClasses = [
    "h-field-height w-full rounded-md bg-surface px-3 text-body text-ink",
    hasError ? "border-[1.5px] border-danger" : "border border-border-control",
    trailing ? "pr-9" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          {...inputProps}
          ref={ref}
          id={id}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={inputClasses}
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
