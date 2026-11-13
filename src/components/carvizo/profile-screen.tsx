"use client";
import { Bell, LogOut, Download, Trash2, ArrowUpRight } from "lucide-react";
import { useCarvizo } from "./context";

import { AccountSecurity } from "../account-security";
import { Preferences } from "./preferences";
export function ProfileScreen() {
  const { user, pushEnabled, logout, subscribe, unsubscribe, deleteAccount } =
    useCarvizo();
  if (!user) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow dark">PARAMÈTRES</span>
          <h1>Mon compte</h1>
          <p>Gère tes données et tes notifications.</p>
        </div>
      </div>
      <section className="panel account-card">
        <div className="large-avatar">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="pill okay">Compte actif</span>
        </div>
      </section>
      <Preferences />
      <AccountSecurity />
      <div className="settings-grid">
        <div className="panel settings-panel">
          <h2>Confidentialité</h2>
          <p>
            Tes données appartiennent à ton compte et ne sont pas partagées avec
            d'autres automobilistes.
          </p>
          <a
            className="settings-action"
            href="/api/profile?format=csv"
            download="carvizo-export.csv"
          >
            <Download size={19} /> Exporter en CSV
          </a>
          <a
            className="settings-action"
            href="/api/profile?format=print"
            target="_blank"
            rel="noreferrer"
          >
            <Download size={19} /> Imprimer / enregistrer en PDF
          </a>
          <a
            className="settings-action"
            href="/api/profile"
            download="carvizo-export.json"
          >
            <Download size={19} /> Exporter mes données{" "}
            <ArrowUpRight size={16} />
          </a>
          <button className="settings-action dangerous" onClick={deleteAccount}>
            <Trash2 size={19} /> Supprimer définitivement mon compte{" "}
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="panel settings-panel">
          <h2>Notifications</h2>
          <p>Autorise Carvizo à t'alerter quand un entretien approche.</p>
          <button
            className="settings-action"
            onClick={pushEnabled ? unsubscribe : subscribe}
          >
            <Bell size={19} />{" "}
            {pushEnabled
              ? "Désactiver les notifications push"
              : "Activer les notifications push"}{" "}
            <ArrowUpRight size={16} />
          </button>
          <button className="settings-action" onClick={logout}>
            <LogOut size={19} /> Se déconnecter <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
