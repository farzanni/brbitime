"use client";

import { useEffect, useRef } from "react";
import { trackClientEvent } from "@/lib/analytics-client";

export default function AnalyticsTracker() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    trackClientEvent("page_view", {
      path: window.location.pathname,
      title: typeof document !== "undefined" ? document.title : "",
    });
  }, []);

  return null;
}
