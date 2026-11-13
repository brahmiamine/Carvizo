import { Bell, Plus } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img
        className="brand-mark"
        src="/brand-icon.svg"
        alt=""
        width={compact ? 36 : 42}
        height={compact ? 36 : 42}
      />
      <span className="brand-name">
        Car<span className="brand-highlight">vizo</span>
      </span>
    </div>
  );
}
export function Empty({
  icon: Icon,
  title,
  subtitle,
  onAction,
  action,
}: {
  icon: typeof Bell;
  title: string;
  subtitle: string;
  onAction?: () => void;
  action?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={28} />
      </span>
      <strong>{title}</strong>
      <p>{subtitle}</p>
      {onAction && (
        <button className="btn btn-teal" onClick={onAction}>
          {action || "Ajouter"} <Plus size={16} />
        </button>
      )}
    </div>
  );
}
