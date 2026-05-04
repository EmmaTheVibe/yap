interface SidebarSearchProps {
  query: string;
  onChange: (query: string) => void;
}

export default function SidebarSearch({ query, onChange }: SidebarSearchProps) {
  return (
    <div className="px-3 py-2">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: "var(--bg-input)" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ color: "var(--text-muted)" }}
        >
          <circle
            cx="7"
            cy="7"
            r="5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M11 11l3 3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Search or start new chat"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          className="no-focus-ring flex-1 bg-transparent text-base focus:outline-none focus-visible:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {query && (
          <button
            onClick={() => onChange("")}
            style={{ color: "var(--text-muted)" }}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
