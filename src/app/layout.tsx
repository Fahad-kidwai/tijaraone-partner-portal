import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TijaraOne — Partner & Referral Portal",
  description: "Executive Portal for TijaraOne Partners. Track client referrals, generate unique tokens, and view real-time reward status.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F7FC] text-slate-800 antialiased selection:bg-[#004DD9] selection:text-white">
        {children}
      </body>
    </html>
  );
}
