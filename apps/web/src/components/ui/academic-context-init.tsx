"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAcademicContextStore } from "@/lib/academic-context-store";
import { useAuthStore } from "@/lib/auth-store";

interface ActiveContext {
  academicYear: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
}

export function AcademicContextInit(): null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const applyPlatformContext = useAcademicContextStore((s) => s.applyPlatformContext);

  const { data: activeCtx } = useQuery({
    queryKey: ["active-academic-context"],
    queryFn: async () => {
      const res = await api.get<ActiveContext>("/academic-context");
      return res.data ?? null;
    },
    enabled: isAuthenticated,
    staleTime: 120_000,
  });

  useEffect(() => {
    const year = activeCtx?.academicYear;
    const term = activeCtx?.term;
    if (year && term) {
      applyPlatformContext({
        academicYearId: year.id,
        academicYearName: year.name,
        termId: term.id,
        termName: term.name,
      });
    }
  }, [activeCtx, applyPlatformContext]);

  return null;
}
