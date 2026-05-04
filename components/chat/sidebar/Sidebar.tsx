"use client";

import { useCallback, useState } from "react";
import { UserPublicInfo } from "@/types/auth";
import { ConversationSummary } from "@/types/message";
import { apiSearchUsers } from "@/lib/api";
import { useSession } from "@/components/shared/SessionContext";
import ConversationList from "./ConversationList";
import SearchResults from "./SearchResults";
import SidebarHeader from "./SidebarHeader";
import SidebarSearch from "./SidebarSearch";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeUserId: string | null;
  onlineUsers: Set<string>;
  onSelectConversation: (userId: string, displayName: string) => void;
  onNewChat: (user: UserPublicInfo) => void;
  onLogout: () => void;
}

export default function Sidebar({
  conversations,
  activeUserId,
  onlineUsers,
  onSelectConversation,
  onNewChat,
  onLogout,
}: SidebarProps) {
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserPublicInfo[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);

    if (q.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await apiSearchUsers(q.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectUser = useCallback(
    (user: UserPublicInfo) => {
      onNewChat(user);
      setQuery("");
      setSearchResults([]);
    },
    [onNewChat],
  );

  const isSearching = query.trim().length > 0;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-sidebar)" }}
    >
      <SidebarHeader
        displayName={session?.user.display_name ?? "U"}
        onLogout={onLogout}
      />
      <SidebarSearch query={query} onChange={handleSearch} />

      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResults
            query={query}
            users={searchResults}
            searching={searching}
            onSelectUser={handleSelectUser}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            activeUserId={activeUserId}
            onlineUsers={onlineUsers}
            onSelectConversation={onSelectConversation}
          />
        )}
      </div>
    </div>
  );
}
