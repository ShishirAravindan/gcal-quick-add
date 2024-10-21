from pydantic import BaseModel

class EventInput(BaseModel):
    text: str

class EventOutput(BaseModel):
    title: str
    date: str
    time: str
    location: str = None
    description: str = None