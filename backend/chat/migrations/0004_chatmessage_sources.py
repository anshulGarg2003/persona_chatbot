from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0003_persona_document_vectors"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatmessage",
            name="sources",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
