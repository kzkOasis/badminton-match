import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "バドミントン募集",
    template: "%s | バドミントン募集",
  },
  description: "バドミントンの練習会・ゲーム会を作って、一緒に打つ人を募集できるアプリです。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="text-muted-foreground border-t py-6 text-center text-xs">
          <nav className="flex justify-center gap-4">
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシーポリシー</Link>
            <Link href="/contact">お問い合わせ</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
