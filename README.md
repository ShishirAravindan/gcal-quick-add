# gCal Quick Add

## Motivation
Todoist has this very intuitive text interface. It's easy to use and allows you to create tasks, set reminders, assign projects, and track progress. I am going to call this **"smart parsing"**.
I want to emulate this same functionality for creating gCal events from text input.

The current process is to build two modules:
- **`text-to-dictionary` module**
    - Which parses the text input and converts it into a standardized data format
- **`dictionary-to-response` module**
    - current objective: pre-fill the calendar event instead of actually creating one
    - should be a pre-fill instead of a publish event
        - will need to look at gCal API to see how to achieve this


Thoughts on the interface:
- Omni-text box (basically as close to the todoist input interface) 
- iFrame below displaying the calendar


## Tech Stack
### Backend: FastAPI (Python)
- Reasoning: FastAPI is a modern, high-performance web framework that provides excellent support for Python's asynchronous capabilities. It is ideal for building APIs, especially when interacting with external services like the Google Calendar API. FastAPI’s automatic validation and documentation generation make it a robust choice for scalability and ease of maintenance.
- Features:
    - Asynchronous processing for better performance
    - Type hinting for improved code clarity and validation
    - Fast development with minimal setup
### Frontend: Vanilla JavaScript
- Reasoning: For now, Vanilla JavaScript provides a lightweight and straightforward approach to building the user interface, without the overhead of frameworks like React or Svelte. Since the frontend’s initial scope is relatively simple (an input box and an iFrame for Google Calendar), Vanilla JS will suffice for managing DOM interactions and making API calls.
- Features:
    - Lightweight, minimal dependencies
    - Direct control over the DOM
    - Flexibility to integrate a framework later, if necessary