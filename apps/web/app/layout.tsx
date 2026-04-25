import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title: "Dalbo",
  description: "Dalbo food delivery platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fffaf5]">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
