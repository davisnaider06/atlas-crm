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
    <div className="login-screen">
      <section className="login-card">
        <p className="eyebrow">Atlas CRM</p>
        <h1>Entrar no tenant demo</h1>
        <p>
          A fase 2 ja esta ligada na API real. Use as credenciais seed para entrar e testar os
          endpoints protegidos.
        </p>

        <form className="form-card" onSubmit={handleSubmit}>
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

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="login-hint">
          <span>`admin@atlascrm.local`</span>
          <span>`Atlas@123`</span>
        </div>
      </section>
    </div>
  );
}
