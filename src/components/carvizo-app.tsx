"use client";
import { X } from "lucide-react";
import { useCarvizoController } from "./carvizo/use-controller";
import { CarvizoContext } from "./carvizo/context";
import { Brand } from "./carvizo/shared";
import { Sidebar, Topbar, MobileNavigation } from "./carvizo/navigation";
import { AuthScreen } from "./carvizo/auth-screen";
import { DashboardScreen } from "./carvizo/dashboard-screen";
import { GarageScreen } from "./carvizo/garage-screen";
import { OilScreen } from "./carvizo/oil-screen";
import { HistoryScreen } from "./carvizo/history-screen";
import { RemindersScreen } from "./carvizo/reminders-screen";
import { ProfileScreen } from "./carvizo/profile-screen";
import { Dialogs } from "./carvizo/dialogs";
export default function CarvizoApp() {
  const controller = useCarvizoController();
  const {
    boot,
    user,
    tab,
    recoveryCode,
    setRecoveryCode,
    errorMessage,
    setErrorMessage,
    success,
    setSuccess,
  } = controller;
  if (boot)
    return (
      <div className="loading-screen">
        <Brand />
        <div className="loader" />
      </div>
    );
  return (
    <CarvizoContext.Provider value={controller}>
      {!user ? (
        <AuthScreen />
      ) : (
        <div className="app-layout">
          <Sidebar />
          <div className="app-main">
            <Topbar />
            <div className="content">
              {recoveryCode && (
                <div role="status" className="feedback success content-alert">
                  <div>
                    Conserve ce code de récupération dans un endroit sûr :{" "}
                    <strong>{recoveryCode}</strong>
                    <p>
                      Il permet de récupérer ton compte si tu oublies ton mot de
                      passe.
                    </p>
                    <button
                      className="btn btn-outline"
                      onClick={() => setRecoveryCode("")}
                    >
                      J’ai conservé mon code
                    </button>
                  </div>
                </div>
              )}
              {errorMessage && (
                <div role="alert" className="feedback error content-alert">
                  {errorMessage}
                  <button
                    aria-label="Fermer"
                    onClick={() => setErrorMessage("")}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {success && (
                <div role="status" className="feedback success content-alert">
                  {success}
                  <button aria-label="Fermer" onClick={() => setSuccess("")}>
                    <X size={15} />
                  </button>
                </div>
              )}

              {tab === "accueil" && <DashboardScreen />}
              {tab === "garage" && <GarageScreen />}
              {tab === "vidange" && <OilScreen />}
              {tab === "suivi" && <HistoryScreen />}
              {tab === "rappels" && <RemindersScreen />}
              {tab === "profil" && <ProfileScreen />}
            </div>
          </div>
          <MobileNavigation />
          <Dialogs />
        </div>
      )}
    </CarvizoContext.Provider>
  );
}
