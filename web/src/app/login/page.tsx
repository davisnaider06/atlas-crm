"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@atlascrm.local");
  const [password, setPassword] = useState("Atlas@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
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
            <h1>Transforme sua operacao comercial em crescimento previsivel.</h1>
          </div>
          <div className="login-glow" />
        </section>

        <section className="login-modal">
          <div className="login-logo">
            <span />
          </div>
          <div className="login-header">
            <h2>Acesse sua conta</h2>
            <p>Entre no ambiente demo e valide o CRM completo pelo front.</p>
          </div>

          <form className="form-card login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            <label className="field">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="primary-button login-submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar no CRM"}
            </button>
          </form>

          <p className="login-footnote">
            Use as credenciais demo para acessar o ambiente.
          </p>
          <div className="login-credentials">
            <span>admin@atlascrm.local</span>
            <span>Atlas@123</span>
          </div>
        </section>
      </div>
    </div>
  );
}
