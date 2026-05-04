"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/shared/SessionContext";
import { apiLogout } from "@/lib/api";
import ChatShell from "./ChatShell";
import SessionStatus from "./SessionStatus";
import UnlockSession from "./UnlockSession";
import { useChatController } from "./hooks/useChatController";

export default function ChatClient() {
  const router = useRouter();
  const { session, logout, restore, initializing, hasStoredSession } =
    useSession();
  const {
    state,
    activeMessages,
    selectConversation,
    startNewChat,
    sendMessage,
    showSidebar,
  } = useChatController(session);

  useEffect(() => {
    if (initializing || session || hasStoredSession) return;
    router.replace("/login");
  }, [initializing, session, hasStoredSession, router]);

  const handleLogout = useCallback(async () => {
    if (session?.refreshToken) {
      try {
        await apiLogout(session.refreshToken);
      } catch {
        /* ignore */
      }
    }
    logout();
    router.replace("/login");
  }, [session, logout, router]);

  if (initializing) {
    return <SessionStatus text="Checking session..." />;
  }

  if (!session && hasStoredSession) {
    return (
      <UnlockSession
        onUnlock={restore}
        onUseLogin={() => router.replace("/login")}
      />
    );
  }

  if (!session) return null;

  return (
    <ChatShell
      chat={state}
      activeMessages={activeMessages}
      myUserId={session.user.id}
      actions={{
        selectConversation,
        startNewChat,
        logout: handleLogout,
        sendMessage,
        showSidebar,
      }}
    />
  );
}
