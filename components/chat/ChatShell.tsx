"use client";

import { UserPublicInfo } from "@/types/auth";
import { Message } from "@/types/message";
import { ChatState } from "./hooks/chatState";
import ChatWindow from "./ChatWindow";
import EmptyChatState from "./EmptyChatState";
import Sidebar from "./sidebar/Sidebar";

interface ChatShellProps {
  chat: ChatState;
  activeMessages: Message[];
  myUserId: string;
  actions: {
    selectConversation: (userId: string, displayName: string) => void;
    startNewChat: (user: UserPublicInfo) => void;
    logout: () => void;
    sendMessage: (text: string) => Promise<void>;
    showSidebar: () => void;
  };
}

export default function ChatShell({
  chat,
  activeMessages,
  myUserId,
  actions,
}: ChatShellProps) {
  const {
    conversations,
    activeUserId,
    activeUserName,
    onlineUsers,
    loadingMessages,
    view,
  } = chat;

  return (
    <div
      className="flex h-dvh overflow-hidden"
      style={{ background: "var(--bg-app)" }}
    >
      <div
        className={`w-full shrink-0 md:w-90 md:border-r ${
          view === "chat" ? "hidden md:flex" : "flex"
        } flex-col`}
        style={{ borderColor: "var(--border)" }}
      >
        <Sidebar
          conversations={conversations}
          activeUserId={activeUserId}
          onlineUsers={onlineUsers}
          onSelectConversation={actions.selectConversation}
          onNewChat={actions.startNewChat}
          onLogout={actions.logout}
        />
      </div>

      <div
        className={`flex-1 ${
          view === "sidebar" ? "hidden md:flex" : "flex"
        } flex-col`}
      >
        {activeUserId ? (
          <ChatWindow
            recipientId={activeUserId}
            recipientName={activeUserName}
            messages={activeMessages}
            myUserId={myUserId}
            isOnline={onlineUsers.has(activeUserId)}
            onSend={actions.sendMessage}
            onBack={actions.showSidebar}
            loadingMessages={loadingMessages}
          />
        ) : (
          <EmptyChatState />
        )}
      </div>
    </div>
  );
}
