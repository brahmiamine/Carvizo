"use client";
import {
  CarFront,
  Plus,
  Trash2,
  Camera,
  ChevronRight,
  Gauge,
  CheckCircle2,
} from "lucide-react";
import { useCarvizo } from "./context";
import { Empty } from "./shared";
import { fmt } from "./helpers";

export function GarageScreen() {
  const {
    user,
    vehicles,
    setModal,
    setEditingVehicle,
    uploading,
    switchVehicle,
    selected,
    openEntry,
    openVehicle,
    deleteVehicle,
    uploadVehiclePhoto,
  } = useCarvizo();
  if (!user) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow dark">MES VÉHICULES</span>
          <h1>Mon garage</h1>
          <p>Retrouve tes voitures et leurs informations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openVehicle()}>
          <Plus size={18} /> Ajouter un véhicule
        </button>
      </div>
      <div className="garage-list">
        {vehicles.map((v) => (
          <button
            key={v.id}
            className={
              "garage-tile " + (selected?.id === v.id ? "selected" : "")
            }
            onClick={() => switchVehicle(v.id)}
          >
            <div className="garage-car">
              {v.photos?.[0] ? (
                <img src={"/api/photos/" + v.photos[0].id} alt="" />
              ) : (
                <CarFront size={37} />
              )}
            </div>
            <div>
              <b>{v.name || v.make + " " + v.model}</b>
              <small>
                {v.year || "Année inconnue"} · {fmt(v.currentKm)} km
              </small>
            </div>
            {selected?.id === v.id ? (
              <CheckCircle2 size={20} className="teal-text" />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
        ))}
      </div>
      {!selected ? (
        <Empty
          icon={CarFront}
          title="Aucun véhicule"
          subtitle="Commence par ajouter ta voiture."
          onAction={() => openVehicle()}
        />
      ) : (
        <div className="panel vehicle-detail">
          <div className="panel-title">
            <h2>Fiche véhicule</h2>
            <span className="pill okay">Véhicule actif</span>
          </div>
          <div className="detail-grid">
            <div>
              <small>Marque & modèle</small>
              <strong>
                {selected.make} {selected.model}
              </strong>
            </div>
            <div>
              <small>Immatriculation</small>
              <strong>{selected.registration || "Non renseignée"}</strong>
            </div>
            <div>
              <small>Kilométrage</small>
              <strong>{fmt(selected.currentKm)} km</strong>
            </div>
            <div>
              <small>Carburant</small>
              <strong>{selected.fuelType}</strong>
            </div>
            <div>
              <small>Pression avant recommandée</small>
              <strong>
                {selected.frontPressureBar
                  ? selected.frontPressureBar + " bar"
                  : "Non définie"}
              </strong>
            </div>
            <div>
              <small>Pression arrière recommandée</small>
              <strong>
                {selected.rearPressureBar
                  ? selected.rearPressureBar + " bar"
                  : "Non définie"}
              </strong>
            </div>
          </div>
          <div className="detail-actions">
            <label className="btn btn-outline photo-upload">
              <Camera size={18} />
              {uploading ? "Envoi…" : "Ajouter une photo"}
              <input
                disabled={uploading}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadVehiclePhoto}
              />
            </label>
            <button
              className="btn btn-outline"
              onClick={() => openEntry("ODOMETER")}
            >
              <Gauge size={18} /> Nouveau relevé
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditingVehicle(selected);
                setModal("vehicle");
              }}
            >
              Modifier le véhicule
            </button>
            <button className="btn btn-danger" onClick={deleteVehicle}>
              <Trash2 size={17} /> Supprimer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
