import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppFrame } from "@/components/auth/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas CRM",
  description: "CRM SaaS multi-tenant com vendas, pipeline e automacoes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
