import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "YOUTUBE CLASS · 나답게 시작하는 유튜브",
  description: "수업을 준비하고, 고민을 나누고, 내 채널의 방향을 찾아보세요.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
