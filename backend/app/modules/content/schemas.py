"""Response bodies for the content routes."""

from pydantic import BaseModel


class ContentCounts(BaseModel):
    # Flashcards (qa and concept) made from the lecture's files.
    flashcards: int
