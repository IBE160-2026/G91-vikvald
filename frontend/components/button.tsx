import { forwardRef, type ButtonHTMLAttributes } from "react";

// The four button styles from DESIGN.md "Buttons". Written by hand with Tailwind
// classes (no shadcn). Heights: 40 px, or 48 px for the large size.
export type ButtonVariant = "primary" | "outline" | "text" | "danger";
export type ButtonSize = "md" | "lg";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  // button-primary: brand colour, white text. At most one per row or section.
  primary: "bg-brand text-on-brand hover:bg-brand/90",
  // button-outline: white with a border-control edge and ink text.
  outline: "border border-border-control bg-surface text-ink shadow-lift hover:bg-row-hover",
  // button-text: brand-coloured text, brand-tint behind it on hover. No underline.
  text: "bg-transparent px-2 text-brand hover:bg-brand-tint",
  // button-danger: only in delete confirmations.
  danger: "bg-danger text-on-danger hover:bg-danger/90",
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  md: "h-button-height",
  lg: "h-button-height-lg",
};

const baseClasses =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-label " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", className, ...props },
  ref,
) {
  const classes = [baseClasses, buttonVariantClasses[variant], buttonSizeClasses[size], className]
    .filter(Boolean)
    .join(" ");
  return <button ref={ref} type={type} className={classes} {...props} />;
});
