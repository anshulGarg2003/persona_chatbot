"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Persona, Message } from "./types";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import UploadModal from "./components/UploadModal";

const API_BASE = "http://localhost:8000/api";

export default function Home() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>("elon");
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchPersonas = async (selectKey?: string) => {
    try {
      const res = await axios.get(`${API_BASE}/personas/`);
      const list = res.data.personas || [];
      setPersonas(list);
      if (selectKey) {
        setSelectedPersona(selectKey);
      } else if (list.length > 0 && !personas.some((p) => p.key === selectedPersona)) {
        setSelectedPersona(list[0].key);
      }
    } catch {
      setPersonas([
        { key: "elon", name: "Elon Musk", description: "Visionary, futuristic, concise", is_custom: false },
        { key: "steve", name: "Steve Jobs", description: "Design perfectionist", is_custom: false },
        { key: "einstein", name: "Albert Einstein", description: "Philosophical physicist", is_custom: false },
      ]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_BASE}/personas/`)
      .then((res) => {
        if (cancelled) return;
        const list = res.data.personas || [];
        setPersonas(list);
        if (list.length > 0 && !list.some((p: Persona) => p.key === selectedPersona)) {
          setSelectedPersona(list[0].key);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPersonas([
            { key: "elon", name: "Elon Musk", description: "Visionary, futuristic, concise", is_custom: false },
            { key: "steve", name: "Steve Jobs", description: "Design perfectionist", is_custom: false },
            { key: "einstein", name: "Albert Einstein", description: "Philosophical physicist", is_custom: false },
          ]);
        }
      });
    return () => { cancelled = true; };
  }, [selectedPersona]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setHistoryLoading(true);
      return axios.get(`${API_BASE}/conversations/${encodeURIComponent(selectedPersona)}/`);
    })
      .then((res) => {
        if (!cancelled && res) setMessages(res.data.messages || []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedPersona]);

  const currentPersona = personas.find((p) => p.key === selectedPersona);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || historyLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, persona: selectedPersona }),
      });
      if (!response.ok || !response.body) throw new Error("Unable to start streamed response");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantReply = "";
      setMessages([...updatedMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice(6)) as { token?: string; error?: string };
          if (data.error) throw new Error(data.error);
          if (data.token) {
            assistantReply += data.token;
            setMessages([...updatedMessages, { role: "assistant", content: assistantReply }]);
          }
        }
      }
    } catch {
      setMessages((current) => {
        const withoutPartialReply = current.at(-1)?.role === "assistant" ? current.slice(0, -1) : current;
        return [
          ...withoutPartialReply,
          { role: "assistant", content: "Sorry, I encountered an issue generating a response." },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersona = async (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!confirm("Delete this custom persona and its vector embeddings?")) return;
    try {
      await axios.delete(`${API_BASE}/personas/${key}/`);
      if (selectedPersona === key) {
        setSelectedPersona("elon");
        setMessages([]);
      }
      fetchPersonas();
    } catch {
      alert("Failed to delete persona.");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#efeae2] text-[#263238] font-sans">
      <Sidebar
        personas={personas}
        selectedPersona={selectedPersona}
        sidebarOpen={sidebarOpen}
        onSelect={(k) => {
          setSelectedPersona(k);
        }}
        onDelete={handleDeletePersona}
        onOpenUpload={() => setIsUploadOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatArea
        currentPersona={currentPersona}
        messages={messages}
        input={input}
        loading={loading}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(true)}
        onInputChange={setInput}
        onSend={handleSend}
        onClear={async () => {
          try {
            await axios.delete(`${API_BASE}/conversations/${encodeURIComponent(selectedPersona)}/clear/`);
            setMessages([]);
            setInput("");
          } catch {
            alert("Could not clear the saved conversation. Please try again.");
          }
        }}
      />

      {historyLoading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#efeae2]/85 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-label="Fetching conversation history"
        >
          <div className="flex min-w-64 flex-col items-center gap-5 rounded-3xl border border-[#d8d1c7] bg-white/95 px-10 py-8 shadow-[0_24px_100px_rgba(0,168,132,0.18)]">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#00a884]/10" />
              <span className="absolute inset-0 rounded-full border border-[#00a884]/20" />
              <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#00a884]/15 border-t-[#00a884]" />
              <span className="absolute text-lg text-[#008f72]">✦</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium tracking-wide text-white">Fetching history</p>
              <p className="mt-1.5 text-xs text-neutral-400">Loading your conversation…</p>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#00a884]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#00a884]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#00a884]" />
            </div>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newP) => {
          fetchPersonas(newP.key);
          setMessages([]);
        }}
      />
    </div>
  );
}

