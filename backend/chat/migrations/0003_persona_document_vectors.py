from django.db import migrations, models
from pgvector.django import VectorField


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0002_conversation_chatmessage"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.CreateModel(
            name="PersonaDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("persona_id", models.CharField(max_length=100)),
                ("chunk_index", models.IntegerField()),
                ("content", models.TextField()),
                ("embedding", VectorField(dimensions=1536)),
            ],
            options={
                "db_table": "chat_persona_document",
                "constraints": [
                    models.UniqueConstraint(
                        fields=("persona_id", "chunk_index"),
                        name="chat_persona_document_persona_chunk_uniq",
                    ),
                ],
            },
        ),
    ]
