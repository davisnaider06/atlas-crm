import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppFrame } from "@/components/auth/app-frame";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NotificationProvider, NotificationModal } from "@/components/ui/notification-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppFrame>{children}</AppFrame>
              <NotificationModal />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
