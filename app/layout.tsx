import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "路刻 Lukee",
  description: "真实可用的旅行路线、地图、美食和拍照机位 App 原型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
