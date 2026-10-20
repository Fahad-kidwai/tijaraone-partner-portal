import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#0038E0] via-[#0055FF] to-[#0080FF] text-white shadow-lg shadow-blue-600/25 hover:from-[#002CB8] hover:to-[#006BE0]",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:border-[#0052FF] hover:text-[#0052FF]",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "text-slate-600 hover:text-[#0052FF] hover:bg-blue-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
