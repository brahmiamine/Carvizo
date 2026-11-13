import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Carvizo · Mon garage connecté",
  description:
    "Suivez vos véhicules, entretiens, carburant, dépenses et rappels. Gratuit et sans publicité.",
  applicationName: "Carvizo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Carvizo",
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "512x512" },
      { url: "/brand-icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-icon", type: "image/png", sizes: "180x180" },
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0c1b2b",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const preference=localStorage.getItem("carvizo-theme");const theme=preference==="dark"||preference==="light"?preference:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{}})()`,
          }}
        />
        <link rel="apple-touch-startup-image" href="/splash" />
      </head>
      <body>{children}</body>
    </html>
  );
}
