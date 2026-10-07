"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import axios from "axios";
import { Persona } from "../types";

const API_BASE = "http://localhost:8000/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (p: Persona) => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!name) {
        const base = selected.name.split(".")[0];
        setName(base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a PDF or TXT file.");
      return;
    }
    setLoading(true);
    setError("");
    setStatusText("Extracting text and storing embeddings in PostgreSQL...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("description", description);

    try {
      const res = await axios.post(`${API_BASE}/personas/upload/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const createdPersona: Persona = res.data.persona;
      setStatusText(`Indexed ${createdPersona.total_chunks} chunks successfully!`);
      setTimeout(() => {
        onSuccess(createdPersona);
        onClose();
        setFile(null);
        setName("");
        setDescription("");
        setStatusText("");
      }, 900);
    } catch (err: unknown) {
      const responseError = axios.isAxiosError<{ error?: string }>(err)
        ? err.response?.data?.error
        : undefined;
      setError(responseError || "Upload failed.");
      setStatusText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#d8d1c7] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#263238]">Upload Persona Document</h3>
          <button onClick={onClose} className="p-1 rounded text-[#54656f] hover:text-[#00a884]">
            ✕
          </button>
        </div>

        <p className="text-xs text-[#54656f] mb-4 leading-normal">
          Upload a PDF or TXT document (biography, writings, resume). The system will chunk the document and index it in PostgreSQL to chat directly with this persona.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Document (.pdf, .txt, .md)</label>
            <input
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileChange}
              className="w-full text-xs text-[#54656f] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#00a884] file:text-white hover:file:bg-[#008f72] cursor-pointer bg-[#f5f5f5] p-1.5 rounded-xl border border-[#d8d1c7]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Persona Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Richard Feynman"
              className="w-full px-3 py-2 bg-[#f5f5f5] border border-[#d8d1c7] rounded-xl text-xs text-[#263238] placeholder-[#87949b] focus:outline-none focus:border-[#00a884]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Personality / Description <span className="text-[#87949b]">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Playful Nobel physicist and educator"
              className="w-full px-3 py-2 bg-[#f5f5f5] border border-[#d8d1c7] rounded-xl text-xs text-[#263238] placeholder-[#87949b] focus:outline-none focus:border-[#00a884]"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {statusText && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              {loading && <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></span>}
              <span>{statusText}</span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl bg-[#edf0f0] text-[#37474f] hover:bg-[#e1e6e6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-4 py-2 text-xs rounded-xl bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 text-white font-medium"
            >
              {loading ? "Indexing..." : "Create Persona"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
