import { BadRequestException } from "@nestjs/common";

const PRIVATE_IPV4_CIDRS: readonly { readonly start: number; readonly end: number }[] = [
  { start: ipv4ToInt("10.0.0.0"), end: ipv4ToInt("10.255.255.255") },
  { start: ipv4ToInt("127.0.0.0"), end: ipv4ToInt("127.255.255.255") },
  { start: ipv4ToInt("169.254.0.0"), end: ipv4ToInt("169.254.255.255") },
  { start: ipv4ToInt("172.16.0.0"), end: ipv4ToInt("172.31.255.255") },
  { start: ipv4ToInt("192.168.0.0"), end: ipv4ToInt("192.168.255.255") },
  { start: ipv4ToInt("0.0.0.0"), end: ipv4ToInt("0.255.255.255") },
  { start: ipv4ToInt("100.64.0.0"), end: ipv4ToInt("100.127.255.255") },
  { start: ipv4ToInt("192.0.0.0"), end: ipv4ToInt("192.0.0.255") },
  { start: ipv4ToInt("192.0.2.0"), end: ipv4ToInt("192.0.2.255") },
  { start: ipv4ToInt("198.18.0.0"), end: ipv4ToInt("198.19.255.255") },
  { start: ipv4ToInt("198.51.100.0"), end: ipv4ToInt("198.51.100.255") },
  { start: ipv4ToInt("203.0.113.0"), end: ipv4ToInt("203.0.113.255") },
  { start: ipv4ToInt("224.0.0.0"), end: ipv4ToInt("255.255.255.255") },
];

const PRIVATE_IPV6_PREFIXES: readonly string[] = [
  "::1",
  "::",
  "fc00::",
  "fd00::",
  "fe80::",
  "::ffff:",
  "64:ff9b::",
  "2001:db8::",
];

const BLOCKED_HOSTNAMES: readonly RegExp[] = [
  /^localhost$/i,
  /^localhost\.localdomain$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
  /\.localdomain$/i,
];

const MAX_URL_LENGTH = 2048;

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const int = ipv4ToInt(ip);
  return PRIVATE_IPV4_CIDRS.some((range) => int >= range.start && int <= range.end);
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return PRIVATE_IPV6_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

function isBlockedHostname(hostname: string): boolean {
  return BLOCKED_HOSTNAMES.some((pattern) => pattern.test(hostname));
}

export function assertSafeExternalUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new BadRequestException("URL is required");
  }

  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new BadRequestException("URL is too long");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestException("Only http/https URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isBlockedHostname(hostname)) {
    throw new BadRequestException("URL host is not allowed");
  }

  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  if (isIpv4) {
    if (isPrivateIpv4(hostname)) {
      throw new BadRequestException("URL host is not allowed");
    }
    return parsed.toString();
  }

  const isIpv6Literal = hostname.startsWith("[") && hostname.endsWith("]");
  if (isIpv6Literal) {
    if (isPrivateIpv6(hostname.slice(1, -1))) {
      throw new BadRequestException("URL host is not allowed");
    }
    return parsed.toString();
  }

  return parsed.toString();
}
