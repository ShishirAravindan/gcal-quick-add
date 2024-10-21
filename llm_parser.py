from langchain_ollama.llms import OllamaLLM
from langchain.prompts import PromptTemplate
from models import EventOutput

def get_prompt_template_from_file(filepath: str) -> str:
    """read the prompt from a text file"""
    with open(filepath, "r") as file:
        return file.read()

def setup_llm_chain(prompt_file: str):
    prompt_template = get_prompt_template_from_file(prompt_file)
    
    prompt = PromptTemplate(
        input_variables=["text"],
        template=prompt_template
    )

    llm = OllamaLLM(model="llama3.1")

    llm_chain = prompt | llm    
    return llm_chain

def call_llm(text: str, prompt_file: str):
    """call the LLM and parse event data"""
    chain = setup_llm_chain(prompt_file)
    print("LLM call running")
    response = chain.invoke({"text": text})
    print(f"LLM response: \n {response}")

    try:
        response_dict = eval(response)  # Assumes the LLM returns valid JSON-like structure
        event_output = EventOutput(
            title=response_dict.get("title", "Untitled Event"),
            date=response_dict.get("date", None),
            time=response_dict.get("time", None),
            location=response_dict.get("location", None),
            description=response_dict.get("description", None)
        )
        return event_output
    except Exception as e:
        raise ValueError(f"LLM output parsing failed: {e}")
    

if __name__ == "__main__":
    call_llm("Meeting with John on 2024-10-25 at 2:00 PM at the Office.", 
             "prompt.txt")
