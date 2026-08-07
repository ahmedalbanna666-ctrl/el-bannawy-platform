export interface CertificateInput {
  studentName: string;
  unitNumber: number;
  unitTitle: string;
  percentage: number;
  earnedDate?: Date;
  gradeLabel?: string;
  stageName?: string | null;
  gradeName?: string | null;
  termName?: string | null;
  academicYearName?: string | null;
  courseName?: string;
  verificationCode?: string;
  verifyUrl?: string;
}

export const CERTIFICATE_WIDTH = 1122;
export const CERTIFICATE_HEIGHT = 793;

// ---------------------------------------------------------------
// Brand palette — Ivory / Gold / Dark Navy / Cyan
// ---------------------------------------------------------------
const COLORS = {
  ivoryLight: "#fdfaf3",
  ivoryDark: "#f4edda",
  gold: "#b8912e",
  goldBright: "#d4af37",
  goldSoft: "#c9a74b",
  goldDeep: "#8a6a15",
  navy: "#16233f",
  navySoft: "#2a3a5c",
  ink: "#2b3444",
  muted: "#6b7280",
  faint: "#8a8576",
  cyan: "#1fa3b8",
  white: "#ffffff",
} as const;

const FONT_SERIF = `'Playfair Display', Georgia, 'Times New Roman', serif`;
const FONT_TITLE = `'Cinzel', Georgia, 'Times New Roman', serif`;
const FONT_SANS = `var(--font-ui-english), 'Inter', ui-sans-serif, system-ui, sans-serif`;

let fontsLoadedPromise: Promise<void> | null = null;

/**
 * Injects Google Fonts used by the certificate and waits until they are
 * rasterizable by html2canvas. Subsequent calls are a no-op.
 */
export function ensureCertificateFonts(): Promise<void> {
  if (fontsLoadedPromise) return fontsLoadedPromise;
  fontsLoadedPromise = (async (): Promise<void> => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("elbannawy-certificate-fonts")) {
      const link = document.createElement("link");
      link.id = "elbannawy-certificate-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&display=swap";
      document.head.appendChild(link);
    }
    try {
      await Promise.all([
        document.fonts.load('700 40px "Cinzel"'),
        document.fonts.load('700 56px "Playfair Display"'),
        document.fonts.load('400 14px "Inter"'),
        document.fonts.load('600 24px "Inter"'),
      ]);
      await document.fonts.ready;
    } catch {
      // System font fallbacks will be used if Google Fonts is unreachable.
    }
  })();
  return fontsLoadedPromise;
}

function makeEl(tag: string, css: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  el.style.cssText = css;
  if (text !== undefined) el.textContent = text;
  return el;
}

