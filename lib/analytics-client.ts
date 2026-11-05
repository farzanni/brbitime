"use client";

function generateSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fallback
  }
  return "s-" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

interface StoredSessionInfo {
  sessionId: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

let cachedSession: StoredSessionInfo | null = null;

function getSessionInfo(): StoredSessionInfo {
  if (cachedSession) return cachedSession;
  if (typeof window === "undefined") {
    return {
      sessionId: "server",
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    };
  }

  try {
    let sid = window.sessionStorage.getItem("muu_analytics_sid");
    if (!sid) {
      sid = generateSessionId();
      window.sessionStorage.setItem("muu_analytics_sid", sid);
    }

    // Check UTM params
    const params = new URLSearchParams(window.location.search);
    const urlSource = params.get("utm_source") || params.get("ref");
    const urlMedium = params.get("utm_medium");
    const urlCampaign = params.get("utm_campaign");

    let utmSource = urlSource || window.sessionStorage.getItem("muu_utm_source");
    const utmMedium = urlMedium || window.sessionStorage.getItem("muu_utm_medium");
    const utmCampaign = urlCampaign || window.sessionStorage.getItem("muu_utm_campaign");
    let referrer = window.sessionStorage.getItem("muu_referrer");

    if (urlSource) window.sessionStorage.setItem("muu_utm_source", urlSource);
    if (urlMedium) window.sessionStorage.setItem("muu_utm_medium", urlMedium);
    if (urlCampaign) window.sessionStorage.setItem("muu_utm_campaign", urlCampaign);

    if (!referrer && document.referrer) {
      referrer = document.referrer;
      window.sessionStorage.setItem("muu_referrer", referrer);
      // Auto-detect Instagram or Telegram if not set in utm
      if (!utmSource) {
        if (referrer.includes("instagram.com")) utmSource = "instagram";
        else if (referrer.includes("t.me") || referrer.includes("telegram")) utmSource = "telegram";
      }
    }

    cachedSession = {
      sessionId: sid,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    };
    return cachedSession;
  } catch {
    return {
      sessionId: generateSessionId(),
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    };
  }
}

/**
 * Dispatch an analytics event asynchronously via Beacon or fetch.
 * Completely non-blocking and safe.
 */
export function trackClientEvent(
  eventName: string,
  eventData?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  try {
    const session = getSessionInfo();
    const payload = {
      eventName,
      eventData: eventData ?? {},
      path: window.location.pathname,
      referrer: session.referrer,
      utmSource: session.utmSource,
      utmMedium: session.utmMedium,
      utmCampaign: session.utmCampaign,
      deviceType: getDeviceType(),
      sessionId: session.sessionId,
    };

    const jsonString = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([jsonString], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/analytics", blob);
      if (sent) return;
    }

    // Fallback to fetch with keepalive
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString,
      keepalive: true,
    }).catch(() => {
      // Ignore network errors in background beacon
    });
  } catch {
    // Fail silently
  }
}
