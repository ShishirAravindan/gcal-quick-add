from fastapi import FastAPI, HTTPException
from models import EventInput, EventOutput
from llm_parser import call_llm

app = FastAPI()

PROMPT_FILE_PATH = "prompt.txt"

@app.post("/parse-text", response_model=EventOutput)
async def parse_text(input: EventInput):
    try:
        parsed_data = call_llm(input.text, PROMPT_FILE_PATH)
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing text: {e}")
