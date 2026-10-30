import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mingle — Sorsogon Community & Events",
    short_name: "Mingle",
    description:
      "Discover local events, activity maps, group chats, and people around you in Sorsogon.",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#FF3366",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/minglelogo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

