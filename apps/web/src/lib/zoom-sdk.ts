/**
 * zoom-sdk.ts — Lazy-loaded Zoom Meeting SDK (Web) client.
 *
 * The Zoom Web SDK is heavy (~several MB) and is only needed while a student
 * or teacher actually joins a live session. This module keeps it out of the
 * main bundle and loads it from the official CDN on demand, then exposes a
 * small typed surface used by the ZoomMeetingRoom component.
 *
 * The backend returns a short-lived `signature`; the SDK key/secret never
 * reach the browser.
 */

export interface ZoomJoinConfigLike {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  password: string | null;
  userName: string;
  userEmail: string;
  leaveUrl: string | null;
}

interface ZoomMtgOptions {
  zoomAppRoot: HTMLElement;
  language: string;
  patchUrlMediaSource?: boolean;
  leaveUrl?: string;
  success?: (data: unknown) => void;
  error?: (error: unknown) => void;
}

interface ZoomJoinOptions {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
  tk: string;
  zak: string;
  success?: (data: unknown) => void;
  error?: (error: unknown) => void;
}

/** Typed surface of the Zoom Web SDK global (`window.ZoomMtg`). */
export interface ZoomMtgInstance {
  preLoadWasm: () => Promise<unknown>;
  prepareWebSDK: () => void;
  i18n: { load: (lang: string) => Promise<unknown>; reload: (lang: string) => Promise<unknown> };
  init: (options: ZoomMtgOptions) => void;
  join: (options: ZoomJoinOptions) => void;
  leave: () => void;
  on: (event: string, cb: (data: unknown) => void) => void;
  off: (event: string, cb: (data: unknown) => void) => void;
}

declare global {
  interface Window {
    ZoomMtg?: ZoomMtgInstance;
  }
}

function resolveSdkVersion(): string {
  return process.env.NEXT_PUBLIC_ZOOM_SDK_VERSION?.trim() ?? "1.9.9";
}

const SDK_VERSION = resolveSdkVersion();
const IS_STAGING = process.env.NEXT_PUBLIC_ZOOM_SDK_STAGING?.trim() === "true";
const CDN_BASE = IS_STAGING
  ? `https://app.sdk.zoom.us/staging/lib/${SDK_VERSION}`
  : `https://app.sdk.zoom.us/lib/${SDK_VERSION}`;

let sdkPromise: Promise<ZoomMtgInstance> | null = null;

/**
 * Lazily injects the Zoom Web SDK script (once) and resolves with the global
 * `ZoomMtg` instance. Safe to call multiple times.
 */
export function loadZoomSdk(): Promise<ZoomMtgInstance> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<ZoomMtgInstance>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Zoom SDK can only be loaded in the browser"));
      return;
    }

    if (window.ZoomMtg) {
      resolve(window.ZoomMtg);
      return;
    }

    const script = document.createElement("script");
    script.src = `${CDN_BASE}/js/bootstrap.min.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = (): void => {
      if (window.ZoomMtg) {
        resolve(window.ZoomMtg);
      } else {
        reject(new Error("Zoom SDK loaded but ZoomMtg was not found"));
      }
    };
    script.onerror = (): void => {
      sdkPromise = null;
      reject(new Error("تعذر تحميل Zoom SDK. تأكد من اتصالك بالإنترنت"));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Prepares the SDK (wasm preload + web worker) then joins the meeting.
 */
export async function joinZoomMeeting(
  config: ZoomJoinConfigLike,
  container: HTMLElement,
): Promise<void> {
  const zoomMtg = await loadZoomSdk();
  await zoomMtg.preLoadWasm();
  zoomMtg.prepareWebSDK();
  await zoomMtg.i18n.load("en-US");
  await zoomMtg.i18n.reload("en-US");

  await new Promise<void>((resolve, reject) => {
    zoomMtg.init({
      zoomAppRoot: container,
      language: "en-US",
      patchUrlMediaSource: true,
      leaveUrl: config.leaveUrl ?? undefined,
      success: (): void => { resolve(); },
      error: (error: unknown): void => {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    });
  });

  await new Promise<void>((resolve, reject) => {
    zoomMtg.join({
      sdkKey: config.sdkKey,
      signature: config.signature,
      meetingNumber: config.meetingNumber,
      password: config.password ?? "",
      userName: config.userName,
      userEmail: config.userEmail,
      tk: "",
      zak: "",
      success: (): void => { resolve(); },
      error: (error: unknown): void => {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    });
  });
}

/**
 * Leaves the current meeting and releases the injected DOM.
 */
export function leaveZoomMeeting(): void {
  if (typeof window === "undefined" || !window.ZoomMtg) return;
  try {
    window.ZoomMtg.leave();
  } catch {
    // The SDK may already be torn down; cleanup below is idempotent.
  }
}

/**
 * Best-effort in-memory reference used to avoid re-triggering full teardown.
 */
export function hasZoomSdkLoaded(): boolean {
  return typeof window !== "undefined" && Boolean(window.ZoomMtg);
}
