import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: AI audit for your Meta Ads reports`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview image shown when the site is shared on Facebook, WhatsApp, LinkedIn, X, … */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #0B1220 0%, #111827 55%, #1E3A8A 100%)",
        color: "#F8FAFC",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "linear-gradient(135deg, #3B82F6, #4F46E5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 17l5-5 4 4 8-9" />
            <path d="M15 7h5v5" />
          </svg>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700 }}>{SITE_NAME}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
          Turn your Meta Ads report into a growth plan in 60 seconds
        </div>
        <div style={{ fontSize: 30, color: "#CBD5E1" }}>AI audit · KPI scorecard · Wasted spend · Scaling plan</div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 24, color: "#93C5FD" }}>
        <span>Upload CSV or Excel</span>
        <span>·</span>
        <span>No Facebook login</span>
      </div>
    </div>,
    size,
  );
}
