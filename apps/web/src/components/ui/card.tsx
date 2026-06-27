import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl transition-all duration-150", {
  variants: {
    variant: {
      default:
        "bg-neutral-100 shadow-sm dark:bg-[#1e293b] dark:shadow-[0_8px_32px_0_rgb(0_0_0/0.08)]",
      elevated: "bg-neutral-100 shadow-lg dark:bg-[#1e293b]",
      outline:
        "border-2 border-neutral-200 bg-transparent dark:border-neutral-700",
      glass: "bg-white/10 backdrop-blur-lg shadow-[0_8px_32px_0_rgb(0_0_0/0.08)] dark:bg-[#0f172a]/60",
      gradient:
        "bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
      xl: "p-8",
    },
    interactive: {
      true: "cursor-pointer hover:shadow-md active:shadow-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, interactive }), className)}
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4", className)} {...props} />
));

CardHeader.displayName = "CardHeader";

const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));

CardContent.displayName = "CardContent";

const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-4 flex items-center gap-2", className)} {...props} />
));

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter, cardVariants };
export type { CardProps };
