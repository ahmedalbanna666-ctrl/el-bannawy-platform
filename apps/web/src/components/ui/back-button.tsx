"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  readonly fallbackHref?: string;
  readonly label?: string;
  readonly className?: string;
}

export function BackButton({
  fallbackHref = "/dashboard",
  label = "رجوع",
  className,
}: BackButtonProps): ReactNode {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      type="button"
      onClick={(): void => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowRight className="h-4 w-4" />
      {label}
    </Button>
  );
}
