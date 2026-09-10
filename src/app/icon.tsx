import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 112,
          color: "white",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 210,
            height: 210,
            borderRadius: 999,
            background: "rgba(234,88,12,.22)",
            top: -42,
            right: -38,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 176, fontWeight: 900, letterSpacing: -20, lineHeight: 1 }}>
            OJ
          </div>
          <div style={{ marginTop: 20, fontSize: 28, fontWeight: 800, letterSpacing: 10 }}>
            OURJOURNAL
          </div>
        </div>
      </div>
    ),
    size
  );
}
