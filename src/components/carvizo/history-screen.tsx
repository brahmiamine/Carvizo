"use client";
import { Plus, ClipboardList } from "lucide-react";
import { useCarvizo } from "./context";
import { Empty } from "./shared";
import { kindLabels } from "./helpers";
import { EventRow } from "./entry-row";

export function HistoryScreen() {
  const {
    user,
    setErrorMessage,
    entryMeta,
    vehicles,
    vehicleId,
    entries,
    filter,
    setFilter,
    switchVehicle,
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
          <span className="eyebrow dark">CARNET DE BORD</span>
          <h1>Historique & suivi</h1>
          <p>Toutes les opérations, dépenses et pannes de ta voiture.</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => openEntry("MAINTENANCE")}
        >
          <Plus size={18} /> Nouvelle opération
        </button>
      </div>
      {selected && (
        <div className="vehicle-selector">
          <label>
            Véhicule{" "}
            <select
              value={selected.id}
              onChange={(e) => switchVehicle(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.make + " " + v.model}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="filters">
        {(
          [
            "TOUS",
            "MAINTENANCE",
            "OIL_CHANGE",
            "FUEL",
            "ODOMETER",
            "TIRE",
            "REPAIR",
            "ISSUE",
            "EXPENSE",
          ] as const
        )
          .filter((k) => !electric || k !== "OIL_CHANGE")
          .map((k) => (
            <button
              key={k}
              className={filter === k ? "active" : ""}
              onClick={() => setFilter(k)}
            >
              {k === "TOUS"
                ? "Tout"
                : k === "FUEL" && electric
                  ? "Recharge"
                  : kindLabels[k]}
            </button>
          ))}
      </div>
      <section className="panel entries-panel">
        {entries.filter((e) => filter === "TOUS" || e.kind === filter)
          .length ? (
          entries
            .filter((e) => filter === "TOUS" || e.kind === filter)
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
            title="Rien à afficher"
            subtitle="Cet historique est encore vide."
            onAction={() => selected && openEntry("MAINTENANCE")}
          />
        )}
      </section>
      {entryMeta.nextCursor && (
        <button
          className="btn btn-outline"
          onClick={() =>
            loadEntries(vehicleId, entryMeta.nextCursor!).catch((e) =>
              setErrorMessage(e.message),
            )
          }
        >
          Charger les opérations précédentes
        </button>
      )}
    </>
  );
}
