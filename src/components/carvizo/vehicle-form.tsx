"use client";
import { ArrowUpRight } from "lucide-react";
import { useCarvizo } from "./context";

export function VehicleForm() {
  const { busy, errorMessage, setModal, editingVehicle, submitVehicle } =
    useCarvizo();
  return (
    <form className="form modal-form" onSubmit={submitVehicle}>
      <div className="form-cols">
        <label>
          Marque *
          <input
            name="make"
            defaultValue={editingVehicle?.make ?? ""}
            required
            placeholder="Skoda"
            maxLength={80}
          />
        </label>
        <label>
          Modèle *
          <input
            name="model"
            defaultValue={editingVehicle?.model ?? ""}
            required
            placeholder="Fabia"
            maxLength={80}
          />
        </label>
      </div>
      <label>
        Surnom (facultatif)
        <input
          name="name"
          defaultValue={editingVehicle?.name ?? ""}
          placeholder="Ma voiture"
          maxLength={100}
        />
      </label>
      <div className="form-cols">
        <label>
          Année
          <input
            name="year"
            defaultValue={editingVehicle?.year ?? ""}
            type="number"
            min="1886"
            max="2100"
            placeholder="2018"
          />
        </label>
        <label>
          Immatriculation
          <input
            name="registration"
            defaultValue={editingVehicle?.registration ?? ""}
            placeholder="AA-123-AA"
            maxLength={32}
          />
        </label>
      </div>
      <div className="form-cols">
        <label>
          Compteur actuel (km)
          <input
            type="number"
            min="0"
            step="1"
            name="currentKm"
            defaultValue={editingVehicle?.currentKm ?? 0}
            required
          />
        </label>
        <label>
          Carburant
          <select
            name="fuelType"
            defaultValue={editingVehicle?.fuelType ?? "ESSENCE"}
          >
            <option>ESSENCE</option>
            <option>DIESEL</option>
            <option>HYBRIDE</option>
            <option>ÉLECTRIQUE</option>
            <option>GPL</option>
            <option>AUTRE</option>
          </select>
        </label>
      </div>
      <div className="form-cols">
        <label>
          Pression avant recommandée (bar)
          <input
            type="number"
            step=".1"
            min=".5"
            max="6"
            name="frontPressureBar"
            defaultValue={editingVehicle?.frontPressureBar ?? ""}
            placeholder="2.2"
          />
        </label>
        <label>
          Pression arrière recommandée (bar)
          <input
            type="number"
            step=".1"
            min=".5"
            max="6"
            name="rearPressureBar"
            defaultValue={editingVehicle?.rearPressureBar ?? ""}
            placeholder="2.1"
          />
        </label>
      </div>
      <p className="hint">
        Vérifie les pressions indiquées par le constructeur de ton véhicule.
      </p>
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
          {busy
            ? "Enregistrement…"
            : editingVehicle
              ? "Enregistrer"
              : "Ajouter au garage"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </div>
    </form>
  );
}
