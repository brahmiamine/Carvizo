"use client";
import {
  CarFront,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { useCarvizo } from "./context";
import { Brand } from "./shared";
import { PasswordRecovery } from "../account-security";
export function AuthScreen() {
  const {
    recovery,
    setRecovery,
    authMode,
    setAuthMode,
    busy,
    errorMessage,
    clearMessages,
    submitAuth,
  } = useCarvizo();
  return (
    <main className="auth-screen">
      <div className="auth-showcase">
        <Brand />
        <div className="auth-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <CarFront size={160} strokeWidth={0.8} />
        </div>
        <div className="auth-copy">
          <span className="eyebrow">TON GARAGE, RÉINVENTÉ</span>
          <h1>
            Ta voiture mérite
            <br />
            un meilleur <em>suivi.</em>
          </h1>
          <p>
            Entretiens, carburant, réparations et rappels. Tout ton historique
            auto dans une application gratuite, sans publicité.
          </p>
          <div className="auth-points">
            <span>
              <CheckCircle2 size={17} /> Ne rate aucun entretien
            </span>
            <span>
              <CheckCircle2 size={17} /> Connais tes dépenses
            </span>
            <span>
              <CheckCircle2 size={17} /> Garde tes souvenirs d'entretien
            </span>
          </div>
        </div>
        <small>CARVIZO © 2026 · MADE FOR THE ROAD</small>
      </div>
      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow dark">BIENVENUE CHEZ CARVIZO</span>
          <h2>
            {authMode === "signup"
              ? "Prends le volant."
              : "Content de te revoir."}
          </h2>
          <p>
            {authMode === "signup"
              ? "Crée ton garage numérique en quelques instants."
              : "Retrouve tes véhicules et tes suivis en un clin d'œil."}
          </p>
          {recovery ? (
            <PasswordRecovery
              onDone={() => window.location.reload()}
              onCancel={() => setRecovery(false)}
            />
          ) : (
            <>
              <form onSubmit={submitAuth} className="form">
                {authMode === "signup" && (
                  <label>
                    Ton nom
                    <input
                      required
                      name="name"
                      minLength={2}
                      maxLength={100}
                      placeholder="Ex. Alex Martin"
                      autoComplete="name"
                    />
                  </label>
                )}
                <label>
                  Adresse e-mail
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="toi@exemple.com"
                    autoComplete="email"
                  />
                </label>
                <label>
                  Mot de passe
                  <input
                    required
                    name="password"
                    type="password"
                    minLength={10}
                    placeholder="10 caractères minimum"
                    autoComplete={
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                  />
                </label>
                {errorMessage && (
                  <p className="feedback error" role="alert">
                    {errorMessage}
                  </p>
                )}
                <button
                  className="btn btn-primary btn-lg"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Chargement…"
                    : authMode === "signup"
                      ? "Créer mon compte"
                      : "Me connecter"}{" "}
                  <ArrowUpRight size={19} />
                </button>
              </form>
              <p className="auth-switch">
                {authMode === "signup"
                  ? "Déjà inscrit ?"
                  : "Pas encore de compte ?"}{" "}
                <button
                  onClick={() => {
                    setAuthMode(authMode === "signup" ? "login" : "signup");
                    clearMessages();
                  }}
                >
                  {authMode === "signup" ? "Se connecter" : "Créer un compte"}
                </button>
              </p>
              <button className="plain-link" onClick={() => setRecovery(true)}>
                Mot de passe oublié ?
              </button>
            </>
          )}
          <p className="auth-security">
            <ShieldCheck size={15} /> Tes données restent privées et sécurisées.
          </p>
        </div>
      </section>
    </main>
  );
}
