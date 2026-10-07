export interface Persona {
  key: string;
  name: string;
  description: string;
  is_custom?: boolean;
  has_rag?: boolean;
  source_file_name?: string;
  total_chunks?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}
