import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "YOUTUBE CLASS · 제대로 알아야, 지속할 수 있습니다.",
  description: "막연한 시작보단, 함께 배워서 빨리 성장하고 실제적인 고민을 나눠서 채널의 방향을 찾아보아요.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
