import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "public");
const ICONS = resolve(PUBLIC, "icons");

mkdirSync(ICONS, { recursive: true });

const jpeg = readFileSync(resolve(PUBLIC, "logo.jpeg"));
const dataUri = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

function squareSvg(size, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <image href="${dataUri}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>${extra}
</svg>
`;
}

function maskableSvg(size) {
  const inset = Math.round(size * 0.12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f0f0f"/>
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}" preserveAspectRatio="xMidYMid slice"/>
</svg>
`;
}

writeFileSync(resolve(PUBLIC, "logo.svg"), squareSvg(512));
writeFileSync(resolve(ICONS, "logo.svg"), squareSvg(512));
writeFileSync(resolve(ICONS, "icon-192.svg"), squareSvg(192));
writeFileSync(resolve(ICONS, "icon-512.svg"), squareSvg(512));
writeFileSync(resolve(ICONS, "maskable-icon.svg"), maskableSvg(512));
writeFileSync(resolve(PUBLIC, "favicon.svg"), squareSvg(48));

console.log("Embedded logo.jpeg into all SVG icon sources.");
