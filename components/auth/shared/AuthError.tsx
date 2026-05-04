export default function AuthError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      className="rounded-lg p-3 text-sm"
      role="alert"
      style={{
        background: "#2d1515",
        color: "#f87171",
        border: "1px solid #7f1d1d",
      }}
    >
      {message}
    </div>
  );
}
