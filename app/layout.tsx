import type { Metadata } from "next";
import { Poppins, Space_Mono } from "next/font/google";
import "./globals.css";

// Heavy geometric sans for headlines; light weights for body copy.
const display = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

// Monospace for the black label strips and small caps labels.
const label = Space_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "YouTube Trend Radar",
  description: "Weekly Sunday Brief of trending YouTube topics, powered by Gemini",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${label.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
