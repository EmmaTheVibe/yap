import { UserPublicInfo } from "@/types/auth";
import Avatar from "@/components/shared/Avatar";

interface SearchResultsProps {
  query: string;
  users: UserPublicInfo[];
  searching: boolean;
  onSelectUser: (user: UserPublicInfo) => void;
}

export default function SearchResults({
  query,
  users,
  searching,
  onSelectUser,
}: SearchResultsProps) {
  return (
    <>
      {searching && (
        <p className="text-xs px-4 py-2" style={{ color: "var(--text-muted)" }}>
          Searching...
        </p>
      )}

      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelectUser(user)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
          style={{ borderBottom: "1px solid var(--border)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Avatar name={user.display_name} size={46} />
          <div className="flex-1 min-w-0">
            <p
              className="font-medium text-sm truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {user.display_name}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              @{user.username}
            </p>
          </div>
        </button>
      ))}

      {!searching && users.length === 0 && query.length > 0 && (
        <p
          className="text-sm px-4 py-4 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          No users found
        </p>
      )}
    </>
  );
}
