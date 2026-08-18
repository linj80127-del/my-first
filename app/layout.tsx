import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "コンビニ プライチ・お得情報",
  description: "セブン-イレブン・ローソン・ファミリーマートの「1個買うと1個もらえる」等のキャンペーン情報まとめ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
