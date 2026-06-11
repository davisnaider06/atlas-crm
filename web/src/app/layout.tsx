import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppFrame } from "@/components/auth/app-frame";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NotificationProvider, NotificationModal } from "@/components/ui/notification-context";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas CRM",
  description: "CRM SaaS multi-tenant com vendas, pipeline e automacoes.",
  applicationName: "Atlas CRM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atlas CRM",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#040506",
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
              <ServiceWorkerRegister />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
