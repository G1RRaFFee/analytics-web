import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Мониторинг численности населения РФ",
  description: "Интерактивный дашборд численности населения по регионам и муниципалитетам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full antialiased" lang="ru">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
