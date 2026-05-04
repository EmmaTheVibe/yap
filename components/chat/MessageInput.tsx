"use client";

import { useState, KeyboardEvent, useRef, FormEvent } from "react";

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <form
      onSubmit={handleSend}
      className="flex items-end gap-2 px-3 py-3"
      style={{
        background: "var(--bg-sidebar)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        className="flex-1 flex items-end rounded-full px-4 py-2"
        style={{ background: "var(--bg-input)" }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled || sending}
          className="no-focus-ring flex-1 bg-transparent text-sm resize-none focus:outline-none focus-visible:outline-none leading-5"
          style={{
            color: "var(--text-primary)",
            maxHeight: 120,
            overflowY: "auto",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!text.trim() || sending || disabled}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40 cursor-pointer"
        style={{ background: "var(--accent)" }}
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M15.75 9L2.25 2.25l2.625 6.75L2.25 15.75 15.75 9z"
            fill="white"
          />
        </svg>
      </button>
    </form>
  );
}
