from django.db import models
from pgvector.django import VectorField


class CustomPersona(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    source_file_name = models.CharField(max_length=255, blank=True, default="")
    total_chunks = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


class PersonaDocument(models.Model):
    persona_id = models.CharField(max_length=100)
    chunk_index = models.IntegerField()
    content = models.TextField()
    embedding = VectorField(dimensions=1536)

    class Meta:
        db_table = "chat_persona_document"
        constraints = [
            models.UniqueConstraint(
                fields=("persona_id", "chunk_index"),
                name="chat_persona_document_persona_chunk_uniq",
            ),
        ]


class Conversation(models.Model):
    persona_key = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation with {self.persona_key}"


class ChatMessage(models.Model):
    ROLE_CHOICES = [("user", "User"), ("assistant", "Assistant")]

    conversation = models.ForeignKey(
        Conversation, related_name="messages", on_delete=models.CASCADE
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
