import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "コンビニ プライチ・お得情報",
    short_name: "プライチ速報",
    description:
      "セブン-イレブン・ローソン・ファミリーマートの「1個買うと1個もらえる」等のキャンペーン情報まとめ",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ea580c",
    lang: "ja",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
