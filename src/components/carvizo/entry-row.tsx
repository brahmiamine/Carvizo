import { Trash2 } from "lucide-react";
import type { Entry } from "./types";
import { fmt, date, icons, kindLabels, isProtectedOdometer } from "./helpers";
import { formatMoney } from "@/lib/currency";
export function EventRow({
  entry: e,
  onDelete,
  onStatus,
  onEdit,
  electric = false,
}: {
  entry: Entry;
  electric?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: "OPEN" | "IN_PROGRESS" | "RESOLVED") => void;
}) {
  const Icon = icons[e.kind],
    protectedEntry = isProtectedOdometer(e);
  return (
    <div className="timeline-row event-row">
      <span className={"entry-icon kind-" + e.kind.toLowerCase()}>
        <Icon size={19} />
      </span>
      <div className="timeline-main">
        <b>{e.title}</b>
        <small>
          {e.kind === "FUEL" && electric ? "Recharge" : kindLabels[e.kind]} ·{" "}
          {date(e.occurredAt)}{" "}
          {e.mileage !== null ? "· " + fmt(e.mileage) + " km" : ""}
        </small>
        {e.notes && (
          <p className="event-notes">
            {e.notes.replace(
              /^\[carvizo:(?:baseline|odometer-correction)\]\s*/,
              "",
            )}
          </p>
        )}
        {e.photos.length > 0 && (
          <div className="event-photos">
            {e.photos.map((p) => (
              <a
                href={"/api/photos/" + p.id}
                target="_blank"
                rel="noreferrer"
                key={p.id}
              >
                {p.mime === "application/pdf" ? (
                  <>Justificatif PDF : {e.title}</>
                ) : (
                  <img src={"/api/photos/" + p.id} alt={"Photo : " + e.title} />
                )}
              </a>
            ))}
          </div>
        )}
        {["ISSUE", "MAINTENANCE", "OIL_CHANGE", "REPAIR"].includes(e.kind) && (
          <select
            className="status-select"
            aria-label={"État de " + e.title}
            value={e.status}
            onChange={(event) =>
              onStatus(
                event.target.value as "OPEN" | "IN_PROGRESS" | "RESOLVED",
              )
            }
          >
            <option value="OPEN">
              {e.kind === "ISSUE" ? "À traiter" : "Planifié"}
            </option>
            <option value="IN_PROGRESS">
              {e.kind === "ISSUE" ? "En cours" : "Reporté"}
            </option>
            <option value="RESOLVED">
              {e.kind === "ISSUE" ? "Résolu" : "Effectué"}
            </option>
          </select>
        )}
      </div>
      <div className="event-right">
        {e.amountCents !== null && (
          <strong>{formatMoney(e.amountCents, e.currency ?? "EUR")}</strong>
        )}
        {e.kind === "FUEL" && e.volumeMl !== null && (
          <small>
            {(e.volumeMl / 1000).toLocaleString("fr-FR")}{" "}
            {electric ? "kWh" : "L"}
          </small>
        )}
        <button
          className="delete-entry"
          aria-label={"Modifier " + e.title}
          onClick={onEdit}
        >
          Modifier
        </button>
        {!protectedEntry && (
          <button
            className="delete-entry"
            title="Supprimer"
            aria-label={"Supprimer " + e.title}
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
