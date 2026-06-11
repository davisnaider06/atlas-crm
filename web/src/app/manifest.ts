import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas CRM",
    short_name: "Atlas CRM",
    description: "CRM SaaS multi-tenant com vendas, pipeline e automações.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#040506",
    theme_color: "#040506",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
