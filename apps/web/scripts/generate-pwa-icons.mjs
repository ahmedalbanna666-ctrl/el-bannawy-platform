import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "public");
const ICONS = resolve(PUBLIC, "icons");

mkdirSync(ICONS, { recursive: true });

const SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];

async function svgToPng(svgPath, size, outputPath) {
  const svg = readFileSync(svgPath, "utf-8");
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outputPath);
}

async function main() {
  const svg192 = resolve(ICONS, "icon-192.svg");
  const svg512 = resolve(ICONS, "icon-512.svg");
  const maskableSvg = resolve(ICONS, "maskable-icon.svg");

  for (const size of SIZES) {
    const src = size <= 192 ? svg192 : svg512;
    await svgToPng(src, size, resolve(ICONS, `icon-${size}.png`));
    console.log(`Created icon-${size}.png`);
  }

  await svgToPng(maskableSvg, 512, resolve(ICONS, "maskable-icon-512.png"));
  console.log("Created maskable-icon-512.png");

  await svgToPng(svg192, 192, resolve(ICONS, "apple-touch-icon.png"));
  console.log("Created apple-touch-icon.png");

  const faviconSvg = resolve(PUBLIC, "favicon.svg");
  if (existsSync(faviconSvg)) {
    await svgToPng(faviconSvg, 32, resolve(PUBLIC, "favicon.ico"));
    console.log("Created favicon.ico");
  }

  console.log("Done!");
}

main().catch(console.error);
