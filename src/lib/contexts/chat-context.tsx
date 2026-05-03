"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: UIMessage[];
}

interface ChatContextType {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [input, setInput] = useState("");

  const chat = useAIChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        files: fileSystem.serialize(),
        projectId,
      },
    }),
    messages: initialMessages,
  });

  // Apply server-side tool calls to the client file system as they stream in.
  // onToolCall only fires for client-side tools; server tools come back as
  // `tool-*` parts in assistant messages.
  const processedToolCalls = useRef(new Set<string>());
  useEffect(() => {
    for (const message of chat.messages) {
      if (message.role !== "assistant") continue;
      const parts = message.parts as any[];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part.type.startsWith("tool-")) continue;
        const key = `${message.id}:${i}`;
        if (processedToolCalls.current.has(key)) continue;
        const state: string = part.state ?? "";
        if (
          state === "input-available" ||
          state === "output-streaming" ||
          state === "output-available"
        ) {
          const toolName = part.type.slice(5);
          if (part.input) {
            handleToolCall({ toolName, args: part.input });
            processedToolCalls.current.add(key);
          }
        }
      }
    }
  }, [chat.messages, handleToolCall]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    chat.sendMessage({ text: input });
    setInput("");
  };

  // Track anonymous work
  useEffect(() => {
    if (!projectId && chat.messages.length > 0) {
      setHasAnonWork(chat.messages, fileSystem.serialize());
    }
  }, [chat.messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages: chat.messages,
        input,
        handleInputChange,
        handleSubmit,
        status: chat.status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
