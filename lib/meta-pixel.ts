// Sends an event to the Meta Pixel. Does nothing when the pixel isn't loaded (no ID, or no consent).

type Fbq = (command: "track" | "init" | "consent", event: string, params?: Record<string, unknown>) => void;

export function trackPixel(event: "PageView" | "CompleteRegistration" | "Lead", params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  fbq?.("track", event, params);
}
