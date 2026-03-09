import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          // Variants
          variant === "default" &&
            "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98]",
          variant === "secondary" &&
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "ghost" &&
            "hover:bg-accent hover:text-accent-foreground",
          variant === "destructive" &&
            "bg-destructive text-white hover:bg-destructive/90",
          variant === "outline" &&
            "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
          // Sizes
          size === "default" && "h-11 px-5 text-sm",
          size === "sm" && "h-9 px-3 text-xs",
          size === "lg" && "h-12 px-8 text-base",
          size === "icon" && "h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
