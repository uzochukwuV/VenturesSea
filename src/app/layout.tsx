import type { Metadata } from "next";
import "@/styles/globals.css";
import { NavBar, Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "Avax Ventures — IdeaFi Protocol",
  description: "Community-driven funding and decentralized governance for the next generation of builders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-inter antialiased">
        <NavBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
