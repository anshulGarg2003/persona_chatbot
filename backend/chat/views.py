import os
import uuid
import logging
from pathlib import Path
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status

from chat.personas.persona_config import PERSONAS
from chat.models import ChatMessage, Conversation, CustomPersona
from chat.services.document_processor import extract_text_from_file, chunk_text
from chat.services.vector_store import add_persona_documents, delete_persona_documents
from chat.services.prompt_builder import build_prompt
from chat.services.bedrock_service import generate_response

logger = logging.getLogger(__name__)

# Base directory for storing physical uploaded files
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = os.path.join(BASE_DIR, "data", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)



@api_view(["GET"])
def personas_view(request):
    """Return the list of all personas: built-in and uploaded custom personas."""
    logger.info("Listing personas: request_id=%s", request.META.get("HTTP_X_REQUEST_ID", "-"))
    personas_list = []
    
    # 1. Built-in personas
    for key, value in PERSONAS.items():
        personas_list.append({
            "key": key,
            "name": value["name"],
            "description": value["description"],
            "is_custom": False,
            "has_rag": False,
            "total_chunks": 0,
        })
    
    # 2. Uploaded Custom Personas
    for cp in CustomPersona.objects.all().order_by("-created_at"):
        personas_list.append({
            "key": cp.id,
            "name": cp.name,
            "description": cp.description,
            "is_custom": True,
            "has_rag": cp.total_chunks > 0,
            "source_file_name": cp.source_file_name,
            "total_chunks": cp.total_chunks,
        })

    return Response({"personas": personas_list})


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def upload_persona_view(request):
    """
    Handle document upload (PDF or TXT/MD), save physical file to disk,
    extract text, chunk it, create vector embeddings in PostgreSQL with pgvector, and register custom persona.
    """
    file_obj = request.FILES.get("file")
    name = request.data.get("name", "").strip()
    description = request.data.get("description", "").strip()

    if not file_obj:
        return Response(
            {"error": "Please provide a PDF or TXT document."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not name:
        base_name = file_obj.name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
        name = base_name.title()

    filename = file_obj.name
    persona_id = f"custom_{uuid.uuid4().hex[:8]}"
    logger.info(f"Processing upload for persona: '{name}' with file '{filename}'")

    try:
        # 1. Save physical copy of file to disk (backend/data/uploads/)
        logger.info("Upload stage: saving file persona=%s filename=%s", persona_id, filename)
        saved_filename = f"{persona_id}_{filename}"
        saved_file_path = os.path.join(UPLOADS_DIR, saved_filename)
        with open(saved_file_path, "wb+") as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
        
        file_obj.seek(0)

        # 2. Extract text
        logger.info("Upload stage: extracting text persona=%s filename=%s", persona_id, filename)
        raw_text = extract_text_from_file(file_obj, filename)
        logger.info("Upload stage: text extracted persona=%s chars=%d", persona_id, len(raw_text or ""))
        if not raw_text or len(raw_text.strip()) < 10:
            if os.path.exists(saved_file_path):
                os.remove(saved_file_path)
            return Response(
                {"error": "Could not extract text from file. Please check if the file has selectable text."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Chunk text
        logger.info("Upload stage: chunking text persona=%s", persona_id)
        chunks = chunk_text(raw_text, chunk_size=600, chunk_overlap=100)
        logger.info("Upload stage: chunking complete persona=%s chunk_count=%d", persona_id, len(chunks))
        if not chunks:
            if os.path.exists(saved_file_path):
                os.remove(saved_file_path)
            return Response(
                {"error": "Document could not be chunked."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Store embeddings in PostgreSQL using pgvector
        logger.info("Upload stage: indexing chunks persona=%s chunk_count=%d", persona_id, len(chunks))
        total_chunks = add_persona_documents(persona_id, chunks)
        logger.info("Upload stage: indexing complete persona=%s stored_chunks=%d", persona_id, total_chunks)

        # 5. Save CustomPersona metadata
        logger.info("Upload stage: saving persona metadata persona=%s", persona_id)
        custom_persona = CustomPersona.objects.create(
            id=persona_id,
            name=name,
            description=description or f"Custom persona generated from {filename}",
            source_file_name=filename,
            total_chunks=total_chunks
        )

        logger.info("Upload completed: persona=%s stored_chunks=%d", persona_id, total_chunks)
        return Response({
            "message": "Persona created successfully with knowledge base!",
            "persona": {
                "key": custom_persona.id,
                "name": custom_persona.name,
                "description": custom_persona.description,
                "is_custom": True,
                "has_rag": True,
                "source_file_name": custom_persona.source_file_name,
                "total_chunks": custom_persona.total_chunks,
            }
        }, status=status.HTTP_201_CREATED)

    except Exception:
        logger.exception("Failed to process document upload: persona=%s filename=%s", persona_id, filename)
        return Response(
            {"error": f"Failed to process file: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["DELETE"])
def delete_persona_view(request, persona_id):
    """Delete custom persona, remove its physical file, and clear its vector embeddings."""
    logger.info("Delete persona request started: persona=%s", persona_id)
    try:
        persona = CustomPersona.objects.get(id=persona_id)
        persona_name = persona.name
        
        # Delete physical saved file if present
        for f in os.listdir(UPLOADS_DIR):
            if f.startswith(f"{persona_id}_"):
                try:
                    os.remove(os.path.join(UPLOADS_DIR, f))
                except Exception:
                    pass

        logger.info("Delete stage: removing vector documents persona=%s", persona_id)
        delete_persona_documents(persona_id)
        persona.delete()
        logger.info("Delete persona completed: persona=%s", persona_id)
        return Response({"message": f"Persona '{persona_name}' deleted successfully."})
    except CustomPersona.DoesNotExist:
        return Response(
            {"error": "Persona not found or is a built-in persona."},
            status=status.HTTP_404_NOT_FOUND
        )



@api_view(["POST"])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def chat_view(request):
    """Generate a reply and persist both sides of the exchange."""
    user_message = request.data.get("message")
    persona_key = request.data.get("persona", "elon")
    logger.info("Chat request started: persona=%s message_chars=%d", persona_key, len(user_message) if isinstance(user_message, str) else 0)

    if not isinstance(user_message, str) or not user_message.strip():
        return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    persona_obj = None
    if persona_key not in PERSONAS:
        try:
            persona_obj = CustomPersona.objects.get(id=persona_key)
        except CustomPersona.DoesNotExist:
            return Response({"error": "Persona not found."}, status=status.HTTP_404_NOT_FOUND)

    conversation, _ = Conversation.objects.get_or_create(persona_key=persona_key)
    persona_name = persona_obj.name if persona_obj else PERSONAS[persona_key]["name"]
    history = [
        {
            "role": "User" if message.role == "user" else persona_name,
            "content": message.content,
        }
        for message in conversation.messages.order_by("created_at", "id").reverse()[:10]
    ][::-1]

    logger.info("Chat stage: building prompt persona=%s history_count=%d", persona_key, len(history))
    prompt = build_prompt(persona_key, user_message.strip(), history, persona_obj=persona_obj)
    logger.info("Chat stage: prompt ready persona=%s prompt_chars=%d", persona_key, len(prompt))
    try:
        reply = generate_response(prompt)
    except Exception:
        logger.exception("Failed to generate chat response for persona %s", persona_key)
        return Response({"error": "Failed to generate a response."}, status=status.HTTP_502_BAD_GATEWAY)

    logger.info("Chat stage: persisting exchange persona=%s", persona_key)
    ChatMessage.objects.bulk_create([
        ChatMessage(conversation=conversation, role="user", content=user_message.strip()),
        ChatMessage(conversation=conversation, role="assistant", content=reply),
    ])
    conversation.save(update_fields=["updated_at"])
    logger.info("Chat request completed: persona=%s", persona_key)

    return Response({"reply": reply})


@api_view(["GET"])
def conversation_view(request, persona_key):
    """Return saved messages for the selected persona."""
    if persona_key not in PERSONAS and not CustomPersona.objects.filter(id=persona_key).exists():
        return Response({"error": "Persona not found."}, status=status.HTTP_404_NOT_FOUND)

    conversation = Conversation.objects.filter(persona_key=persona_key).first()
    messages = [] if conversation is None else [
        {"role": message.role, "content": message.content}
        for message in conversation.messages.order_by("created_at", "id")
    ]
    return Response({"messages": messages})


@api_view(["DELETE"])
def clear_conversation_view(request, persona_key):
    """Clear saved chat history for a persona."""
    if persona_key not in PERSONAS and not CustomPersona.objects.filter(id=persona_key).exists():
        return Response({"error": "Persona not found."}, status=status.HTTP_404_NOT_FOUND)
    Conversation.objects.filter(persona_key=persona_key).delete()
    return Response({"message": "Conversation history cleared."})

