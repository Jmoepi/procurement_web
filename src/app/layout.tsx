import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Procurement Radar SA | Find South African Tenders & RFQs",
  description:
    "Discover courier and printing tender opportunities across South African government and corporate sectors. Get daily email digests of new RFQs, RFPs, and tenders.",
  keywords: [
    "South Africa tenders",
    "procurement",
    "RFQ",
    "RFP",
    "courier tenders",
    "printing tenders",
    "government contracts",
    "SA government tenders",
  ],
  authors: [{ name: "Procurement Radar SA" }],
  openGraph: {
    title: "Procurement Radar SA",
    description: "Find South African Tenders & RFQs for Courier and Printing Services",
    type: "website",
    locale: "en_ZA",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
