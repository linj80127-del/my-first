import { ImageResponse } from "next/og";

export const contentType = "image/png";
const SIZE = 512;

export function GET() {
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
          fontSize: 288,
          fontWeight: 700,
          fontFamily:
            '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif',
        }}
      >
        得
      </div>
    ),
    { width: SIZE, height: SIZE }
  );
}
