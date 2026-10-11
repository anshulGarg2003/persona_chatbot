from django.db import migrations


class Migration(migrations.Migration):
    """Drop the legacy image column left by an earlier database schema."""

    dependencies = [
        ("chat", "0004_chatmessage_sources"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE chat_chatmessage DROP COLUMN IF EXISTS image_data",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]


