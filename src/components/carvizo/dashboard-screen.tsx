"use client";
import {
  CarFront,
  Fuel,
  Plus,
  Wrench,
  Wallet,
  Activity,
  CalendarDays,
  Gauge,
  ShieldCheck,
  AlertCircle,
  Wind,
  ArrowUpRight,
  ClipboardList,
  Clock,
} from "lucide-react";
import { useCarvizo } from "./context";
import { Empty } from "./shared";
import { fmt, date } from "./helpers";
import { EventRow } from "./entry-row";

import { CurrencyTotalsView } from "./preferences";
export function DashboardScreen() {
  const {
    user,
    entryMeta,
    entries,
    setTab,
    selected,
    electric,
    spent,
    monthly,
    consumption,
    due,
    upcoming,
    openEntry,
    editEntry,
    openVehicle,
    removeEntry,
    updateIssue,
    currency,
  } = useCarvizo();
  if (!user) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow dark">TON ESPACE AUTO</span>
          <h1>
            Bonjour, {user.name.split(" ")[0]} <span className="wave">👋</span>
          </h1>
          <p>Voici ce qui se passe dans ton garage aujourd'hui.</p>
        </div>
        <button
          className="btn btn-outline desktop-only"
          onClick={() => openVehicle()}
        >
          <Plus size={18} /> Ajouter un véhicule
        </button>
      </div>
      {!selected ? (
        <Empty
          icon={CarFront}
          title="Ton garage t'attend"
          subtitle="Ajoute ta première voiture pour suivre son entretien, ses dépenses et son kilométrage."
          onAction={() => openVehicle()}
          action="Ajouter ma voiture"
        />
      ) : (
        <>
          <div className="hero-card">
            <div className="hero-grid">
              <div>
                <span className="hero-label">
                  <span className="live-dot" /> MON VÉHICULE
                </span>
                <h2>{selected.name || selected.make + " " + selected.model}</h2>
                <p>
                  {selected.make} {selected.model}{" "}
                  {selected.year && "· " + selected.year}{" "}
                  {selected.registration && "· " + selected.registration}
                </p>
                <div className="hero-odometer">
                  <Gauge size={19} />
                  <span>{fmt(selected.currentKm)} km</span>
                  <button onClick={() => openEntry("ODOMETER")}>
                    Actualiser <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
              <div className="hero-car-illustration">
                {selected.photos?.[0] ? (
                  <img
                    className="vehicle-photo"
                    src={"/api/photos/" + selected.photos[0].id}
                    alt={"Photo de " + selected.make + " " + selected.model}
                  />
                ) : (
                  <>
                    <div className="car-orbit" />
                    <CarFront size={130} strokeWidth={1.15} />
                  </>
                )}
              </div>
            </div>
            <div className="hero-footer">
              <span>
                <ShieldCheck size={16} />{" "}
                {upcoming.some(due)
                  ? "Entretien à prévoir"
                  : "Aucune échéance dépassée"}
              </span>
              <button onClick={() => setTab("garage")}>
                Voir mon véhicule <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon teal">
                <Wallet size={21} />
              </span>
              <span className="stat-label">Dépenses totales</span>
              <strong>
                <CurrencyTotalsView
                  totals={entryMeta.totals.byCurrency}
                  currency={currency}
                  field="spentCents"
                  fallback={spent}
                />
              </strong>
              <small>Historique du véhicule</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon blue">
                <Activity size={21} />
              </span>
              <span className="stat-label">Consommation</span>
              <strong>
                {consumption === null
                  ? "—"
                  : consumption + (electric ? " kWh" : " L")}
              </strong>
              <small>
                {consumption === null
                  ? electric
                    ? "Ajoute 2 charges complètes"
                    : "Ajoute 2 pleins complets"
                  : "Aux 100 kilomètres"}
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-icon orange">
                <CalendarDays size={21} />
              </span>
              <span className="stat-label">Ce mois-ci</span>
              <strong>
                <CurrencyTotalsView
                  totals={entryMeta.totals.byCurrency}
                  currency={currency}
                  field="monthlyCents"
                  fallback={monthly}
                />
              </strong>
              <small>Carburant, entretien et frais</small>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <h2>Actions rapides</h2>
              <p>Enregistre une information en quelques secondes.</p>
            </div>
          </div>
          <div className="quick-grid">
            <button onClick={() => openEntry("FUEL")}>
              <span className="quick-icon green">
                <Fuel size={23} />
              </span>
              <b>{electric ? "Une recharge" : "Faire un plein"}</b>
              <small>{electric ? "Électricité" : "Carburant"}</small>
              <ArrowUpRight size={17} />
            </button>
            {!electric && (
              <button onClick={() => openEntry("OIL_CHANGE")}>
                <span className="quick-icon violet">
                  <Wrench size={23} />
                </span>
                <b>Une vidange</b>
                <small>Huile moteur</small>
                <ArrowUpRight size={17} />
              </button>
            )}
            <button onClick={() => openEntry("ISSUE")}>
              <span className="quick-icon coral">
                <AlertCircle size={23} />
              </span>
              <b>Un problème</b>
              <small>Rayure, panne…</small>
              <ArrowUpRight size={17} />
            </button>
            <button onClick={() => openEntry("TIRE")}>
              <span className="quick-icon pale">
                <Wind size={23} />
              </span>
              <b>Mes pneus</b>
              <small>Pression, contrôle</small>
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="dashboard-cols">
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>Prochains entretiens</h2>
                  <p>Anticipe les prochaines échéances.</p>
                </div>
                <span className="panel-caption">
                  <Clock size={15} /> À surveiller
                </span>
              </div>
              {upcoming.length ? (
                upcoming.map((e) => (
                  <div className="timeline-row" key={e.id}>
                    <span className="entry-icon">
                      <Wrench size={18} />
                    </span>
                    <div className="timeline-main">
                      <b>{e.title}</b>
                      <small>
                        {e.nextDueKm !== null
                          ? "À " + fmt(e.nextDueKm) + " km"
                          : date(e.nextDueAt!)}
                      </small>
                    </div>
                    <span className={"pill " + (due(e) ? "danger" : "amber")}>
                      {due(e) ? "Échu" : "Prévu"}
                    </span>
                  </div>
                ))
              ) : (
                <Empty
                  icon={CalendarDays}
                  title="Aucun entretien prévu"
                  subtitle={
                    electric
                      ? "Planifie un entretien avec sa prochaine échéance."
                      : "Ajoute une vidange avec sa prochaine échéance."
                  }
                  onAction={() => openEntry("MAINTENANCE")}
                />
              )}
            </section>
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>Activité récente</h2>
                  <p>Les dernières opérations sur ta voiture.</p>
                </div>
                <button className="plain-link" onClick={() => setTab("suivi")}>
                  Tout voir <ArrowUpRight size={15} />
                </button>
              </div>
              {entries.length ? (
                entries
                  .slice(0, 4)
                  .map((e) => (
                    <EventRow
                      key={e.id}
                      entry={e}
                      electric={electric}
                      onEdit={() => editEntry(e)}
                      onDelete={() => removeEntry(e.id)}
                      onStatus={(s) => updateIssue(e.id, s)}
                    />
                  ))
              ) : (
                <Empty
                  icon={ClipboardList}
                  title="Pas encore d'activité"
                  subtitle="Enregistre ton premier plein ou entretien."
                  onAction={() => openEntry("FUEL")}
                />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
