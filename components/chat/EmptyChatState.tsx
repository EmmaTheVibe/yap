export default function EmptyChatState() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--bg-chat)" }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: "var(--bg-sidebar)" }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          style={{ color: "var(--text-muted)" }}
        >
          <path
            d="M20 6C12.268 6 6 12.268 6 20c0 2.982.835 5.769 2.285 8.137L6 34l6.137-2.23A13.915 13.915 0 0020 34c7.732 0 14-6.268 14-14S27.732 6 20 6z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </div>
      <div className="text-center">
        <p
          className="font-semibold text-lg"
          style={{ color: "var(--text-primary)" }}
        >
          Yapp
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Select a conversation or search for a user to start chatting
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 text-xs mt-2"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect
            x="1"
            y="5"
            width="10"
            height="6"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <path
            d="M3.5 5V3.5a2.5 2.5 0 015 0V5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </svg>
        End-to-end encrypted
      </div>
    </div>
  );
}
