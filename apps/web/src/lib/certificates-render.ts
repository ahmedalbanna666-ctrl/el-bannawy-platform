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
// Brand palette — Ivory paper / Gold / Deep Navy
// ---------------------------------------------------------------
const COLORS = {
  ivoryLight: "#F8F4E8",
  ivoryDark: "#FFFDF9",
  ivoryEdge: "#F1EADB",
  gold: "#C8A95B",
  goldLight: "#E6D6A8",
  goldDeep: "#8C6F2E",
  navy: "#102A5A",
  ink: "#3A4658",
  muted: "#6E7A94",
  faint: "#9A8F77",
  white: "#FFFFFF",
} as const;

// Maximum three fonts: one serif (Cinzel), one sans (Inter), one signature (Great Vibes).
const FONT_SERIF = `'Cinzel', Georgia, 'Times New Roman', serif`;
const FONT_SANS = `var(--font-ui-english), 'Inter', ui-sans-serif, system-ui, sans-serif`;
const FONT_SIGNATURE = `'Great Vibes', 'Brush Script MT', cursive`;

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
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    try {
      await Promise.all([
        document.fonts.load('700 40px "Cinzel"'),
        document.fonts.load('500 64px "Cinzel"'),
        document.fonts.load('400 34px "Great Vibes"'),
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

/** Small thin-stroke gold line icon used by the result cards / info row. */
function makeGoldIcon(inner: string, size = 18): SVGElement {
  return makeSvg(
    `display:block;flex-shrink:0;`,
    `<g fill="none" stroke="${COLORS.goldDeep}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`,
    size,
    size,
  );
}

const ICONS = {
  trophy: `<path d="M5 3h10v3.5a5 5 0 0 1-10 0z"/><path d="M5 4H3v1a3.5 3.5 0 0 0 3.5 3.5"/><path d="M15 4h2v1a3.5 3.5 0 0 1-3.5 3.5"/><path d="M10 11.5V13"/><path d="M7.5 15.5h5V17h-5z"/><path d="M10 13v2"/>`,
  checkCircle: `<circle cx="9" cy="9" r="7"/><path d="m6 9 2.2 2.2L12 7.4"/>`,
  calendar: `<rect x="2.5" y="4" width="13" height="12" rx="2"/><path d="M2.5 8h13"/><path d="M5.5 2v3M12.5 2v3"/>`,
  graduation: `<path d="M9 3 2 6l7 3 7-3-7-3z"/><path d="M5 8.2V12c0 1.2 1.8 2.2 4 2.2s4-1 4-2.2V8.2"/><path d="M14 8.6V12"/>`,
  book: `<path d="M9 4.5C8 3.7 6.3 3.5 4.5 3.5v11c1.8 0 3.5.2 4.5 1 1-.8 2.7-1 4.5-1v-11c-1.8 0-3.5.2-4.5 1z"/><path d="M9 4.5v11"/>`,
  medal: `<circle cx="9" cy="9.5" r="4.5"/><path d="M9 7.6l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" fill="rgba(140,111,46,0.18)"/><path d="m6 13.5-1 5 4-2 4 2-1-5"/>`,
  school: `<path d="M2 10.5 9 4l7 6.5v7H2z"/><path d="M6 17.5v-5h6v5"/>`,
} as const;

function gradeLabelFromPercent(percent: number): string {
  if (percent >= 90) return "Excellent";
  if (percent >= 80) return "Very Good";
  if (percent >= 70) return "Good";
  if (percent >= 60) return "Pass";
  return "Needs Improvement";
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
  const courseName = input.courseName?.trim() ?? "English Language";
  const trimmedCode = input.verificationCode?.trim() ?? "";
  const certificateId = trimmedCode.length > 0 ? trimmedCode : "EB-XXXXXXXX";

  // ---- Root -----------------------------------------------------------
  const root = makeEl("div", [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${String(CERTIFICATE_WIDTH)}px`,
    `height:${String(CERTIFICATE_HEIGHT)}px`,
    `background:radial-gradient(ellipse 118% 96% at 50% 42%, ${COLORS.ivoryDark} 0%, ${COLORS.ivoryLight} 58%, ${COLORS.ivoryEdge} 100%)`,
    "overflow:hidden",
    "z-index:-1",
  ].join(";"));

  // ---- Expensive paper texture + faint geometric pattern ---------------
  const noise =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.5'/></svg>\")";
  root.appendChild(
    makeEl("div", `position:absolute;inset:0;background-image:${noise};opacity:0.03;pointer-events:none;`),
  );
  const geometric =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34'><path d='M17 4 L30 17 L17 30 L4 17 Z' fill='none' stroke='%23C8A95B' stroke-width='0.5'/></svg>\")";
  root.appendChild(
    makeEl("div", `position:absolute;inset:0;background-image:${geometric};opacity:0.05;pointer-events:none;`),
  );

  // ---- Soft wave lines (top & bottom) ----------------------------------
  root.appendChild(makeSvg(
    "position:absolute;top:0;left:0;width:100%;height:42px;opacity:0.18;pointer-events:none;",
    `<path d="M0 16 Q 56 -6 112 16 T 224 16 T 336 16 T 448 16 T 560 16 T 672 16 T 784 16 T 896 16 T 1008 16 T 1120 16" fill="none" stroke="#C8A95B" stroke-width="1.2"/>`,
    1122,
    42,
  ));
  root.appendChild(makeSvg(
    "position:absolute;bottom:0;left:0;width:100%;height:42px;opacity:0.18;pointer-events:none;transform:scaleY(-1);",
    `<path d="M0 16 Q 56 -6 112 16 T 224 16 T 336 16 T 448 16 T 560 16 T 672 16 T 784 16 T 896 16 T 1008 16 T 1120 16" fill="none" stroke="#C8A95B" stroke-width="1.2"/>`,
    1122,
    42,
  ));

  // ---- Almost invisible AB watermark behind the student name ------------
  const watermark = makeEl("div", [
    "position:absolute",
    "top:45%",
    "left:50%",
    "transform:translate(-50%,-50%)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "pointer-events:none",
  ].join(";"));
  if (logoDataUri) {
    const wmImg = makeEl("img", "width:330px;height:330px;object-fit:contain;opacity:0.04;");
    wmImg.setAttribute("src", logoDataUri);
    wmImg.setAttribute("alt", "");
    watermark.appendChild(wmImg);
  } else {
    watermark.appendChild(
      makeEl("div", `font-family:${FONT_SERIF};font-weight:700;font-size:150px;letter-spacing:16px;color:${COLORS.navy};opacity:0.04;white-space:nowrap;text-align:center;`, "AB"),
    );
  }
  root.appendChild(watermark);

  // ---- Double gold border with classic corners ---------------------------
  const frame = makeEl("div", [
    "position:absolute",
    "inset:18px",
    "border-radius:10px",
    `border:1.5px solid ${COLORS.gold}`,
  ].join(";"));

  const innerFrame = makeEl("div", [
    "position:absolute",
    "inset:7px",
    "border-radius:7px",
    `border:1px solid ${COLORS.gold}`,
  ].join(";"));

  // Small classic ornaments in the four corners only.
  const cornerOrnament = (): string =>
    `<path d="M2 40 V2 H40" fill="none" stroke="${COLORS.gold}" stroke-width="1.3" stroke-linecap="round"/><path d="M7 36 V7 H36" fill="none" stroke="${COLORS.gold}" stroke-width="0.7" opacity="0.75"/><path d="M15 2 V2" stroke="none"/><rect x="18" y="18" width="5" height="5" fill="${COLORS.goldLight}" transform="rotate(45 20.5 20.5)"/>`;
  innerFrame.appendChild(makeSvg("position:absolute;top:3px;left:3px;", cornerOrnament()));
  innerFrame.appendChild(makeSvg("position:absolute;top:3px;right:3px;transform:scaleX(-1);", cornerOrnament()));
  innerFrame.appendChild(makeSvg("position:absolute;bottom:3px;left:3px;transform:scaleY(-1);", cornerOrnament()));
  innerFrame.appendChild(makeSvg("position:absolute;bottom:3px;right:3px;transform:scale(-1,-1);", cornerOrnament()));

  // ---- Content ----------------------------------------------------------
  const content = makeEl("div", [
    "position:absolute",
    "inset:34px",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:space-between",
    "text-align:center",
    `font-family:${FONT_SANS}`,
    "padding:12px 46px 10px",
  ].join(";"));

  // ============ 1. Header ============
  const header = makeEl("div", "display:flex;flex-direction:column;align-items:center;");

  if (logoDataUri) {
    const logo = makeEl("img", [
      "width:86px",
      "height:86px",
      "border-radius:50%",
      `border:1.5px solid ${COLORS.gold}`,
      "object-fit:cover",
      "box-shadow:0 2px 10px rgba(16,42,90,0.10)",
    ].join(";"));
    logo.setAttribute("src", logoDataUri);
    logo.setAttribute("alt", "El-Bannawy Platform");
    header.appendChild(logo);
  }

  header.appendChild(
    makeEl("div", `margin-top:12px;font-family:${FONT_SERIF};font-weight:700;font-size:20px;letter-spacing:8px;color:${COLORS.navy};`, "EL-BANNAWY PLATFORM"),
  );
  header.appendChild(
    makeEl("div", `margin-top:4px;font-family:${FONT_SANS};font-weight:300;font-size:9px;letter-spacing:4.5px;color:${COLORS.faint};`, "AI-POWERED ENGLISH LEARNING"),
  );

  const ornament = makeEl("div", "display:flex;align-items:center;gap:10px;margin:9px 0 7px;");
  ornament.appendChild(makeEl("div", "width:150px;height:1px;background:linear-gradient(90deg,transparent,#C8A95B);"));
  ornament.appendChild(makeSvg("display:block;", `<rect x="4" y="4" width="6" height="6" fill="#C8A95B" transform="rotate(45 7 7)"/>`, 14, 14));
  ornament.appendChild(makeEl("div", "width:150px;height:1px;background:linear-gradient(90deg,#C8A95B,transparent);"));
  header.appendChild(ornament);

  header.appendChild(
    makeEl("div", [
      `font-family:${FONT_SERIF}`,
      "font-weight:600",
      "font-size:33px",
      `color:${COLORS.goldDeep}`,
      "letter-spacing:3px",
      "line-height:1.1",
      "margin:3px 0 0",
    ].join(";"), "CERTIFICATE OF ACHIEVEMENT"),
  );

  content.appendChild(header);

  // ============ 2. Student area ============
  const middle = makeEl("div", "display:flex;flex-direction:column;align-items:center;");

  middle.appendChild(
    makeEl("div", `font-family:${FONT_SERIF};font-weight:500;font-size:16px;letter-spacing:2px;color:${COLORS.muted};`, "PROUDLY PRESENTED TO"),
  );

  const dividerAbove = makeEl("div", "display:flex;align-items:center;gap:10px;margin:8px 0 4px;");
  dividerAbove.appendChild(makeEl("div", "width:120px;height:1px;background:linear-gradient(90deg,transparent,#C8A95B);"));
  dividerAbove.appendChild(makeSvg("display:block;", `<rect x="4" y="4" width="6" height="6" fill="#C8A95B" transform="rotate(45 7 7)"/>`, 14, 14));
  dividerAbove.appendChild(makeEl("div", "width:120px;height:1px;background:linear-gradient(90deg,#C8A95B,transparent);"));
  middle.appendChild(dividerAbove);

  const nameWrap = makeEl("div", "position:relative;margin:2px 0 0;");
  nameWrap.appendChild(
    makeEl("div", [
      `font-family:${FONT_SERIF}`,
      "font-weight:600",
      "font-size:56px",
      `color:${COLORS.navy}`,
      "letter-spacing:1px",
      "line-height:1.15",
      "text-shadow:0 1px 0 rgba(255,255,255,0.75), 0 2px 6px rgba(16,42,90,0.10)",
    ].join(";"), input.studentName || "Student"),
  );
  middle.appendChild(nameWrap);

  const dividerBelow = makeEl("div", "display:flex;align-items:center;gap:10px;margin:2px 0 6px;");
  dividerBelow.appendChild(makeEl("div", "width:120px;height:1px;background:linear-gradient(90deg,transparent,#C8A95B);"));
  dividerBelow.appendChild(makeSvg("display:block;", `<rect x="4" y="4" width="6" height="6" fill="#C8A95B" transform="rotate(45 7 7)"/>`, 14, 14));
  dividerBelow.appendChild(makeEl("div", "width:120px;height:1px;background:linear-gradient(90deg,#C8A95B,transparent);"));
  middle.appendChild(dividerBelow);

  middle.appendChild(
    makeEl("div", [
      `font-family:${FONT_SANS}`,
      "font-weight:400",
      "font-size:13px",
      `color:${COLORS.ink}`,
      "letter-spacing:0.3px",
      "line-height:1.6",
      "max-width:600px",
    ].join(";"), "in recognition of outstanding dedication and successful completion of"),
  );

  middle.appendChild(
    makeEl("div", `margin-top:5px;font-family:${FONT_SERIF};font-weight:600;font-size:24px;color:${COLORS.navy};letter-spacing:0.5px;`, courseName),
  );
  middle.appendChild(
    makeEl("div", `margin-top:1px;font-family:${FONT_SERIF};font-weight:600;font-size:12px;letter-spacing:5px;color:${COLORS.goldDeep};`, `UNIT ${String(input.unitNumber)}`),
  );

  content.appendChild(middle);

  // ============ 3. Result cards ============
  const statsStrip = makeEl("div", "display:flex;align-items:stretch;gap:24px;");

  const statCard = (label: string, value: string, icon: SVGElement): HTMLElement => {
    const card = makeEl("div", [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "min-width:190px",
      "padding:7px 26px 9px",
      "border-radius:10px",
      `border:1px solid ${COLORS.gold}`,
      "background:linear-gradient(180deg, rgba(255,253,249,0.92), rgba(248,244,232,0.55))",
      "box-shadow:0 1px 3px rgba(16,42,90,0.06)",
    ].join(";"));
    card.appendChild(icon);
    card.appendChild(
      makeEl("div", `margin-top:2px;font-family:${FONT_SANS};font-weight:600;font-size:8.5px;letter-spacing:3px;color:${COLORS.faint};text-transform:uppercase;`, label),
    );
    card.appendChild(
      makeEl("div", `margin-top:3px;font-family:${FONT_SERIF};font-weight:600;font-size:24px;color:${COLORS.navy};`, value),
    );
    return card;
  };

  statsStrip.appendChild(statCard("Completion", `${String(input.percentage)}%`, makeGoldIcon(ICONS.checkCircle)));
  statsStrip.appendChild(statCard("Result", gradeLabel, makeGoldIcon(ICONS.trophy)));

  content.appendChild(statsStrip);

  // ============ 4. Academic details row ============
  const details = makeEl("div", "display:flex;align-items:center;justify-content:center;width:100%;");

  const detailItem = (label: string, value: string | null | undefined, icon: SVGElement): HTMLElement => {
    const trimmedValue = value?.trim() ?? "";
    const item = makeEl("div", "display:flex;flex-direction:column;align-items:center;padding:0 21px;");
    item.appendChild(icon);
    item.appendChild(
      makeEl("div", `margin-top:2px;font-family:${FONT_SANS};font-weight:600;font-size:7.5px;letter-spacing:2.5px;color:${COLORS.faint};text-transform:uppercase;`, label),
    );
    item.appendChild(
      makeEl("div", `margin-top:2px;font-family:${FONT_SANS};font-weight:600;font-size:12px;color:${COLORS.navy};white-space:nowrap;`, trimmedValue.length > 0 ? trimmedValue : "—"),
    );
    return item;
  };

  const divider = (): HTMLElement =>
    makeEl("div", `width:1px;height:34px;background:linear-gradient(180deg,transparent,${COLORS.gold},transparent);`);

  details.appendChild(detailItem("Issue Date", date, makeGoldIcon(ICONS.calendar)));
  details.appendChild(divider());
  details.appendChild(detailItem("Academic Year", input.academicYearName ?? null, makeGoldIcon(ICONS.graduation)));
  details.appendChild(divider());
  details.appendChild(detailItem("Course", courseName, makeGoldIcon(ICONS.book)));
  details.appendChild(divider());
  details.appendChild(detailItem("Grade", input.gradeName ?? null, makeGoldIcon(ICONS.medal)));
  details.appendChild(divider());
  details.appendChild(detailItem("Stage", input.stageName ?? null, makeGoldIcon(ICONS.school)));

  content.appendChild(details);

  // ============ 5. Footer: signature + seal + QR ============
  const footer = makeEl("div", "display:flex;align-items:flex-end;justify-content:space-between;width:100%;");

  // Signature
  const signature = makeEl("div", "display:flex;flex-direction:column;align-items:center;width:240px;");
  signature.appendChild(
    makeEl("div", "width:210px;border-top:1px solid rgba(16,42,90,0.5);"),
  );
  signature.appendChild(
    makeEl("div", `margin-top:6px;font-family:${FONT_SIGNATURE};font-weight:400;font-size:32px;color:${COLORS.navy};line-height:1.1;`, "Mr. Ahmed El-Banna"),
  );
  signature.appendChild(
    makeEl("div", `margin-top:1px;font-family:${FONT_SANS};font-weight:500;font-size:9px;letter-spacing:2.5px;color:${COLORS.muted};`, "FOUNDER & CEO"),
  );
  footer.appendChild(signature);

  // Verification seal (center) + certificate ID capsule
  const verification = makeEl("div", "display:flex;flex-direction:column;align-items:center;gap:6px;");
  const seal = makeEl("div", [
    "width:92px",
    "height:92px",
    "border-radius:50%",
    `border:2.5px solid ${COLORS.gold}`,
    "background:radial-gradient(circle at 50% 34%, #F7EFD8 0%, #E6D6A8 34%, #C8A95B 68%, #A98B45 100%)",
    "box-shadow:inset 0 2px 6px rgba(255,255,255,0.55), inset 0 -3px 7px rgba(90,66,20,0.28), 0 1px 2px rgba(90,66,20,0.18)",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
  ].join(";"));
  seal.appendChild(
    makeEl("div", `font-family:${FONT_SERIF};font-weight:700;font-size:9px;letter-spacing:1.5px;color:${COLORS.navy};text-shadow:0 1px 0 rgba(255,255,255,0.5);`, "EL-BANNAWY"),
  );
  seal.appendChild(
    makeEl("div", "width:44px;height:1px;background:rgba(16,42,90,0.35);margin:2px 0;"),
  );
  seal.appendChild(
    makeEl("div", `font-family:${FONT_SERIF};font-weight:700;font-size:8px;letter-spacing:2px;color:${COLORS.navy};text-shadow:0 1px 0 rgba(255,255,255,0.5);`, "VERIFIED"),
  );
  seal.appendChild(
    makeEl("div", `font-family:${FONT_SANS};font-weight:600;font-size:6px;letter-spacing:1.5px;color:${COLORS.navy};margin-top:1px;text-shadow:0 1px 0 rgba(255,255,255,0.5);`, "AI POWERED"),
  );
  verification.appendChild(seal);

  const capsule = makeEl("div", [
    "border-radius:999px",
    `border:1px solid ${COLORS.gold}`,
    "background:rgba(255,253,249,0.6)",
    "padding:4px 18px",
    `font-family:${FONT_SERIF}`,
    "font-weight:600",
    "font-size:10px",
    "letter-spacing:2px",
    `color:${COLORS.goldDeep}`,
    "white-space:nowrap",
  ].join(";"), `CERTIFICATE ID · ${certificateId}`);
  verification.appendChild(capsule);
  footer.appendChild(verification);

  // QR code
  const qrBlock = makeEl("div", "display:flex;flex-direction:column;align-items:center;width:240px;");
  if (qrDataUrl) {
    const qrImg = makeEl("img", [
      "width:82px",
      "height:82px",
      "border-radius:4px",
      `border:1px solid rgba(200,169,91,0.6)`,
      "background:#fff",
      "padding:2px",
    ].join(";"));
    qrImg.setAttribute("src", qrDataUrl);
    qrImg.setAttribute("alt", "Verify certificate");
    qrBlock.appendChild(qrImg);
  }
  qrBlock.appendChild(
    makeEl("div", `margin-top:5px;font-family:${FONT_SANS};font-weight:600;font-size:8px;letter-spacing:2.5px;color:${COLORS.goldDeep};`, "SCAN TO VERIFY"),
  );
  qrBlock.appendChild(
    makeEl("div", `margin-top:2px;font-family:${FONT_SANS};font-weight:400;font-size:9.5px;color:${COLORS.muted};`, "verify.el-bannawy.com"),
  );
  footer.appendChild(qrBlock);

  content.appendChild(footer);

  innerFrame.appendChild(content);
  frame.appendChild(innerFrame);
  root.appendChild(frame);
  return root;
}
