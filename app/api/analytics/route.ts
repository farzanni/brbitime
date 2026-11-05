import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    } else {
      const text = await request.text();
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    }

    const {
      eventName,
      eventData,
      path,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      deviceType,
      sessionId,
    } = body ?? {};

    if (!eventName || typeof eventName !== "string") {
      return NextResponse.json({ ok: false, error: "Missing eventName" }, { status: 400 });
    }

    await recordAnalyticsEvent({
      eventName: eventName.slice(0, 64),
      eventData: typeof eventData === "object" && eventData !== null ? (eventData as Record<string, unknown>) : {},
      path: typeof path === "string" ? path.slice(0, 255) : "/",
      referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
      utmSource: typeof utmSource === "string" ? utmSource.slice(0, 64) : null,
      utmMedium: typeof utmMedium === "string" ? utmMedium.slice(0, 64) : null,
      utmCampaign: typeof utmCampaign === "string" ? utmCampaign.slice(0, 64) : null,
      deviceType: typeof deviceType === "string" ? deviceType.slice(0, 32) : null,
      sessionId: typeof sessionId === "string" ? sessionId.slice(0, 64) : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Analytics] Error processing event:", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
