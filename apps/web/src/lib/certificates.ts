import { api } from "./api-client";
import {
  buildCertificateNode,
  ensureCertificateFonts,
  CERTIFICATE_WIDTH,
  CERTIFICATE_HEIGHT,
  type CertificateInput,
} from "./certificates-render";

export type { CertificateInput };

export interface UnitCertificate {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  verificationCode?: string | null;
  earnedAt: string;
  unit: {
    id: string;
    title: string;
    displayOrder: number;
  };
}

async function loadLogoDataUri(src = "/logo.jpeg"): Promise<string> {
  const img = new Image();
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    img.onload = (): void => { resolve(); };
    img.onerror = (): void => { reject(new Error("Failed to load logo")); };
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg");
}

/**
 * Generates a short, human-readable verification code, e.g. "EB-8KF2-MXQ4".
 */
export function generateCertificateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (len: number): string =>
    Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `EB-${pick(4)}-${pick(4)}`;
}

/**
 * Public verification URL encoded by the certificate QR code.
 */
export function certificateVerifyUrl(code: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const base =
    configured.length > 0
      ? configured
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
  return `${base}/certificates/verify/${encodeURIComponent(code)}`;
}

export async function generateCertificatePdf(input: CertificateInput): Promise<string> {
  const [html2canvas, { jsPDF }, QRCode, logoDataUri] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
    import("qrcode"),
    loadLogoDataUri().catch(() => ""),
  ]);

  let qrDataUrl = "";
  if (input.verifyUrl?.trim()) {
    try {
      qrDataUrl = await QRCode.toDataURL(input.verifyUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
        color: { dark: "#102A5A", light: "#ffffff" },
      });
    } catch {
      qrDataUrl = "";
    }
  }

  await ensureCertificateFonts();

  const node = buildCertificateNode(input, logoDataUri, qrDataUrl);
  document.body.appendChild(node);
  try {
    // scale 3.125 ≈ 300 DPI on A4 landscape (1122px * 3.125 ≈ 3506px wide).
    const canvas = await html2canvas(node, {
      scale: 3.125,
      backgroundColor: "#F8F4E8",
      useCORS: true,
      allowTaint: false,
    });
    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT],
    });
    pdf.addImage(jpegDataUrl, "JPEG", 0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);
    const dataUri = pdf.output("datauristring");
    return dataUri.split(",")[1] ?? "";
  } finally {
    document.body.removeChild(node);
  }
}

export function certificateDownloadUrl(certificateId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";
  return `${base}/certificates/${certificateId}/download`;
}

export function certificateViewUrl(certificateId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";
  return `${base}/certificates/${certificateId}/view`;
}

export async function fetchCertificates(): Promise<UnitCertificate[]> {
  const res = await api.get<UnitCertificate[]>("/certificates");
  return res.data ?? [];
}

export async function fetchCertificateConfig(): Promise<{ threshold: number }> {
  const res = await api.get<{ threshold: number }>("/certificates/config");
  return res.data ?? { threshold: 80 };
}

export async function issueCertificate(
  unitId: string,
  fileName: string,
  data: string,
  verificationCode?: string,
): Promise<UnitCertificate> {
  const res = await api.post<UnitCertificate>(`/certificates/${unitId}`, {
    fileName,
    mimeType: "application/pdf",
    data,
    verificationCode,
  });
  if (!res.data) throw new Error("فشل إصدار الشهادة");
  return res.data;
}

export interface EligibleUnit {
  unitId: string;
  title: string;
  displayOrder: number;
  progress: number;
  gradeLabel: string;
  stageName: string | null;
  gradeName: string | null;
  termName: string | null;
  academicYearName: string | null;
  courseName: string;
}

export async function fetchEligibleUnits(): Promise<EligibleUnit[]> {
  const res = await api.get<EligibleUnit[]>("/certificates/eligible");
  return res.data ?? [];
}
