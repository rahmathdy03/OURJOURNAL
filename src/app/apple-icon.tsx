import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #171717 0%, #262626 58%, #c2410c 100%)",
          borderRadius: 38,
          color: "white",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 78,
            height: 78,
            borderRadius: 999,
            background: "rgba(234,88,12,.24)",
            top: -14,
            right: -14,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 70,
            fontWeight: 900,
            letterSpacing: -8,
            lineHeight: 1,
          }}
        >
          OJ
        </div>
      </div>
    ),
    size
  );
}
