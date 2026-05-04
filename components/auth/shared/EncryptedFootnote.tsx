export default function EncryptedFootnote({
  text = "Secured with end-to-end encryption",
}: {
  text?: string;
}) {
  return (
    <p
      className="text-center text-xs mt-8 flex items-center justify-center gap-1"
      style={{ color: "var(--text-muted)" }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect
          x="2"
          y="5"
          width="8"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4 5V3.5a2 2 0 014 0V5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      {text}
    </p>
  );
}
