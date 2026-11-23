import { TydBaseLogo } from "@tydbase/ui";
import { ImageResponse } from "next/og";

// Share card for tydbase.blivius.com. Satori can't parse OKLCH, so these are the hex
// equivalents of the tokens in packages/ui/src/tokens.css.
const GROUND = "#020504";
const BORDER = "#1b241f";
const INK = "#eef3f0";
const INK_SECONDARY = "#abb4af";
const ACCENT = "#4ad496";

export const alt = "TydBase by Blivius: every agent write waits for a teammate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: GROUND,
        borderBottom: `12px solid ${ACCENT}`,
      }}
    >
      <TydBaseLogo width={264} height={40} style={{ color: INK }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{ fontSize: 76, fontWeight: 700, color: INK, lineHeight: 1.05, letterSpacing: -2 }}
        >
          Every agent write waits for a teammate.
        </div>
        <div style={{ fontSize: 32, color: INK_SECONDARY, lineHeight: 1.35, maxWidth: 940 }}>
          Safe Postgres access for your team&apos;s coding agents. They never hold the password, and
          a teammate approves every write. Self-hosted and open source.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${BORDER}`,
          paddingTop: 24,
          fontSize: 26,
          color: INK_SECONDARY,
        }}
      >
        <span>TydBase by Blivius</span>
        <span style={{ color: ACCENT }}>tydbase.blivius.com</span>
      </div>
    </div>,
    size
  );
}
