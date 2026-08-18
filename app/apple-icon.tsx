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
          background: "#2b2926",
          color: "#f7f5f0",
          fontSize: 100,
          fontWeight: 700,
          fontFamily:
            '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif',
        }}
      >
        得
      </div>
    ),
    { ...size }
  );
}
