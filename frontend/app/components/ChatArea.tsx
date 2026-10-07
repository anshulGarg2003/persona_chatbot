"use client";

import { useRef, useEffect } from "react";
import { Persona, Message } from "../types";

interface Props {
  currentPersona?: Persona;
  messages: Message[];
  input: string;
  loading: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onClear: () => void;
}

export default function ChatArea({
  currentPersona,
  messages,
  input,
  loading,
  sidebarOpen,
  onToggleSidebar,
  onInputChange,
  onSend,
  onClear,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const init = (n?: string) =>
    n ? n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) : "AI";

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#efeae2]">
      <header className="h-16 border-b border-[#d8d1c7] bg-[#f0f2f5] px-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg bg-white border border-[#d8d1c7] text-[#54656f] hover:text-[#00a884]"
            >
              ☰
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-[#00a884] flex items-center justify-center text-white text-xs font-bold">
            {init(currentPersona?.name)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-[#263238]">{currentPersona?.name || "Assistant"}</h2>
              {currentPersona?.is_custom && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  RAG ({currentPersona.total_chunks} chunks)
                </span>
              )}
            </div>
            <p className="text-xs text-[#54656f] truncate max-w-sm">{currentPersona?.description}</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-[#54656f] hover:text-[#008f72] px-3 py-1.5 rounded-lg border border-[#d8d1c7] bg-white"
        >
          Clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[radial-gradient(circle_at_1px_1px,#d9d2c8_1px,transparent_0)] [background-size:22px_22px] text-[#263238]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d9fdd3] border border-[#b9e8b1] flex items-center justify-center text-xl">
              💬
            </div>
            <h3 className="text-sm font-semibold text-[#263238]">Chat with {currentPersona?.name}</h3>
            <p className="text-xs text-[#54656f]">
              {currentPersona?.is_custom
                ? `Knowledge indexed from ${currentPersona.source_file_name}`
                : currentPersona?.description}
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex space-x-2.5 max-w-2xl ${m.role === "user" ? "ml-auto justify-end" : "mr-auto"}`}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded bg-[#d9fdd3] text-[#008f72] flex items-center justify-center text-xs font-bold shrink-0">
                  {init(currentPersona?.name)}
                </div>
              )}
              <div
                className={`p-3 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[#d9fdd3] text-[#173b32] rounded-br-none"
                    : "bg-white border border-[#e6e2db] text-[#263238] rounded-bl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex space-x-2.5 max-w-2xl mr-auto">
            <div className="w-7 h-7 rounded bg-[#d9fdd3] text-[#008f72] flex items-center justify-center text-xs font-bold shrink-0">
              {init(currentPersona?.name)}
            </div>
            <div
              role="status"
              aria-label="Typing"
              className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-[#e6e2db] bg-white px-4 py-3 shadow-sm"
            >
              {/* <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-sm text-indigo-300">
                  ✦
                </span>
              </span> */}
              <span className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[#263238]">Typing</span>
                <span className="flex items-center gap-1" aria-hidden="true">
                  <span className="typing-dot h-1 w-1 rounded-full bg-[#00a884]" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-[#00a884]" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-[#00a884]" />
                </span>
              </span>
              {/* <span className="ml-1 h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/20 border-t-indigo-400" aria-hidden="true" /> */}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#d8d1c7] bg-[#f0f2f5]">
        <div className="max-w-3xl mx-auto flex items-center space-x-2 bg-white border border-[#d8d1c7] rounded-2xl p-2 shadow-sm">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={`Message ${currentPersona?.name || "Assistant"}...`}
            className="flex-1 min-h-6 max-h-40 overflow-y-auto bg-transparent px-3 py-1.5 text-xs sm:text-sm text-[#263238] placeholder-[#87949b] resize-none outline-none"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 text-white text-xs font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
