"use client";

import { useEffect, type ReactNode } from "react";
import { ClerkProvider, useClerk } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";

/** Clerk só é ativado quando a publishable key está configurada (.env.local). */
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const CLERK_SIGNOUT_FLAG = "atlascrm.clerk.signout";

/* Tema do Clerk alinhado ao painel claro da tela de login (.login-modal) */
const clerkAppearance = {
  variables: {
    colorPrimary: "#ef6c00",
    colorText: "#1a120a",
    colorTextSecondary: "#8a7367",
    colorBackground: "#fffaf6",
    colorInputBackground: "#ffffff",
    colorInputText: "#1a130f",
    colorDanger: "#dc2626",
    borderRadius: "12px",
    fontFamily: "var(--font-inter), 'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none", border: "none" },
    card: { background: "transparent", boxShadow: "none", padding: "4px 2px 12px" },
    header: { display: "none" },
    footer: { background: "transparent" },
    footerAction: { display: "none" },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #ef6c00, #f57c00)",
      boxShadow: "0 4px 16px rgba(239, 108, 0, 0.22)",
      minHeight: "46px",
      fontSize: "0.92rem",
      fontWeight: "600",
      textTransform: "none",
    },
    socialButtonsBlockButton: {
      background: "#ffffff",
      borderColor: "rgba(80, 42, 14, 0.16)",
      minHeight: "44px",
    },
    formFieldInput: {
      minHeight: "44px",
      borderColor: "rgba(80, 42, 14, 0.16)",
    },
  },
};

/**
 * Mantém a sessão do Clerk em sincronia com o logout local: quando o usuário
 * sai do CRM, a sessão do Clerk também é encerrada (senão o login page faria
 * re-login automático na hora).
 */
function ClerkSessionSync() {
  const { signOut } = useClerk();

  useEffect(() => {
    const flush = () => {
      if (window.localStorage.getItem(CLERK_SIGNOUT_FLAG) !== "1") return;
      void signOut().finally(() => window.localStorage.removeItem(CLERK_SIGNOUT_FLAG));
    };

    flush();
    window.addEventListener("atlascrm:clerk:signout", flush);
    return () => window.removeEventListener("atlascrm:clerk:signout", flush);
  }, [signOut]);

  return null;
}

export function AppClerkProvider({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localization={ptBR}
      appearance={clerkAppearance}
      signInUrl="/login"
      signUpUrl="/login"
    >
      <ClerkSessionSync />
      {children}
    </ClerkProvider>
  );
}
