"use client";

import dynamic from "next/dynamic";

const ChatClient = dynamic(() => import("./ChatClient"), { ssr: false });

export default function ChatWrapper() {
  return <ChatClient />;
}
