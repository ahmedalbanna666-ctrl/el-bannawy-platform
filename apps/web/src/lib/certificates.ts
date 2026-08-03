import { api } from "./api-client";

export interface CertificateInput {
  studentName: string;
  unitNumber: number;
  unitTitle: string;
  percentage: number;
  earnedDate?: Date;
}

export interface UnitCertificate {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  earnedAt: string;
  unit: {
    id: string;
    title: string;
    displayOrder: number;
  };
}

const CERTIFICATE_WIDTH = 1122;
const CERTIFICATE_HEIGHT = 793;

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

function buildCertificateNode(input: CertificateInput, logoDataUri: string): HTMLElement {
  const date = (input.earnedDate ?? new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const root = document.createElement("div");
  root.style.cssText = [
    `position:fixed`,
    `left:-99999px`,
    `top:0`,
    `width:${String(CERTIFICATE_WIDTH)}px`,
    `height:${String(CERTIFICATE_HEIGHT)}px`,
    `background:linear-gradient(135deg,#fdfaf3 0%,#f7f0e0 100%)`,
    `color:#1f2937`,
    `font-family:Georgia,'Times New Roman',serif`,
    `z-index:-1`,
  ].join(";");

  const frame = document.createElement("div");
  frame.style.cssText = [
    `position:absolute`,
    `inset:18px`,
    `border:3px solid #b8912e`,
    `border-radius:14px`,
  ].join(";");

  const innerFrame = document.createElement("div");
  innerFrame.style.cssText = [
    `position:absolute`,
    `inset:28px`,
    `border:1.5px solid #c9a74b`,
    `border-radius:10px`,
  ].join(";");

  const content = document.createElement("div");
  content.style.cssText = [
    `position:absolute`,
    `inset:46px`,
    `display:flex`,
    `flex-direction:column`,
    `align-items:center`,
    `justify-content:center`,
    `text-align:center`,
  ].join(";");

  if (logoDataUri) {
    const logo = document.createElement("img");
    logo.src = logoDataUri;
    logo.alt = "El-Bannawy Platform";
    logo.style.cssText = [
      `width:92px`,
      `height:92px`,
      `border-radius:50%`,
      `border:2px solid #b8912e`,
      `object-fit:cover`,
    ].join(";");
    content.appendChild(logo);
  }

  const platformName = document.createElement("div");
  platformName.textContent = "EL-BANNAWY PLATFORM";
  platformName.style.cssText = `font-size:21px;font-weight:700;color:#a37f1c;letter-spacing:5px;margin-top:8px;`;

  const tagline = document.createElement("div");
  tagline.textContent = "AI-POWERED ENGLISH LEARNING";
  tagline.style.cssText = `font-size:11px;color:#8a8576;letter-spacing:4px;margin-top:2px;`;

  const title = document.createElement("div");
  title.textContent = "CERTIFICATE OF ACHIEVEMENT";
  title.style.cssText = `font-size:52px;font-weight:800;color:#8a6a15;letter-spacing:2px;margin-top:18px;`;

  const divider = document.createElement("div");
  divider.style.cssText = `width:420px;height:2px;background:linear-gradient(90deg,transparent,#c9a74b,transparent);margin:16px 0;`;

  const intro = document.createElement("div");
  intro.textContent = "This is to certify that";
  intro.style.cssText = `font-size:20px;font-style:italic;color:#6b7280;`;

  const studentName = document.createElement("div");
  studentName.textContent = input.studentName;
  studentName.style.cssText = `font-size:42px;font-weight:700;color:#111827;margin:6px 0;`;

  const completedLine = document.createElement("div");
  completedLine.textContent = "has successfully completed the course unit";
  completedLine.style.cssText = `font-size:18px;color:#4b5563;`;

  const unitTitle = document.createElement("div");
  unitTitle.textContent = `Unit ${String(input.unitNumber)} — ${input.unitTitle}`;
  unitTitle.style.cssText = `font-size:25px;font-weight:700;color:#b45309;margin:5px 0;`;

  const percentage = document.createElement("div");
  percentage.textContent = `with a completion percentage of ${String(input.percentage)}%`;
  percentage.style.cssText = `font-size:18px;color:#4b5563;`;

  const dateEl = document.createElement("div");
  dateEl.textContent = `Date: ${date}`;
  dateEl.style.cssText = `font-size:16px;color:#6b7280;margin-top:22px;`;

  content.appendChild(platformName);
  content.appendChild(tagline);
  content.appendChild(title);
  content.appendChild(divider);
  content.appendChild(intro);
  content.appendChild(studentName);
  content.appendChild(completedLine);
  content.appendChild(unitTitle);
  content.appendChild(percentage);
  content.appendChild(dateEl);

  // Bottom row: stamp + signature
  const bottomRow = document.createElement("div");
  bottomRow.style.cssText = [
    `display:flex`,
    `align-items:center`,
    `justify-content:space-between`,
    `width:78%`,
    `margin-top:30px`,
  ].join(";");

  const stamp = document.createElement("div");
  stamp.style.cssText = [
    `width:132px`,
    `height:132px`,
    `border:4px double #8a6d1f`,
    `border-radius:50%`,
    `display:flex`,
    `flex-direction:column`,
    `align-items:center`,
    `justify-content:center`,
    `background:rgba(201,162,39,0.07)`,
    `color:#8a6d1f`,
    `transform:rotate(-10deg)`,
    `text-align:center`,
  ].join(";");
  const stampLines = [
    { text: "EL-BANNAWY", size: "13px", letterSpacing: "2px" },
    { text: "• PLATFORM •", size: "9px", letterSpacing: "1px" },
    { text: "MR. AHMED", size: "13px", letterSpacing: "1px" },
    { text: "ELBANNA", size: "13px", letterSpacing: "1px" },
    { text: "FOUNDER", size: "8px", letterSpacing: "2px" },
  ];
  for (const line of stampLines) {
    const span = document.createElement("div");
    span.textContent = line.text;
    span.style.cssText = `font-size:${line.size};font-weight:800;letter-spacing:${line.letterSpacing};line-height:1.45;`;
    stamp.appendChild(span);
  }

  const signatureBlock = document.createElement("div");
  signatureBlock.style.cssText = `display:flex;flex-direction:column;align-items:center;`;
  const signatureLine = document.createElement("div");
  signatureLine.style.cssText = `width:240px;border-top:2px solid #374151;`;
  const signatureName = document.createElement("div");
  signatureName.textContent = "Mr. Ahmed Elbanna";
  signatureName.style.cssText = `font-size:21px;font-style:italic;font-weight:700;color:#111827;margin-top:8px;`;
  const signatureRole = document.createElement("div");
  signatureRole.textContent = "Founder & CEO";
  signatureRole.style.cssText = `font-size:12px;color:#6b7280;letter-spacing:1px;`;

  signatureBlock.appendChild(signatureLine);
  signatureBlock.appendChild(signatureName);
  signatureBlock.appendChild(signatureRole);

  bottomRow.appendChild(stamp);
  bottomRow.appendChild(signatureBlock);
  content.appendChild(bottomRow);

  innerFrame.appendChild(content);
  frame.appendChild(innerFrame);
  root.appendChild(frame);
  return root;
}

export async function generateCertificatePdf(input: CertificateInput): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const logoDataUri = await loadLogoDataUri().catch(() => "");
  const node = buildCertificateNode(input, logoDataUri);
  document.body.appendChild(node);
  try {
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#fdfaf3",
      useCORS: true,
      allowTaint: false,
    });
    const pngDataUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT],
    });
    pdf.addImage(pngDataUrl, "PNG", 0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);
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
): Promise<UnitCertificate> {
  const res = await api.post<UnitCertificate>(`/certificates/${unitId}`, {
    fileName,
    mimeType: "application/pdf",
    data,
  });
  if (!res.data) throw new Error("فشل إصدار الشهادة");
  return res.data;
}
