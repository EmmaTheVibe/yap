"use client";

import { useRef, useLayoutEffect } from "react";
import { Message } from "@/types/message";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import Avatar from "@/components/shared/Avatar";

interface ChatWindowProps {
  recipientId: string;
  recipientName: string;
  messages: Message[];
  myUserId: string;
  isOnline: boolean;
  onSend: (text: string) => Promise<void>;
  onBack: () => void;
  loadingMessages: boolean;
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}

export default function ChatWindow({
  recipientName,
  messages,
  myUserId,
  isOnline,
  onSend,
  onBack,
  loadingMessages,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  const groups = groupByDate(messages);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-chat)" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: "var(--bg-sidebar)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={onBack}
          className="md:hidden p-1 rounded-full cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 15L7.5 10l5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <Avatar name={recipientName} size={40} online={isOnline} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className="font-semibold text-sm truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {recipientName}
            </p>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-label="End-to-end encrypted"
            >
              <rect
                x="1.5"
                y="5"
                width="9"
                height="6"
                rx="1"
                stroke="var(--accent)"
                strokeWidth="1.2"
              />
              <path
                d="M3.5 5V3.5a2.5 2.5 0 015 0V5"
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex justify-center my-3">
          <div
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{
              background: "rgba(0,168,132,0.1)",
              color: "var(--accent)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect
                x="1"
                y="4.5"
                width="9"
                height="5.5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.1"
              />
              <path
                d="M3 4.5V3a2.5 2.5 0 015 0v1.5"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
            Messages in this chat are end-to-end encrypted
          </div>
        </div>

        {loadingMessages && (
          <div className="flex justify-center py-4">
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-3">
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "var(--bg-sidebar)",
                  color: "var(--text-muted)",
                }}
              >
                {group.date}
              </span>
            </div>
            {group.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isSent={msg.from_user_id === myUserId}
              />
            ))}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={onSend} />
    </div>
  );
}
