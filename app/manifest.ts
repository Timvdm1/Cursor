export default function manifest() {
  return {
    id: "/",
    name: "Crew",
    short_name: "Crew",
    description: "Teammates met een gedeelde computer — installeer Crew als app op je laptop.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f3f3f5",
    theme_color: "#ffffff",
    lang: "nl",
    dir: "ltr",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Open Crew", short_name: "Crew", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}