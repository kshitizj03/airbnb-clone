import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-rausch-gradient text-white",
  dark: "bg-hof text-white hover:bg-black",
  outline: "border border-hof bg-white text-hof hover:bg-faint",
  ghost: "text-hof underline hover:bg-faint",
};
const sizes: Record<Size, string> = {
  md: "h-12 px-6 text-button",
  lg: "h-14 px-8 text-button",
};

/** Class names for anything that should look like a button (e.g. a Next Link). */
export function buttonStyles(variant: Variant = "dark", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "dark", size = "md", className = "", ...rest }: Props) {
  return <button type="button" className={buttonStyles(variant, size, className)} {...rest} />;
}
