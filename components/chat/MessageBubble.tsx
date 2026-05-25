import { Message } from "@/types/message";
import MessageStatusIcon from "./MessageStatusIcon";

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  const failed = message.decryptError;

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className="max-w-[65%] rounded-lg px-3 py-2 relative"
        style={{
          background: failed
            ? "#2d1515"
            : isSent
              ? "var(--bg-bubble-sent)"
              : "var(--bg-bubble-received)",
          borderRadius: isSent ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        }}
      >
        {failed ? (
          <p className="text-xs italic" style={{ color: "#f87171" }}>
            Could not decrypt message
          </p>
        ) : (
          <p
            className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap"
            style={{ color: "var(--text-primary)" }}
          >
            {message.text}
          </p>
        )}
        <div
          className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}
        >
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {formatTime(message.created_at)}
          </span>
          {isSent && !failed && (
            <MessageStatusIcon
              delivered={message.delivered}
              status={message.sendStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}
