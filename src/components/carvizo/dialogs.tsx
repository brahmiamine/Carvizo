"use client";
import { X } from "lucide-react";
import { useCarvizo } from "./context";
import { kindLabels } from "./helpers";

import { VehicleForm } from "./vehicle-form";
import { EntryForm } from "./entry-form";
export function Dialogs() {
  const { modal, setModal, kind, editingEntry, editingVehicle, dialogRef } =
    useCarvizo();
  if (!modal) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setModal(null);
      }}
    >
      <div
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={
          modal === "vehicle"
            ? editingVehicle
              ? "Modifier le véhicule"
              : "Ajouter un véhicule"
            : editingEntry
              ? "Modifier l’opération"
              : "Ajouter une opération"
        }
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow dark">
              {modal === "vehicle" ? "MON GARAGE" : "NOUVELLE OPÉRATION"}
            </span>
            <h2>
              {modal === "vehicle"
                ? editingVehicle
                  ? "Modifier le véhicule"
                  : "Ajouter un véhicule"
                : (editingEntry ? "Modifier : " : "Enregistrer : ") +
                  kindLabels[kind]}
            </h2>
          </div>
          <button
            aria-label="Fermer"
            className="icon-button"
            onClick={() => setModal(null)}
          >
            <X size={22} />
          </button>
        </div>
        {modal === "vehicle" ? <VehicleForm /> : <EntryForm />}
      </div>
    </div>
  );
}
