"use client";
import { CarFront, Plus, Droplets } from "lucide-react";
import { useCarvizo } from "./context";
import { Empty } from "./shared";
import { fmt, date, oilInterval } from "./helpers";
import { EventRow } from "./entry-row";
import type { Entry } from "./types";
import { projectOilDues } from "@/lib/metrics";

export function OilScreen() {
  const {
    user,
    entryMeta,
    vehicleId,
    entries,
    selected,
    electric,
    loadEntries,
    openEntry,
    editEntry,
    removeEntry,
    updateIssue,
  } = useCarvizo();
  if (!user) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow dark">MOTEUR</span>
          <h1>Suivi des vidanges</h1>
          <p>Historique et estimations des prochaines échéances.</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={!selected || electric}
          onClick={() => openEntry("OIL_CHANGE")}
        >
          <Plus size={18} /> Nouvelle vidange
        </button>
      </div>
      {!selected ? (
        <Empty
          icon={CarFront}
          title="Aucun véhicule"
          subtitle="Ajoute un véhicule pour suivre ses vidanges."
        />
      ) : electric ? (
        <Empty
          icon={CarFront}
          title="Véhicule électrique"
          subtitle="Aucune vidange moteur à prévoir."
        />
      ) : (
        <>
          <OilForecast
            currentKm={selected.currentKm}
            last={entryMeta.latestOil}
          />
          <section className="panel">
            <div className="panel-title">
              <h2>Historique des vidanges</h2>
            </div>
            {entries
              .filter((e) => e.kind === "OIL_CHANGE")
              .map((e) => (
                <EventRow
                  key={e.id}
                  entry={e}
                  onEdit={() => editEntry(e)}
                  onDelete={() => removeEntry(e.id)}
                  onStatus={(s) => updateIssue(e.id, s)}
                />
              ))}
            {!entryMeta.latestOil && (
              <p>
                Aucune vidange enregistrée. Les estimations ci-dessus partent du
                compteur actuel.
              </p>
            )}
            {entryMeta.nextCursor && (
              <button
                className="btn btn-outline"
                onClick={() => loadEntries(vehicleId, entryMeta.nextCursor!)}
              >
                Charger plus d’opérations
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}
function OilForecast({
  currentKm,
  last,
}: {
  currentKm: number;
  last: Entry | null;
}) {
  const interval = oilInterval(last ? [last] : []),
    left = last?.nextDueKm != null ? last.nextDueKm - currentKm : null,
    late = Boolean(
      (left !== null && left <= 0) ||
      (last?.nextDueAt &&
        last.nextDueAt.slice(0, 10) <= new Date().toISOString().slice(0, 10)),
    );
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>
              {late
                ? "Vidange échue à effectuer"
                : "Prochaine échéance enregistrée"}
            </h2>
            <p>
              {last
                ? "D’après ta dernière vidange effectuée."
                : "Aucune échéance enregistrée : estimations tous les 10 000 km."}
            </p>
          </div>
        </div>
        {last && (
          <p>
            {last.nextDueKm !== null && (
              <b>
                À {fmt(last.nextDueKm)} km{" "}
                {left !== null &&
                  (left > 0 ? "(dans " + fmt(left) + " km)" : "(échue)")}
              </b>
            )}
            {last.nextDueAt && <> · avant le {date(last.nextDueAt)}</>}
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>3 prochaines vidanges estimées</h2>
            <p>
              Intervalle : {fmt(interval)} km · compteur : {fmt(currentKm)} km.
              Une échéance dépassée reste à effectuer.
            </p>
          </div>
        </div>
        {projectOilDues(
          last?.mileage ?? null,
          last?.nextDueKm ?? null,
          currentKm,
          3,
          interval,
        ).map((km, i) => (
          <div className="timeline-row" key={km}>
            <span className="entry-icon">
              <Droplets size={18} />
            </span>
            <div className="timeline-main">
              <b>
                Vidange n°{i + 1} : {fmt(km)} km
              </b>
              <small>Dans {fmt(km - currentKm)} km</small>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
