import { describe, it, expect } from "vitest";
import { isInAppBrowser, getPushEnvironment } from "./firebase-messaging";

const FB_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 [FBAN/FBIOS;FBAV/450.0.0.32.109;]";
const INSTAGRAM_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.32.109";
const WHATSAPP_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 WhatsApp/2.23.20.81";
const WEBVIEW_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-A125F Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36";
const CHROME_DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("isInAppBrowser", () => {
  it("detects Facebook in-app browser", () => {
    expect(isInAppBrowser(FB_UA)).toBe(true);
  });

  it("detects Instagram in-app browser", () => {
    expect(isInAppBrowser(INSTAGRAM_UA)).toBe(true);
  });

  it("detects WhatsApp in-app browser", () => {
    expect(isInAppBrowser(WHATSAPP_UA)).toBe(true);
  });

  it("detects generic Android WebView", () => {
    expect(isInAppBrowser(WEBVIEW_UA)).toBe(true);
  });

  it("does not flag desktop Chrome", () => {
    expect(isInAppBrowser(CHROME_DESKTOP_UA)).toBe(false);
  });

  it("does not flag iPhone Safari itself", () => {
    expect(isInAppBrowser(IPHONE_SAFARI_UA)).toBe(false);
  });
});

describe("getPushEnvironment", () => {
  it("reports in-app-browser before checking capabilities", () => {
    expect(getPushEnvironment(FB_UA)).toBe("in-app-browser");
  });

  it("reports unsupported when PushManager is missing (jsdom)", () => {
    expect(getPushEnvironment(CHROME_DESKTOP_UA)).toBe("unsupported");
  });
});
