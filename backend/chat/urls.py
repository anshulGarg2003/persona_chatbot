from django.urls import path
from .views import (
    chat_view,
    clear_conversation_view,
    conversation_view,
    delete_persona_view,
    personas_view,
    upload_persona_view,
)

urlpatterns = [
    path("chat/", chat_view, name="chat"),
    path("conversations/<str:persona_key>/", conversation_view, name="conversation"),
    path("conversations/<str:persona_key>/clear/", clear_conversation_view, name="clear_conversation"),
    path("personas/", personas_view, name="personas"),
    path("personas/upload/", upload_persona_view, name="upload_persona"),
    path("personas/<str:persona_id>/", delete_persona_view, name="delete_persona"),
]
   