import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import BottomNav from "@/components/bottom-nav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FitBlood",
  description: "혈액검사 결과 스캔 & 추이 분석",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        <main className="mx-auto max-w-md min-h-screen pb-20">{children}</main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
