"use client";
import { Bell, Plus, LogOut, ChevronRight, Menu } from "lucide-react";
import { useCarvizo } from "./context";
import { Brand } from "./shared";
import { items } from "./helpers";
export function Sidebar() {
  const {
    user,
    notices,
    tab,
    setTab,
    menu,
    setMenu,
    electric,
    clearMessages,
    logout,
  } = useCarvizo();
  if (!user) return null;
  return (
    <aside className={"sidebar " + (menu ? "show" : "")}>
      <div className="sidebar-logo">
        <Brand />
      </div>
      <div className="sidebar-nav">
        <span className="nav-heading">ESPACE PERSONNEL</span>
        {items
          .filter((item) => !electric || item.id !== "vidange")
          .map((item) => (
            <button
              key={item.id}
              className={
                (item.id === "rappels" ? "desktop-reminders " : "") +
                "nav-link " +
                (tab === item.id ? "active" : "")
              }
              onClick={() => {
                setTab(item.id);
                setMenu(false);
                clearMessages();
              }}
            >
              <item.icon size={19} />
              {item.label}
              {item.id === "rappels" &&
                notices.filter((n) => !n.readAt).length > 0 && (
                  <span className="count">
                    {notices.filter((n) => !n.readAt).length}
                  </span>
                )}
            </button>
          ))}
      </div>
      <div className="sidebar-bottom">
        <div className="mini-profile">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <small>Compte personnel</small>
          </div>
        </div>
        <button className="logout" onClick={logout}>
          <LogOut size={17} /> Se déconnecter
        </button>
      </div>
    </aside>
  );
}
export function Topbar() {
  const { user, notices, tab, setTab, menu, setMenu } = useCarvizo();
  if (!user) return null;
  return (
    <header className="topbar">
      <button
        aria-label="Ouvrir le menu"
        className="menu-button"
        onClick={() => setMenu(!menu)}
      >
        <Menu />
      </button>
      <div className="topbar-mobile-brand">
        <Brand compact />
      </div>
      <div className="topbar-crumb">
        Mon espace <ChevronRight size={15} />{" "}
        <b>{items.find((i) => i.id === tab)?.label}</b>
      </div>
      <div className="topbar-right">
        <button
          aria-label="Voir les rappels"
          className="icon-button"
          onClick={() => setTab("rappels")}
        >
          <Bell size={20} />
          {notices.some((n) => !n.readAt) && (
            <span className="notification-dot" />
          )}
        </button>
        <button className="avatar top-avatar" onClick={() => setTab("profil")}>
          {user.name.slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
export function MobileNavigation() {
  const { user, tab, setTab, electric, clearMessages, openEntry } =
    useCarvizo();
  if (!user) return null;
  return (
    <nav
      aria-label="Navigation principale"
      className="bottom-nav"
      style={{ gridTemplateColumns: `repeat(${electric ? 4 : 5}, 1fr)` }}
    >
      {items
        .filter(
          (item) =>
            item.id !== "rappels" && (!electric || item.id !== "vidange"),
        )
        .map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => {
              setTab(item.id);
              clearMessages();
            }}
          >
            <item.icon size={21} />
            <span>
              {item.id === "suivi"
                ? "Suivi"
                : item.id === "garage"
                  ? "Garage"
                  : item.id === "profil"
                    ? "Profil"
                    : item.label}
            </span>
          </button>
        ))}
      <button
        className="mobile-add"
        aria-label="Ajouter une opération"
        onClick={() => openEntry("MAINTENANCE")}
      >
        <Plus size={24} />
      </button>
    </nav>
  );
}
