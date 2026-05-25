import { CheckCheck, CircleAlert, Clock3 } from "lucide-react";
import { MessageSendStatus } from "@/types/message";

interface MessageStatusIconProps {
  delivered: boolean;
  status?: MessageSendStatus;
}

export default function MessageStatusIcon({
  delivered,
  status,
}: MessageStatusIconProps) {
  if (status === "pending") {
    return <Clock3 size={14} strokeWidth={1.7} color="var(--text-muted)" />;
  }

  if (status === "failed") {
    return <CircleAlert size={14} strokeWidth={1.8} color="#f87171" />;
  }

  return (
    <CheckCheck
      size={15}
      strokeWidth={1.8}
      color={delivered ? "var(--accent)" : "var(--text-muted)"}
    />
  );
}
