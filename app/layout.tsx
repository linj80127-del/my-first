import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "コンビニ プライチ・お得情報",
  description: "セブン-イレブン・ローソン・ファミリーマートの「1個買うと1個もらえる」等のキャンペーン情報まとめ",
  appleWebApp: {
    capable: true,
    title: "プライチ速報",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b2926",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
