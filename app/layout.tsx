import type { Metadata } from "next";
import { Unbounded, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Thick, wide display face for headlines and numbers.
const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

// Light, clean grotesk for body copy: contrasts with the heavy display face.
const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "YouTube Trend Radar",
  description: "Weekly Sunday Brief of trending YouTube topics, powered by Gemini",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
