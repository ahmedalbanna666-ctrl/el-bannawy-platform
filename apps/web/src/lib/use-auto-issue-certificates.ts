import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  generateCertificatePdf,
  issueCertificate,
  type EligibleUnit,
} from "@/lib/certificates";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

interface CertificateProfile {
  englishName?: string | null;
  fullName?: string | null;
}

/**
 * Auto-issue certificates for every unit the student has fully completed.
 *
 * Eligibility is computed server-side (`/certificates/eligible`) so the
 * result is authoritative regardless of which page the student opens.
 * This is a frontend-only issuance (the PDF is rendered in the browser);
 * the server decides WHO qualifies, the client renders the PDF.
 *
 * Call this hook once per screen (e.g. units list + quiz result screen).
 * An internal ref prevents duplicate issuance while a run is in progress.
 */
export function useAutoIssueCertificates(enabled = true): {
  issueForEligibleUnits: () => Promise<EligibleUnit[]>;
} {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isRunningRef = useRef(false);

  const issueForEligibleUnits = useCallback(async (): Promise<EligibleUnit[]> => {
    if (isRunningRef.current) return [];
    if (!user?.id) return [];

    let eligible: EligibleUnit[] = [];
    try {
      const res = await api.get<EligibleUnit[]>("/certificates/eligible");
      eligible = res.data ?? [];
    } catch {
      return [];
    }
    if (eligible.length === 0) return [];

    isRunningRef.current = true;
    try {
      let profile: CertificateProfile | null = null;
      try {
        const profileRes = await api.get<CertificateProfile>("/profile");
        profile = profileRes.data ?? null;
      } catch {
        // Profile is optional for certificate naming.
      }
      const studentName = [profile?.englishName, profile?.fullName, user.fullName]
        .find((v) => v?.trim())
        ?.trim() ?? "Student";

      for (const unit of eligible) {
        try {
          const data = await generateCertificatePdf({
            studentName,
            unitNumber: unit.displayOrder,
            unitTitle: unit.title,
            percentage: unit.progress,
          });
          await issueCertificate(
            unit.unitId,
            `certificate-unit-${String(unit.displayOrder)}.pdf`,
            data,
          );
        } catch {
          // Per-unit failure is retried on the next screen visit.
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["certificates"] });
      return eligible;
    } finally {
      isRunningRef.current = false;
    }
  }, [queryClient, user]);

  useEffect(() => {
    if (!enabled) return;
    void issueForEligibleUnits();
  }, [enabled, issueForEligibleUnits]);

  return { issueForEligibleUnits };
}
