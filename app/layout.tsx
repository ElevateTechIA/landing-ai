import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import ChatModeToggle from "./components/ChatModeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Customer Service AI v.0.0.2",
  description: "Building the Future of Your Business with Custom AI & Software. Tailored solutions for SMBs and startups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <Navbar />
          {children}
          <ChatModeToggle />
          <elevenlabs-convai agent-id="agent_9701kfjwedcxec8tfmakmvzb2mvm"></elevenlabs-convai>
        </LanguageProvider>
      </body>
    </html>
  );
}
