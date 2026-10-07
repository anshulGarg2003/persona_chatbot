<div align="center">

# ✨ Persona Chatbot

### A little portal into other perspectives.

Chat with built-in AI personas or create your own from documents. Upload a PDF, TXT, or Markdown file, and the app turns it into searchable knowledge—so conversations can draw on the material you provide.

**Next.js · Django REST Framework · PostgreSQL + pgvector · OpenRouter**

</div>

---

## 💬 What is this?

Persona Chatbot is a full-stack conversational app for exploring different voices and building document-grounded custom personas. Pick a built-in persona, or upload a document and create a custom one. Ask questions in a chat UI, revisit conversation history, and clear or remove personas when you’re done.

Under the hood, uploaded documents are extracted and split into overlapping text chunks. OpenRouter generates embeddings for those chunks, which are stored in PostgreSQL using **pgvector**. When you ask a question, the app searches for relevant chunks and includes them as reference context for the language model’s response.

> Custom personas are AI simulations based on their descriptions and source documents—they are not the real people they may represent.

## ✨ Features

- **Built-in personas** with distinct personalities and styles.
- **Custom personas from documents** (PDF, TXT, and Markdown uploads).
- **Retrieval-augmented generation (RAG):** relevant document context is retrieved from PostgreSQL/pgvector for chat responses.
- **Persistent conversations:** view or clear chat history per persona.
- **Persona management:** list personas, upload new ones, and delete custom personas.
- **WhatsApp-inspired chat interface** built with Next.js and React.
- **Backend progress and error logs** written to the container console.

## 🧰 Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| API | Django, Django REST Framework |
| Database | PostgreSQL with the pgvector extension |
| Embeddings and chat completion | OpenRouter via the OpenAI-compatible API |
| Document parsing | pypdf for PDF; text decoding for TXT/Markdown |
| Local orchestration | Docker Compose |

## 🗂️ Project layout

```text
persona-chatbot/
├── backend/                 # Django API, chat app, migrations, and services
│   ├── chat/                # Personas, models, endpoints, and RAG services
│   ├── core/                # Django settings and root URL configuration
│   └── requirements.txt
├── frontend/                # Next.js application
├── docker-compose.yml       # Local frontend/backend services
├── .env                     # Local secrets and configuration (not committed)
├── .gitignore
└── README.md
```

## 🚀 Run locally with Docker Compose

### 1. Configure environment variables

Create a `.env` file in the project root. Keep this file private; it is ignored by Git and Docker build contexts.

```dotenv
# OpenRouter API key for embeddings and chat completions
OPEN_ROUTER_API_KEY=your_openrouter_api_key

# PostgreSQL connection (must support the pgvector extension)
DB_HOST=your_postgres_host
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_SSLMODE=require

# Optional model/runtime tuning
OPEN_ROUTER_CHAT_MODEL=openai/gpt-4o-mini
OPEN_ROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
CHAT_MAX_TOKENS=700
CHAT_TEMPERATURE=0.6
EMBEDDING_BATCH_SIZE=64
```

The database role must be able to use the `vector` extension; migration `0003_persona_document_vectors` enables it and creates the 1536-dimensional persona-document table. If your PostgreSQL provider restricts extension creation, enable pgvector through its database console first or ask an administrator.

> Do not commit real API keys, passwords, or cloud credentials. Use placeholders in examples and keep actual values in your local `.env` or deployment secret manager.

### 2. Build and start the app

From the project root:

```bash
docker compose up --build
```

Open the frontend at [http://localhost:3000](http://localhost:3000). The Django API is available at [http://localhost:8000](http://localhost:8000).

### 3. Apply database migrations

## 🧑‍💻 Run without Docker (development)

You’ll need Python 3.11+, Node.js 20+, a PostgreSQL database with pgvector, and the environment variables above.

**Backend**, from the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend**, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend currently calls the API at `http://localhost:8000/api`.

## 🔌 API overview

All application endpoints are prefixed with `/api`:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/personas/` | List built-in and custom personas |
| `POST` | `/api/personas/upload/` | Upload a document and create a custom persona (`multipart/form-data`) |
| `DELETE` | `/api/personas/<persona_id>/` | Delete a custom persona |
| `POST` | `/api/chat/` | Send a message and receive a persona reply |
| `GET` | `/api/conversations/<persona_key>/` | Get saved conversation messages |
| `DELETE` | `/api/conversations/<persona_key>/clear/` | Clear saved conversation history |

## 🧠 How document-grounded chat works

1. Upload a PDF, TXT, or Markdown document and choose a persona name and description.
2. The backend extracts and cleans the text, then splits it into overlapping chunks.
3. OpenRouter creates an embedding for each chunk; PostgreSQL stores the vectors alongside their text.
4. On a chat message, the backend embeds the query and finds the nearest chunks using pgvector cosine distance.
5. The retrieved material and conversation context are passed to the chat model to produce a reply.

The default chat and embedding models can be changed with `OPEN_ROUTER_CHAT_MODEL` and `OPEN_ROUTER_EMBEDDING_MODEL`. The embedding model must continue to return **1536 dimensions** unless the database column and existing embeddings are migrated together. If you change embedding models, re-index existing documents so stored vectors and query vectors remain compatible.

## 🧪 Checks

Frontend scripts are available from `/frontend`:

```bash
npm run lint
npm run build
```

Compile backend Python files with:

```bash
python3 -m compileall backend
```

A live retrieval test requires a configured OpenRouter key and a reachable PostgreSQL/pgvector database.

## 📌 Notes

- `backend/data/` contains local uploads and other runtime data; it is intentionally excluded from Git and Docker build contexts.
- `backend/db.sqlite3` is ignored. PostgreSQL is required for pgvector document search; SQLite is only the Django development fallback when no `DB_HOST` is configured.
- Docker Compose expects a root `.env` file for backend configuration.
- Logs include operational metadata to help diagnose failures; avoid adding sensitive content to logs.


```bash
docker compose exec backend python manage.py migrate
```

If the backend container is not running, use a one-off container:

```bash
docker compose run --rm backend python manage.py migrate
```

Follow backend logs with `docker compose logs -f backend`. Stop foreground services with `Ctrl+C`, or run `docker compose down` from another terminal.

In another terminal, run:



```bash
docker compose exec backend python manage.py migrate
```

If the backend container is not running, use a one-off container:

```bash
docker compose run --rm backend python manage.py migrate
```

Follow backend logs with `docker compose logs -f backend`. Stop foreground services with `Ctrl+C`, or run `docker compose down` from another terminal.

