export default function SessionStatus({ text }: { text: string }) {
  return (
    <div
      className="min-h-dvh w-full flex items-center justify-center px-4"
      style={{ background: "var(--bg-app)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--accent)",
          }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}
