"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn, SignUp, useAuth as useClerkAuth } from "@clerk/nextjs";
import { useAuth } from "@/components/auth/auth-provider";
import { clerkEnabled, CLERK_SIGNOUT_FLAG } from "@/components/auth/clerk-provider";
import { api } from "@/lib/api";

type AuthMode = "login" | "register";

/* ---------- Login/cadastro via Clerk (token trocado pelo JWT do backend) ---------- */
function ClerkAuthPanel({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { adoptSession } = useAuth();
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const exchanging = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || exchanging.current) return;
    // Logout local em andamento: espera o Clerk encerrar a sessão
    if (window.localStorage.getItem(CLERK_SIGNOUT_FLAG) === "1") return;

    exchanging.current = true;
    let cancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    void (async () => {
      // Logo após o sign-in a sessão do Clerk pode não estar totalmente
      // hidratada (getToken null / clock skew), fazendo a 1ª troca falhar.
      // Antes isso travava até um reload manual — agora tentamos algumas
      // vezes com backoff antes de mostrar erro.
      const MAX_ATTEMPTS = 4;
      let lastError: unknown = null;

      for (let i = 0; i < MAX_ATTEMPTS && !cancelled; i += 1) {
        if (i > 0) await sleep(300 * i); // 0, 300, 600, 900ms
        if (cancelled) return;
        try {
          const clerkToken = await getToken();
          if (!clerkToken) {
            lastError = new Error("Sessão do Clerk indisponível.");
            continue;
          }
          const response = await api.clerkLogin(clerkToken);
          if (cancelled) return;
          adoptSession(response);
          router.replace("/dashboard");
          return;
        } catch (err) {
          lastError = err;
        }
      }

      if (cancelled) return;
      exchanging.current = false;
      setError(
        lastError instanceof Error ? lastError.message : "Falha ao autenticar com o servidor.",
      );
    })();

    return () => {
      cancelled = true;
      // Libera o guard para que um novo disparo do effect (ex.: getToken mudou
      // de identidade) possa retomar a troca em vez de ficar travado.
      exchanging.current = false;
    };
  }, [isLoaded, isSignedIn, getToken, adoptSession, router, attempt]);

  const retry = () => {
    setError(null);
    exchanging.current = false;
    setAttempt((n) => n + 1);
  };

  if (isSignedIn) {
    return (
      <div className="login-syncing">
        {error ? (
          <>
            <p className="form-error">{error}</p>
            <button type="button" className="primary-button login-submit" onClick={retry}>
              Tentar novamente
            </button>
          </>
        ) : (
          <p>Preparando seu workspace...</p>
        )}
      </div>
    );
  }

  return (
    <div className="login-clerk">
      {error ? <p className="form-error">{error}</p> : null}
      {mode === "login" ? (
        <SignIn routing="hash" forceRedirectUrl="/login" signUpUrl="/login" />
      ) : (
        <SignUp routing="hash" forceRedirectUrl="/login" signInUrl="/login" />
      )}
    </div>
  );
}

/* ---------- Fallback: login por email/senha do backend (sem chaves do Clerk) ---------- */
function CredentialsAuthPanel({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ companyName, name, email, password });
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticacao.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-card login-form" onSubmit={handleSubmit}>
      {mode === "register" ? (
        <>
          <label className="field">
            <span>Empresa</span>
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
          </label>
          <label className="field">
            <span>Seu nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        </>
      ) : null}

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="primary-button login-submit" disabled={loading}>
        {loading ? "Aguarde..." : mode === "login" ? "Entrar no CRM" : "Criar workspace"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="login-scene">
      <div className="login-shell">
        <section className="login-promo">
          <div className="login-promo-copy">
            <p className="login-kicker">Atlas CRM</p>
            <h1>Transforme sua operação comercial em crescimento previsível.</h1>
          </div>
          <div className="login-glow" />
        </section>

        <section className="login-modal">
          <div className="login-logo">
            <span>ATLAS</span>
          </div>
          <div className="login-header">
            <h2>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h2>
            <p>
              {mode === "login"
                ? "Entre com seu usuário para acessar o CRM."
                : "Cadastre-se e comece com um workspace limpo."}
            </p>
          </div>

          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Entrar
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Criar conta
            </button>
          </div>

          {clerkEnabled ? <ClerkAuthPanel mode={mode} /> : <CredentialsAuthPanel mode={mode} />}

          <p className="login-footnote">
            {mode === "login"
              ? "Ainda não tem conta? Use a aba Criar conta."
              : "Depois do cadastro você entra direto no CRM."}
          </p>
        </section>
      </div>
    </div>
  );
}
