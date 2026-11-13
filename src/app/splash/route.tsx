import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand-mark";
export const runtime = "nodejs";
export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0b1928",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          width: 475,
          height: 475,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 100,
          background: "#ffffff",
        }}
      >
        <BrandMark width={420} height={420} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 100,
          fontWeight: 800,
          marginTop: 45,
          letterSpacing: -4,
        }}
      >
        Car<span style={{ color: "#04baa9" }}>vizo</span>
      </div>
      <div
        style={{
          fontSize: 30,
          color: "#9bb2c0",
          marginTop: 20,
          letterSpacing: 4,
        }}
      >
        MA VOITURE, SANS OUBLI
      </div>
    </div>,
    { width: 1170, height: 2532 },
  );
}
