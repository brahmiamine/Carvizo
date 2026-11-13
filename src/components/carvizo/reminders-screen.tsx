"use client";
import { Bell, Check } from "lucide-react";
import { useCarvizo } from "./context";
import { Empty } from "./shared";
import { date } from "./helpers";

export function RemindersScreen() {
  const { user, notices, pushEnabled, subscribe, unsubscribe, markRead } =
    useCarvizo();
  if (!user) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow dark">NE RIEN OUBLIER</span>
          <h1>Mes rappels</h1>
          <p>Échéances, compteur et entretien de tes véhicules.</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={pushEnabled ? unsubscribe : subscribe}
        >
          <Bell size={17} />
          {pushEnabled ? "Désactiver les push" : "Activer les push"}
        </button>
      </div>
      <div className="panel reminder-intro">
        <div className="stat-icon teal">
          <Bell size={25} />
        </div>
        <div>
          <h2>Tes alertes, au bon moment</h2>
          <p>
            Tu seras prévenu pour le compteur mensuel et les entretiens
            programmés. Les notifications push demandent ton autorisation.
          </p>
        </div>
      </div>
      <div className="panel">
        {notices.length ? (
          notices.map((n) => (
            <div className={"notice " + (!n.readAt ? "unread" : "")} key={n.id}>
              <span className="entry-icon">
                <Bell size={19} />
              </span>
              <div>
                <b>{n.title}</b>
                <p>{n.body}</p>
                <small>{date(n.createdAt)}</small>
              </div>
              {!n.readAt && (
                <button
                  className="btn btn-outline btn-small"
                  onClick={() => markRead(n.id)}
                >
                  <Check size={15} /> Lu
                </button>
              )}
            </div>
          ))
        ) : (
          <Empty
            icon={Bell}
            title="Tout est calme !"
            subtitle="Tes prochains rappels apparaîtront ici dès qu'une échéance approche."
          />
        )}
      </div>
    </>
  );
}
