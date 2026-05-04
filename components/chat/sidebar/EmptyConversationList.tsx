export default function EmptyConversationList() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        className="mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        <path
          d="M24 6C14.059 6 6 14.059 6 24c0 3.578 1.001 6.921 2.742 9.765L6 42l8.578-2.682A17.91 17.91 0 0024 42c9.941 0 18-8.059 18-18S33.941 6 24 6z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <p
        className="text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        No conversations yet
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        Search for a user to start chatting
      </p>
    </div>
  );
}
