import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lift Log",
    short_name: "Lift Log",
    description: "Personal workout planner and tracker",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's workout", short_name: "Today", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Log body weight", short_name: "Weight", url: "/weight", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Statistics", short_name: "Stats", url: "/stats", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
