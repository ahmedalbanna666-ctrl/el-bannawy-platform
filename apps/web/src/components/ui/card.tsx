"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "ui-card rounded-2xl transition-shadow duration-300 dark:backdrop-blur-[8px] dark:bg-none dark:bg-[var(--ui-card-bg-dark)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ui-card-bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_1px_2px_0_rgba(0,0,0,0.03),0_2px_8px_-1px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),inset_0_0_24px_rgba(6,182,212,0.06),0_0_0_1px_rgba(80,220,255,0.12),0_1px_2px_0_rgba(6,182,212,0.02),0_4px_14px_-2px_rgba(6,182,212,0.04),0_12px_36px_-8px_rgba(6,182,212,0.05)]",
        elevated:
          "bg-[var(--ui-card-bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_3px_0_rgba(0,0,0,0.04),0_4px_14px_-2px_rgba(0,0,0,0.05),0_16px_40px_-10px_rgba(0,0,0,0.04)] dark:bg-[var(--ui-card-bg-dark)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),inset_0_0_28px_rgba(6,182,212,0.08),0_0_0_1px_rgba(80,220,255,0.16),0_1px_3px_0_rgba(6,182,212,0.03),0_6px_18px_-3px_rgba(6,182,212,0.06),0_16px_44px_-10px_rgba(6,182,212,0.06)]",
        outline:
          "bg-[var(--ui-card-bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_3px_0_rgba(0,0,0,0.04),0_4px_14px_-2px_rgba(0,0,0,0.05),0_16px_40px_-10px_rgba(0,0,0,0.04)] dark:bg-[var(--ui-card-bg-dark)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),inset_0_0_28px_rgba(6,182,212,0.08),0_0_0_1px_rgba(80,220,255,0.16),0_1px_3px_0_rgba(6,182,212,0.03),0_6px_18px_-3px_rgba(6,182,212,0.06),0_16px_44px_-10px_rgba(6,182,212,0.06)]",
        glass:
          "bg-[var(--ui-card-bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_1px_2px_0_rgba(0,0,0,0.02),0_3px_10px_-1px_rgba(0,0,0,0.03),0_10px_28px_-6px_rgba(0,0,0,0.02)] dark:bg-[var(--ui-card-bg-dark)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),inset_0_0_20px_rgba(6,182,212,0.05),0_0_0_1px_rgba(80,220,255,0.10),0_1px_2px_0_rgba(6,182,212,0.01),0_3px_10px_-1px_rgba(6,182,212,0.03),0_10px_28px_-6px_rgba(6,182,212,0.04)]",
        gradient:
          "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-[0_0_0_1px_rgba(6,182,212,0.12),0_2px_6px_-1px_rgba(6,182,212,0.06),0_12px_28px_-8px_rgba(6,182,212,0.08),0_24px_48px_-14px_rgba(6,182,212,0.04)] dark:from-primary-500 dark:to-primary-700 dark:border-[rgba(80,220,255,0.10)] dark:shadow-[inset_0_0_24px_rgba(255,255,255,0.12),0_0_0_1px_rgba(80,220,255,0.22),0_2px_8px_-1px_rgba(6,182,212,0.08),0_12px_28px_-8px_rgba(6,182,212,0.10),0_24px_52px_-16px_rgba(6,182,212,0.06)]",
        premium:
          "bg-[var(--ui-card-bg)] shadow-[0_0_0_1px_rgba(6,182,212,0.18),0_2px_8px_-1px_rgba(6,182,212,0.08),0_12px_32px_-10px_rgba(6,182,212,0.12),0_28px_56px_-16px_rgba(6,182,212,0.06)] dark:bg-[var(--ui-card-bg-dark)] dark:shadow-[inset_0_0_28px_rgba(6,182,212,0.10),0_0_0_1px_rgba(80,220,255,0.24),0_2px_10px_-1px_rgba(6,182,212,0.10),0_12px_32px_-10px_rgba(6,182,212,0.16),0_28px_60px_-18px_rgba(6,182,212,0.10)]",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
      interactive: {
        true: [
          "cursor-pointer",
          "hover:scale-[1.005]",
          "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_2px_6px_-1px_rgba(0,0,0,0.05),0_6px_18px_-4px_rgba(0,0,0,0.06),0_20px_44px_-12px_rgba(0,0,0,0.05)]",
          "active:scale-[0.998]",
          "active:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_1px_2px_0_rgba(0,0,0,0.03),0_2px_6px_-2px_rgba(0,0,0,0.03)]",
          "dark:hover:brightness-105",
          "dark:hover:border-[rgba(80,220,255,0.12)]",
          "dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),inset_0_0_30px_rgba(6,182,212,0.10),0_0_0_1px_rgba(80,220,255,0.22),0_2px_6px_-1px_rgba(6,182,212,0.05),0_8px_22px_-4px_rgba(6,182,212,0.08),0_20px_48px_-12px_rgba(6,182,212,0.08)]",
          "dark:active:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),inset_0_0_16px_rgba(6,182,212,0.06),0_0_0_1px_rgba(80,220,255,0.12),0_1px_2px_0_rgba(6,182,212,0.02),0_3px_10px_-2px_rgba(6,182,212,0.03)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  },
);

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
