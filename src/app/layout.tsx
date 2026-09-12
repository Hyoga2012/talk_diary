import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Talk Diary | 말로 쓰는 다이어리",
  description:
    "음성으로 일정·생각·아이디어를 남기고, 날짜별 기록과 할일을 자동으로 정리하는 다이어리",
  applicationName: "Talk Diary",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3efe6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <main className="flex min-h-full flex-1 flex-col">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
