"use client";

import { useCallback, useEffect, useReducer } from "react";
import { Session, UserPublicInfo } from "@/types/auth";
import { Message } from "@/types/message";
import {
  apiGetConversations,
  apiGetMessages,
  apiGetPublicKey,
  apiSendMessage,
} from "@/lib/api";
import { decryptMessage, encryptMessage } from "@/lib/crypto";
import { wsManager } from "@/lib/websocket";
import { chatReducer, initialChatState } from "./chatState";

export function useChatController(session: Session | null) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const loadConversations = useCallback(async () => {
    try {
      const convos = await apiGetConversations();
      dispatch({ type: "SET_CONVERSATIONS", conversations: convos });
    } catch (err) {
      console.error("Could not load conversations:", err);
    }
  }, []);

  const decryptOne = useCallback(
    async (msg: Message): Promise<Message> => {
      if (!session?.privateKey) return { ...msg, decryptError: true };

      try {
        const isSender = msg.from_user_id === session.user.id;
        const text = await decryptMessage(
          msg.payload,
          session.privateKey,
          isSender,
        );
        return { ...msg, text };
      } catch {
        return { ...msg, decryptError: true };
      }
    },
    [session],
  );

  const loadMessages = useCallback(
    async (userId: string) => {
      dispatch({ type: "SET_LOADING_MESSAGES", value: true });

      try {
        const raw = await apiGetMessages(userId, { limit: 50 });
        const ordered = [...raw].reverse();
        const decrypted = await Promise.all(ordered.map(decryptOne));
        dispatch({ type: "SET_MESSAGES", userId, messages: decrypted });
      } catch {
        // Message load errors are handled visually
      } finally {
        dispatch({ type: "SET_LOADING_MESSAGES", value: false });
      }
    },
    [decryptOne],
  );

  const selectConversation = useCallback(
    (userId: string, userName: string) => {
      dispatch({ type: "SET_ACTIVE", userId, userName });
      dispatch({ type: "SET_VIEW", view: "chat" });

      if (!state.messagesByUser[userId]) {
        loadMessages(userId);
      }
    },
    [state.messagesByUser, loadMessages],
  );

  const startNewChat = useCallback(
    (user: UserPublicInfo) => {
      dispatch({
        type: "UPSERT_CONVERSATION",
        convo: {
          user_id: user.id,
          display_name: user.display_name,
          username: user.username,
          last_message_at: null,
        },
      });
      selectConversation(user.id, user.display_name);
    },
    [selectConversation],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!state.activeUserId || !session) return;

      try {
        const recipientPublicKey = await apiGetPublicKey(state.activeUserId);
        const payload = await encryptMessage(
          text,
          recipientPublicKey,
          session.user.public_key,
        );

        const sentRealtime = wsManager.send("message.send", {
          to: state.activeUserId,
          payload,
        });
        const message = sentRealtime
          ? {
              id: crypto.randomUUID(),
              from_user_id: session.user.id,
              to_user_id: state.activeUserId,
              payload,
              delivered: false,
              created_at: new Date().toISOString(),
              text,
            }
          : { ...(await apiSendMessage(state.activeUserId, payload)), text };

        dispatch({
          type: "ADD_MESSAGE",
          userId: state.activeUserId,
          message,
        });
        dispatch({
          type: "UPSERT_CONVERSATION",
          convo: {
            user_id: state.activeUserId,
            display_name: state.activeUserName,
            username: "",
            last_message_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error("Send failed:", err);
      }
    },
    [state.activeUserId, state.activeUserName, session],
  );

  const showSidebar = useCallback(() => {
    dispatch({ type: "SET_VIEW", view: "sidebar" });
  }, []);

  useEffect(() => {
    const offMessage = wsManager.on("message.receive", async (msg) => {
      const partnerId =
        msg.from_user_id === session?.user.id
          ? msg.to_user_id
          : msg.from_user_id;

      const decrypted = await decryptOne(msg);
      dispatch({ type: "ADD_MESSAGE", userId: partnerId, message: decrypted });
      dispatch({
        type: "UPSERT_CONVERSATION",
        convo: {
          user_id: partnerId,
          display_name: "",
          username: "",
          last_message_at: msg.created_at,
        },
      });
      loadConversations();
    });

    const offOnline = wsManager.on("user.online", (userId) => {
      dispatch({ type: "USER_ONLINE", userId });
    });

    const offOffline = wsManager.on("user.offline", (userId) => {
      dispatch({ type: "USER_OFFLINE", userId });
    });

    return () => {
      offMessage();
      offOnline();
      offOffline();
    };
  }, [session, decryptOne, loadConversations]);

  useEffect(() => {
    if (!session) return;
    loadConversations();
  }, [session, loadConversations]);

  const activeMessages = state.activeUserId
    ? (state.messagesByUser[state.activeUserId] ?? [])
    : [];

  return {
    state,
    activeMessages,
    selectConversation,
    startNewChat,
    sendMessage,
    showSidebar,
  };
}
