"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
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
            <span>A</span>
          </div>
          <div className="login-header">
            <h2>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h2>
            <p>
              {mode === "login"
                ? "Entre com seu usuário para acessar o CRM."
                : "Cadastre sua empresa e comece com um workspace limpo."}
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
