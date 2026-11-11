import type { MetadataRoute } from "next";

/** The pan mark from the logo, for a phone home screen and the browser's own chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ao Lume",
    short_name: "Ao Lume",
    description: "Chefs privados e cozinheiros caseiros perto de si.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fb",
    theme_color: "#1d4aa1",
    lang: "pt-PT",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
