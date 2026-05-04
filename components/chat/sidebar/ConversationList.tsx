import { ConversationSummary } from "@/types/message";
import Avatar from "@/components/shared/Avatar";
import EmptyConversationList from "./EmptyConversationList";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeUserId: string | null;
  onlineUsers: Set<string>;
  onSelectConversation: (userId: string, displayName: string) => void;
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationList({
  conversations,
  activeUserId,
  onlineUsers,
  onSelectConversation,
}: ConversationListProps) {
  if (conversations.length === 0) return <EmptyConversationList />;

  return conversations.map((convo) => {
    const displayName = convo.display_name || convo.username || "Unknown user";

    return (
      <button
        key={convo.user_id}
        onClick={() => onSelectConversation(convo.user_id, displayName)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
        style={{
          background:
            activeUserId === convo.user_id ? "var(--bg-active)" : "transparent",
          borderBottom: "1px solid var(--border)",
        }}
        onMouseEnter={(e) => {
          if (activeUserId !== convo.user_id) {
            e.currentTarget.style.background = "var(--bg-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (activeUserId !== convo.user_id) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <Avatar
          name={displayName}
          size={46}
          online={onlineUsers.has(convo.user_id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p
              className="font-medium text-sm truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {displayName}
            </p>
            <span
              className="text-xs shrink-0 ml-2"
              style={{ color: "var(--text-muted)" }}
            >
              {formatTime(convo.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            >
              <rect
                x="1"
                y="3"
                width="6"
                height="5"
                rx="0.8"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M3 3V2a2 2 0 014 0v1"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </svg>
            <p
              className="text-xs truncate"
              style={{ color: "var(--text-muted)" }}
            >
              Encrypted
            </p>
          </div>
        </div>
      </button>
    );
  });
}