function makeSvg(css: string, inner: string, width = 44, height = 44): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${String(width)} ${String(height)}`);
  svg.setAttribute("style", css);
  svg.innerHTML = inner;
  return svg;
}

function gradeLabelFromPercent(percent: number): string {
  if (percent >= 90) return "Excellent";
  if (percent >= 80) return "Very Good";
  if (percent >= 70) return "Good";
  if (percent >= 60) return "Pass";
  return "Needs Improvement";
}

/**
 * Formats the unit heading without repeating the number, e.g. title "unit 2"
 * or "Unit 2: Communication" both become "Unit 2 – Communication".
 */
function formatUnitHeading(unitNumber: number, rawTitle: string): string {
  const normalized = rawTitle
    .trim()
    .replace(/^unit\s*\d+\s*[-–—:.]?\s*/i, "")
    .trim();
  const displayTitle = normalized.length > 0 ? normalized : `Unit ${String(unitNumber)}`;
  return `Unit ${String(unitNumber)} – ${displayTitle}`;
}

function formatIssueDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildCertificateNode(
  input: CertificateInput,
  logoDataUri: string,
  qrDataUrl: string,
): HTMLElement {
  const date = formatIssueDate(input.earnedDate ?? new Date());
  const trimmedGrade = input.gradeLabel?.trim() ?? "";
  const gradeLabel = trimmedGrade.length > 0 ? trimmedGrade : gradeLabelFromPercent(input.percentage);
  const unitHeading = formatUnitHeading(input.unitNumber, input.unitTitle);
  const trimmedCode = input.verificationCode?.trim() ?? "";
  const certificateId = trimmedCode.length > 0 ? trimmedCode : "EB-XXXXXXXX";

  // ---- Root -----------------------------------------------------------
  const root = makeEl("div", [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${String(CERTIFICATE_WIDTH)}px`,
    `height:${String(CERTIFICATE_HEIGHT)}px`,
    `background:linear-gradient(150deg,${COLORS.ivoryLight} 0%,#f9f3e4 38%,${COLORS.ivoryDark} 78%,#efe6cf 100%)`,
    "overflow:hidden",
    "z-index:-1",
  ].join(";"));

  // ---- Paper texture overlay ------------------------------------------
  const noise =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.55'/></svg>\")";
  root.appendChild(
    makeEl("div", `position:absolute;inset:0;background-image:${noise};opacity:0.045;pointer-events:none;`),
  );

  // ---- Decorative waves (top & bottom) --------------------------------
  root.appendChild(makeSvg(
    "position:absolute;top:0;left:0;width:100%;height:46px;opacity:0.5;pointer-events:none;",
    `<path d="M0 16 Q 56 -6 112 16 T 224 16 T 336 16 T 448 16 T 560 16 T 672 16 T 784 16 T 896 16 T 1008 16 T 1120 16" fill="none" stroke="#c9a74b" stroke-width="1.4"/>`,
    1122,
    46,
  ));
  root.appendChild(makeSvg(
    "position:absolute;bottom:0;left:0;width:100%;height:46px;opacity:0.5;pointer-events:none;transform:scaleY(-1);",
    `<path d="M0 16 Q 56 -6 112 16 T 224 16 T 336 16 T 448 16 T 560 16 T 672 16 T 784 16 T 896 16 T 1008 16 T 1120 16" fill="none" stroke="#b8912e" stroke-width="0.8" opacity="0.7"/>`,
    1122,
    46,
  ));

  // ---- Watermark behind the student name ------------------------------
  root.appendChild(
    makeEl(
      "div",
      `position:absolute;top:47%;left:50%;transform:translate(-50%,-50%);font-family:${FONT_TITLE};font-weight:700;font-size:150px;letter-spacing:18px;color:${COLORS.navy};opacity:0.035;white-space:nowrap;text-align:center;pointer-events:none;`,
      "EL-BANNAWY",
    ),
  );

  // ---- Outer gold frame -----------------------------------------------
  const frame = makeEl("div", [
    "position:absolute",
    "inset:16px",
    "border-radius:14px",
    `border:2.5px solid ${COLORS.gold}`,
    "box-shadow:inset 0 0 0 1px rgba(212,175,55,0.28), 0 6px 30px rgba(90,60,10,0.16)",
  ].join(";"));

  const innerFrame = makeEl("div", [
    "position:absolute",
    "inset:7px",
    "border-radius:10px",
    `border:1px solid ${COLORS.goldSoft}`,
  ].join(";"));

  const hairline = makeEl("div", [
    "position:absolute",
    "inset:13px",
    "border-radius:7px",
    `border:1px solid rgba(184,145,46,0.45)`,
  ].join(";"));
  innerFrame.appendChild(hairline);

  // Decorative corner ornaments
  const cornerPaths = (): string =>
    `<path d="M2 40 V2 H40" fill="none" stroke="${COLORS.gold}" stroke-width="2.6" stroke-linecap="round"/><path d="M8 36 V8 H36" fill="none" stroke="${COLORS.goldSoft}" stroke-width="1.1"/><path d="M2 24 V2 H24" fill="none" stroke="${COLORS.goldBright}" stroke-width="1.1" opacity="0.85"/>`;
  innerFrame.appendChild(makeSvg("position:absolute;top:2px;left:2px;", cornerPaths()));
  innerFrame.appendChild(makeSvg("position:absolute;top:2px;right:2px;transform:scaleX(-1);", cornerPaths()));
  innerFrame.appendChild(makeSvg("position:absolute;bottom:2px;left:2px;transform:scaleY(-1);", cornerPaths()));
  innerFrame.appendChild(makeSvg("position:absolute;bottom:2px;right:2px;transform:scale(-1,-1);", cornerPaths()));

  // ---- Content --------------------------------------------------------
  const content = makeEl("div", [
    "position:absolute",
    "inset:26px",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:space-between",
    "text-align:center",
    `font-family:${FONT_SANS}`,
    "padding:20px 46px 18px",
  ].join(";"));

  // ============ 1. Header ============
  const header = makeEl("div", "display:flex;flex-direction:column;align-items:center;");

  if (logoDataUri) {
    const logo = makeEl("img", [
      `width:78px`,
      `height:78px`,
      "border-radius:50%",
      `border:2px solid ${COLORS.gold}`,
      "object-fit:cover",
      "box-shadow:0 2px 10px rgba(90,60,10,0.22)",
    ].join(";"));
    logo.setAttribute("src", logoDataUri);
    logo.setAttribute("alt", "El-Bannawy Platform");
    header.appendChild(logo);
  }

  header.appendChild(
    makeEl("div", `margin-top:10px;font-family:${FONT_SERIF};font-weight:800;font-size:19px;letter-spacing:7px;color:${COLORS.goldDeep};`, "EL-BANNAWY PLATFORM"),
  );
  header.appendChild(
    makeEl("div", `margin-top:3px;font-size:8.5px;letter-spacing:4.5px;color:${COLORS.faint};font-weight:600;`, "AI-POWERED ENGLISH LEARNING"),
  );

  const ornament = makeEl("div", "display:flex;align-items:center;gap:10px;margin:13px 0 6px;");
  ornament.appendChild(makeEl("div", `width:120px;height:1px;background:linear-gradient(90deg,transparent,${COLORS.goldSoft},transparent);`));
  ornament.appendChild(makeEl("div", `width:9px;height:9px;transform:rotate(45deg);background:${COLORS.gold};`));
  ornament.appendChild(makeEl("div", `width:120px;height:1px;background:linear-gradient(90deg,transparent,${COLORS.goldSoft},transparent);`));
  header.appendChild(ornament);

  header.appendChild(
    makeEl("div", [
      `font-family:${FONT_TITLE}`,
      "font-weight:700",
      "font-size:38px",
      `color:${COLORS.goldDeep}`,
      "letter-spacing:3px",
      "text-shadow:0 1px 0 rgba(255,255,255,0.75), 0 0 1px rgba(212,175,55,0.5), 0 2px 3px rgba(90,60,10,0.22)",
    ].join(";"), "CERTIFICATE OF ACHIEVEMENT"),
  );

  content.appendChild(header);

  // ============ 2. Student area ============
  const middle = makeEl("div", "display:flex;flex-direction:column;align-items:center;");

  middle.appendChild(
    makeEl("div", `font-family:${FONT_SERIF};font-style:italic;font-weight:500;font-size:17px;color:${COLORS.muted};`, "This is to certify that"),
  );

  const nameWrap = makeEl("div", "position:relative;margin:6px 0 2px;");
  nameWrap.appendChild(
    makeEl("div", [
      `font-family:${FONT_SERIF}`,
      "font-weight:800",
      "font-size:58px",
      `color:${COLORS.navy}`,
      "letter-spacing:1.5px",
      "line-height:1.1",
      "text-shadow:0 1px 0 rgba(255,255,255,0.8), 0 3px 8px rgba(22,35,63,0.16)",
    ].join(";"), input.studentName || "Student"),
  );
  middle.appendChild(nameWrap);

  const nameUnderline = makeEl("div", "display:flex;align-items:center;gap:9px;margin:2px 0 10px;");
  nameUnderline.appendChild(makeEl("div", `width:150px;height:1.5px;background:linear-gradient(90deg,transparent,${COLORS.goldSoft});`));
  nameUnderline.appendChild(makeEl("div", `width:7px;height:7px;transform:rotate(45deg);background:${COLORS.gold};`));
  nameUnderline.appendChild(makeEl("div", `width:150px;height:1.5px;background:linear-gradient(90deg,${COLORS.goldSoft},transparent);`));
  middle.appendChild(nameUnderline);

  middle.appendChild(
    makeEl("div", "font-size:14px;color:#4b5563;letter-spacing:0.2px;", "has successfully completed the course unit"),
  );

  middle.appendChild(
    makeEl("div", `margin-top:6px;font-family:${FONT_SERIF};font-weight:700;font-size:25px;color:${COLORS.goldDeep};letter-spacing:0.4px;`, unitHeading),
  );

  content.appendChild(middle);

  // ============ 3. Statistics strip ============
  const statsStrip = makeEl("div", "display:flex;align-items:center;gap:26px;");

  const statCard = (label: string, value: string): HTMLElement => {
    const card = makeEl("div", [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "min-width:180px",
      "padding:11px 26px 13px",
      "border-radius:12px",
      `border:1px solid rgba(184,145,46,0.5)`,
      "background:linear-gradient(135deg, rgba(255,255,255,0.72), rgba(250,244,228,0.4))",
      "box-shadow:0 4px 14px rgba(120,90,30,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
    ].join(";"));
    card.appendChild(
      makeEl("div", "font-size:8.5px;font-weight:700;letter-spacing:3px;color:#9a7b22;text-transform:uppercase;", label),
    );
    card.appendChild(
      makeEl("div", `margin-top:3px;font-family:${FONT_SERIF};font-weight:800;font-size:26px;color:${COLORS.navy};`, value),
    );
    return card;
  };

  statsStrip.appendChild(statCard("Completion", `${String(input.percentage)}%`));
  statsStrip.appendChild(statCard("Result", gradeLabel));

  content.appendChild(statsStrip);

  // ============ 4. Academic details row ============
  const details = makeEl("div", "display:flex;align-items:center;justify-content:center;width:100%;");

  const detailItem = (label: string, value: string | null | undefined): HTMLElement => {
    const trimmedValue = value?.trim() ?? "";
    const item = makeEl("div", "display:flex;flex-direction:column;align-items:center;padding:0 22px;");
    item.appendChild(
      makeEl("div", "font-size:8px;font-weight:700;letter-spacing:2.5px;color:#9a7b22;text-transform:uppercase;", label),
    );
    item.appendChild(
      makeEl("div", `margin-top:3px;font-size:12.5px;font-weight:600;color:${COLORS.navy};white-space:nowrap;`, trimmedValue.length > 0 ? trimmedValue : "—"),
    );
    return item;
  };

  const divider = (): HTMLElement =>
    makeEl("div", `width:1px;height:30px;background:linear-gradient(180deg,transparent,${COLORS.goldSoft},transparent);`);

  details.appendChild(detailItem("Stage", input.stageName ?? null));
  details.appendChild(divider());
  details.appendChild(detailItem("Grade", input.gradeName ?? null));
  details.appendChild(divider());
  details.appendChild(detailItem("Course", input.courseName ?? "English Language"));
  details.appendChild(divider());
  details.appendChild(detailItem("Academic Year", input.academicYearName ?? null));
  details.appendChild(divider());
  details.appendChild(detailItem("Issue Date", date));

  content.appendChild(details);

  // ============ 5. Footer: signature + verification ============
  const footer = makeEl("div", "display:flex;align-items:flex-end;justify-content:space-between;width:100%;");

  // Signature
  const signature = makeEl("div", "display:flex;flex-direction:column;align-items:center;");
  signature.appendChild(
    makeEl("div", `width:230px;border-top:2px solid ${COLORS.navy};opacity:0.85;`),
  );
  signature.appendChild(
    makeEl("div", `margin-top:7px;font-family:${FONT_SERIF};font-style:italic;font-weight:700;font-size:20px;color:${COLORS.navy};`, "Mr. Ahmed Elbanna"),
  );
  signature.appendChild(
    makeEl("div", `margin-top:1px;font-size:9.5px;letter-spacing:2px;color:${COLORS.muted};`, "Founder & CEO"),
  );
  footer.appendChild(signature);

  // Verified badge + certificate ID
  const verification = makeEl("div", "display:flex;flex-direction:column;align-items:center;");
  const badge = makeEl("div", [
    "width:84px",
    "height:84px",
    "border-radius:50%",
    `border:3px double ${COLORS.gold}`,
    "background:radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(212,175,55,0.16) 62%, rgba(184,145,46,0.3))",
    "box-shadow:inset 0 0 0 3px rgba(255,255,255,0.5), 0 3px 10px rgba(90,60,10,0.2)",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "transform:rotate(-6deg)",
  ].join(";"));
  badge.appendChild(makeSvg(
    "display:block;",
    `<circle cx="22" cy="22" r="21" fill="none" stroke="#1fa3b8" stroke-width="2.4" opacity="0.9"/><path d="M13 22 L19.5 28.5 L31 15.5" fill="none" stroke="#1fa3b8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    44,
    44,
  ));
  badge.appendChild(
    makeEl("div", `font-family:${FONT_TITLE};font-weight:700;font-size:8px;letter-spacing:2px;color:${COLORS.goldDeep};margin-top:1px;`, "VERIFIED"),
  );
  verification.appendChild(badge);
  verification.appendChild(
    makeEl("div", `margin-top:7px;font-family:${FONT_TITLE};font-weight:700;font-size:11px;letter-spacing:1.5px;color:${COLORS.goldDeep};`, `CERTIFICATE ID: ${certificateId}`),
  );
  footer.appendChild(verification);

  // QR code
  const qrBlock = makeEl("div", "display:flex;flex-direction:column;align-items:center;");
  if (qrDataUrl) {
    const qrImg = makeEl("img", `width:88px;height:88px;border-radius:6px;`);
    qrImg.setAttribute("src", qrDataUrl);
    qrImg.setAttribute("alt", "Verify certificate");
    qrBlock.appendChild(qrImg);
  }
  qrBlock.appendChild(
    makeEl("div", `margin-top:6px;font-size:8.5px;letter-spacing:2.5px;color:${COLORS.faint};font-weight:600;`, "SCAN TO VERIFY"),
  );
  footer.appendChild(qrBlock);

  content.appendChild(footer);

  innerFrame.appendChild(content);
  frame.appendChild(innerFrame);
  root.appendChild(frame);
  return root;
}
