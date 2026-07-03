import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navigation } from "@/components/navigation";
import { PushListener } from "@/components/push-listener";

export const metadata: Metadata = {
  title: "TravelTogether — Совместные путешествия",
  description: "Планируйте путешествия, ведите бюджет и делите расходы вместе",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        <AuthProvider>
          <PushListener />
          <Navigation />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
