"use client";

import { Persona } from "../types";

interface Props {
  personas: Persona[];
  selectedPersona: string;
  sidebarOpen: boolean;
  onSelect: (k: string) => void;
  onDelete: (e: React.MouseEvent, k: string) => void;
  onOpenUpload: () => void;
  onClose: () => void;
}

export default function Sidebar({
  personas,
  selectedPersona,
  sidebarOpen,
  onSelect,
  onDelete,
  onOpenUpload,
  onClose,
}: Props) {
  const init = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside
      className={`${
        sidebarOpen ? "w-72" : "w-0"
      } transition-all duration-300 border-r border-[#1f3b36] bg-[#075e54] flex flex-col overflow-hidden z-20 shrink-0`}
    >
      <div className="p-4 border-b border-white/15 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#00a884] flex items-center justify-center font-bold text-white shadow">
            ⚡
          </div>
          <div>
            <h1 className="font-semibold text-sm text-white">Persona AI</h1>
            <p className="text-[11px] text-white/70">RAG Document Clones</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-white/70 hover:text-white">
          ✕
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={onOpenUpload}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-[#00a884] hover:bg-[#008f72] text-white text-xs font-medium shadow transition"
        >
          <span>+</span>
          <span>Upload Document Persona</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
        {personas.some((p) => p.is_custom) && (
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold uppercase text-neutral-400">
              Custom RAG Personas
            </div>
            <div className="space-y-1 mt-1">
              {personas
                .filter((p) => p.is_custom)
                .map((p) => (
                  <div
                    key={p.key}
                    onClick={() => onSelect(p.key)}
                    className={`group w-full flex items-center justify-between p-2 rounded-xl cursor-pointer border ${
                      selectedPersona === p.key
                        ? "bg-[#ffffff1a] border-[#25d366] text-white"
                        : "bg-white/10 hover:bg-white/15 border-white/10 text-white/85"
                    }`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {init(p.name)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium truncate flex items-center space-x-1">
                          <span>{p.name}</span>
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400">
                            RAG
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {p.total_chunks || 0} chunks • {p.source_file_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => onDelete(e, p.key)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div>
          <div className="px-2 py-1 text-[11px] font-semibold uppercase text-neutral-400">
            Built-in Personalities
          </div>
          <div className="space-y-1 mt-1">
            {personas
              .filter((p) => !p.is_custom)
              .map((p) => (
                <button
                  key={p.key}
                  onClick={() => onSelect(p.key)}
                  className={`w-full flex items-center space-x-2 p-2 rounded-xl text-left border ${
                    selectedPersona === p.key
                      ? "bg-[#ffffff1a] border-[#25d366] text-white"
                      : "border-transparent hover:bg-white/10 text-white/85"
                  }`}
                >
                  <div className="w-7 h-7 rounded bg-white/15 text-[#b9f5d0] flex items-center justify-center text-xs font-bold shrink-0">
                    {init(p.name)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <p className="text-[10px] text-neutral-400 truncate">{p.description}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-white/15 text-[11px] text-white/70 flex items-center justify-between">
        <span>PostgreSQL pgvector</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
      </div>
    </aside>
  );
}
