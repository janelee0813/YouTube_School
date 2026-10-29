import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "YOUTUBE CLASS · 수업 안내",
  description: "수업을 살펴보고, 다음 시작을 준비해 보세요.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
