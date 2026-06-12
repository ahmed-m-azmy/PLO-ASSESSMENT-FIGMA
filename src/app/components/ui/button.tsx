import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transform active:scale-90",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white shadow-[0_8px_16px_rgba(180,83,9,0.4)] hover:shadow-[0_12px_24px_rgba(180,83,9,0.5)] hover:scale-110 hover:-translate-y-1 bg-[length:200%_100%] hover:bg-right animate-gradient",
        destructive:
          "bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-[0_8px_16px_rgba(220,38,38,0.4)] hover:shadow-[0_12px_24px_rgba(220,38,38,0.5)] hover:scale-110 hover:-translate-y-1 bg-[length:200%_100%] hover:bg-right",
        outline:
          "border-2 border-amber-600 bg-white text-amber-700 shadow-[0_4px_12px_rgba(180,83,9,0.2)] hover:bg-amber-50 hover:shadow-[0_8px_20px_rgba(180,83,9,0.3)] hover:scale-110 hover:-translate-y-1 hover:border-amber-700",
        secondary:
          "bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white shadow-[0_8px_16px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_24px_rgba(234,88,12,0.5)] hover:scale-110 hover:-translate-y-1 bg-[length:200%_100%] hover:bg-right",
        ghost:
          "hover:bg-amber-50 hover:text-amber-700 hover:shadow-[0_4px_12px_rgba(180,83,9,0.15)] hover:scale-105",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2 has-[>svg]:px-5",
        sm: "h-9 rounded-xl gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-14 rounded-xl px-10 has-[>svg]:px-8 text-base",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
