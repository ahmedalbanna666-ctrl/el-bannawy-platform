"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onClose, title, children, className, ...props }, ref) => {
    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          ref={ref}
          className={cn(
            "w-full max-w-lg rounded-2xl bg-neutral-50 p-6 shadow-xl dark:bg-neutral-800",
            className,
          )}
          {...props}
        >
          {title && (
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  },
);

Dialog.displayName = "Dialog";

const DialogHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4", className)} {...props} />
));

DialogHeader.displayName = "DialogHeader";

const DialogContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4", className)} {...props} />
));

DialogContent.displayName = "DialogContent";

const DialogFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-6 flex items-center justify-end gap-3", className)}
    {...props}
  />
));

DialogFooter.displayName = "DialogFooter";

export { Dialog, DialogHeader, DialogContent, DialogFooter };
export type { DialogProps };
