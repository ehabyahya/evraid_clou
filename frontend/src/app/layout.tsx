import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "EVRaid Fleet Platform",
  description: "Enterprise Battery Fleet Management, Diagnostics & Telematics Platform",
  icons: {
    icon: [
      { url: "/ev_tabLogo.png", sizes: "any" },
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}

