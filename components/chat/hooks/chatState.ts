import { ConversationSummary, Message } from "@/types/message";

export type ChatView = "sidebar" | "chat";

export type ChatState = {
  conversations: ConversationSummary[];
  messagesByUser: Record<string, Message[]>;
  activeUserId: string | null;
  activeUserName: string;
  onlineUsers: Set<string>;
  loadingMessages: boolean;
  view: ChatView;
};

export type ChatAction =
  | { type: "SET_CONVERSATIONS"; conversations: ConversationSummary[] }
  | { type: "SET_MESSAGES"; userId: string; messages: Message[] }
  | { type: "ADD_MESSAGE"; userId: string; message: Message }
  | { type: "SET_ACTIVE"; userId: string; userName: string }
  | { type: "SET_LOADING_MESSAGES"; value: boolean }
  | { type: "USER_ONLINE"; userId: string }
  | { type: "USER_OFFLINE"; userId: string }
  | { type: "SET_VIEW"; view: ChatView }
  | { type: "UPSERT_CONVERSATION"; convo: ConversationSummary };

export const initialChatState: ChatState = {
  conversations: [],
  messagesByUser: {},
  activeUserId: null,
  activeUserName: "",
  onlineUsers: new Set<string>(),
  loadingMessages: false,
  view: "sidebar",
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return {
        ...state,
        conversations: action.conversations.map((convo) => {
          const existing = state.conversations.find(
            (c) => c.user_id === convo.user_id,
          );

          if (!existing) return convo;

          return {
            ...convo,
            display_name: convo.display_name || existing.display_name,
            username: convo.username || existing.username,
          };
        }),
      };

    case "SET_MESSAGES":
      return {
        ...state,
        messagesByUser: {
          ...state.messagesByUser,
          [action.userId]: action.messages,
        },
      };

    case "ADD_MESSAGE": {
      const existing = state.messagesByUser[action.userId] ?? [];
      if (existing.some((m) => m.id === action.message.id)) return state;
      return {
        ...state,
        messagesByUser: {
          ...state.messagesByUser,
          [action.userId]: [...existing, action.message],
        },
      };
    }

    case "SET_ACTIVE":
      return {
        ...state,
        activeUserId: action.userId,
        activeUserName: action.userName,
      };

    case "SET_LOADING_MESSAGES":
      return { ...state, loadingMessages: action.value };

    case "USER_ONLINE": {
      const next = new Set(state.onlineUsers);
      next.add(action.userId);
      return { ...state, onlineUsers: next };
    }

    case "USER_OFFLINE": {
      const next = new Set(state.onlineUsers);
      next.delete(action.userId);
      return { ...state, onlineUsers: next };
    }

    case "SET_VIEW":
      return { ...state, view: action.view };

    case "UPSERT_CONVERSATION": {
      const exists = state.conversations.find(
        (c) => c.user_id === action.convo.user_id,
      );

      if (exists) {
        return {
          ...state,
          conversations: state.conversations
            .map((c) =>
              c.user_id === action.convo.user_id
                ? {
                    ...c,
                    ...action.convo,
                    display_name: action.convo.display_name || c.display_name,
                    username: action.convo.username || c.username,
                    last_message_at:
                      action.convo.last_message_at ?? c.last_message_at,
                  }
                : c,
            )
            .sort((a, b) =>
              (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""),
            ),
        };
      }

      return {
        ...state,
        conversations: [action.convo, ...state.conversations],
      };
    }

    default:
      return state;
  }
}
