import Avatar from "@/components/shared/Avatar";

interface SidebarHeaderProps {
  displayName: string;
  onLogout: () => void;
}

export default function SidebarHeader({
  displayName,
  onLogout,
}: SidebarHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={displayName} size={36} />
        <span
          className="font-semibold text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          Chats
        </span>
      </div>
      <button
        onClick={onLogout}
        className="p-2 rounded-full hover:opacity-70 transition-opacity cursor-pointer"
        aria-label="Logout"
        title="Logout"
        style={{ color: "var(--text-secondary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M6.75 15.75H3.75a1.5 1.5 0 01-1.5-1.5V3.75a1.5 1.5 0 011.5-1.5h3M12 12.75L15.75 9 12 5.25M15.75 9H6.75"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
