"use client";
import { Check } from "lucide-react";
import { useCarvizo } from "./context";
import { kindLabels, oilInterval, isProtectedOdometer } from "./helpers";
import type { Kind } from "./types";
import { AmountInput } from "./preferences";
export function EntryForm() {
  const {
    busy,
    errorMessage,
    entryMeta,
    entries,
    setModal,
    kind,
    setKind,
    editingEntry,
    setPhotoFiles,
    selected,
    electric,
    submitEntry,
    currency,
  } = useCarvizo();
  return isProtectedOdometer(editingEntry) ? (
    <form className="form modal-form" onSubmit={submitEntry}>
      <p className="hint">
        Corrige le kilométrage de ce relevé. Le compteur du véhicule sera
        recalculé.
      </p>
      <label>
        Date
        <input
          name="occurredAt"
          type="date"
          required
          defaultValue={editingEntry?.occurredAt.slice(0, 10)}
        />
      </label>
      <label>
        Kilométrage
        <input
          name="mileage"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={editingEntry?.mileage ?? 0}
        />
      </label>
      {errorMessage && (
        <p className="feedback error" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setModal(null)}
        >
          Annuler
        </button>
        <button disabled={busy} className="btn btn-primary">
          Enregistrer
        </button>
      </div>
    </form>
  ) : (
    <form className="form modal-form" onSubmit={submitEntry}>
      <label>
        Catégorie
        <select
          value={kind}
          disabled={Boolean(editingEntry)}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          {(Object.keys(kindLabels) as Kind[])
            .filter((k) => !electric || k !== "OIL_CHANGE")
            .map((k) => (
              <option key={k} value={k}>
                {k === "FUEL" && electric ? "Recharge" : kindLabels[k]}
              </option>
            ))}
        </select>
      </label>
      <label>
        Libellé *
        <input
          name="title"
          key={kind}
          required
          maxLength={180}
          defaultValue={
            editingEntry?.title ??
            {
              MAINTENANCE: "Entretien",
              OIL_CHANGE: "Vidange moteur",
              FUEL: electric ? "Recharge électrique" : "Plein de carburant",
              ODOMETER: "Relevé kilométrique",
              TIRE: "Contrôle des pneus",
              REPAIR: "Réparation",
              ISSUE: "Problème à résoudre",
              EXPENSE: "Dépense automobile",
            }[kind]
          }
        />
      </label>
      <div className="form-cols">
        <label>
          Date *
          <input
            name="occurredAt"
            type="date"
            required
            defaultValue={
              editingEntry?.occurredAt.slice(0, 10) ??
              new Date().toISOString().slice(0, 10)
            }
          />
        </label>
        <label>
          Kilométrage{" "}
          {kind === "ODOMETER" || kind === "FUEL" || kind === "OIL_CHANGE"
            ? "*"
            : ""}
          <input
            type="number"
            min="0"
            step="1"
            name="mileage"
            defaultValue={
              editingEntry?.mileage ??
              (kind === "OIL_CHANGE" ? selected?.currentKm : "")
            }
            required={
              kind === "ODOMETER" || kind === "FUEL" || kind === "OIL_CHANGE"
            }
            placeholder={selected?.currentKm.toString()}
          />
        </label>
      </div>
      {kind === "FUEL" && (
        <>
          <div className="form-cols">
            <label>
              {electric ? "Énergie ajoutée (kWh) *" : "Litres ajoutés *"}
              <input
                type="number"
                step=".001"
                min=".001"
                name="liters"
                defaultValue={
                  editingEntry?.volumeMl != null
                    ? editingEntry.volumeMl / 1000
                    : ""
                }
                required
                placeholder="42.5"
              />
            </label>
          </div>
          <AmountInput entry={editingEntry} defaultCurrency={currency} />
          <label className="check-label">
            <input
              type="checkbox"
              name="fullTank"
              defaultChecked={editingEntry?.fullTank}
            />{" "}
            {electric
              ? "La batterie est complètement chargée"
              : "Le réservoir est rempli complètement"}
          </label>
          <p className="hint">
            {electric
              ? "La consommation se calcule entre deux charges complètes avec kilométrage fiable."
              : "La consommation se calcule entre deux pleins complets avec kilométrage fiable."}
          </p>
        </>
      )}
      {[
        "MAINTENANCE",
        "OIL_CHANGE",
        "REPAIR",
        "TIRE",
        "EXPENSE",
        "ISSUE",
      ].includes(kind) && (
        <AmountInput entry={editingEntry} defaultCurrency={currency} />
      )}
      {kind === "OIL_CHANGE" && (
        <label>
          Intervalle de vidange (km)
          <input
            name="intervalKm"
            type="number"
            min="1"
            step="1"
            defaultValue={oilInterval(
              entryMeta.latestOil ? [entryMeta.latestOil] : entries,
            )}
          />
          <span className="hint">
            Appliqué au kilométrage saisi si aucune prochaine échéance n’est
            indiquée. Réutilisé pour ce véhicule lors des prochaines vidanges.
          </span>
        </label>
      )}
      {(kind === "MAINTENANCE" || kind === "OIL_CHANGE") && (
        <div className="form-cols">
          <label>
            {kind === "OIL_CHANGE"
              ? "Prochaine vidange (km)"
              : "Prochain entretien (km)"}
            <input
              name="nextDueKm"
              defaultValue={editingEntry?.nextDueKm ?? ""}
              type="number"
              min="0"
              step="1"
              placeholder="100000"
            />
          </label>
          <label>
            Ou avant le
            <input
              name="nextDueAt"
              defaultValue={editingEntry?.nextDueAt?.slice(0, 10) ?? ""}
              type="date"
            />
          </label>
        </div>
      )}
      {["ISSUE", "MAINTENANCE", "OIL_CHANGE", "REPAIR"].includes(kind) && (
        <label>
          État
          <select
            name="status"
            defaultValue={
              editingEntry?.status ?? (kind === "ISSUE" ? "OPEN" : "RESOLVED")
            }
          >
            <option value="OPEN">
              {kind === "ISSUE" ? "À traiter" : "Planifié"}
            </option>
            <option value="IN_PROGRESS">
              {kind === "ISSUE" ? "En cours" : "Reporté"}
            </option>
            <option value="RESOLVED">
              {kind === "ISSUE" ? "Résolu" : "Effectué"}
            </option>
          </select>
        </label>
      )}
      {kind === "TIRE" && (
        <div className="form-cols">
          <label>
            Pression avant mesurée (bar)
            <input
              name="measuredFront"
              type="number"
              min="0"
              max="6"
              step=".1"
            />
          </label>
          <label>
            Pression arrière mesurée (bar)
            <input
              name="measuredRear"
              type="number"
              min="0"
              max="6"
              step=".1"
            />
          </label>
        </div>
      )}
      <label>
        Notes
        <textarea
          defaultValue={editingEntry?.notes ?? ""}
          name="notes"
          maxLength={4000}
          rows={3}
          placeholder="Détails, observations, garage, référence…"
        />
      </label>
      <label>
        Photos ou justificatifs PDF (max 4, 5 Mo par fichier)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) =>
            setPhotoFiles([...(e.target.files || [])].slice(0, 4))
          }
        />
      </label>
      {errorMessage && <p className="feedback error">{errorMessage}</p>}
      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setModal(null)}
        >
          Annuler
        </button>
        <button disabled={busy} className="btn btn-primary">
          {busy ? "Enregistrement…" : "Enregistrer"} <Check size={18} />
        </button>
      </div>
    </form>
  );
}
