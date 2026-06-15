import os
from pathlib import Path

# Directories
BASE_DIR = Path(__file__).resolve().parent.parent

# Config variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
SLIDE_TEMPLATES_DIR = os.getenv(
    "SLIDE_TEMPLATES_DIR", str(BASE_DIR / "app" / "services" / "templates")
)
SLIDE_LIBRARY_DIR = os.getenv("SLIDE_LIBRARY_DIR", "")

STORAGE_DIR = Path(os.getenv("SLIDE_STORAGE_DIR", str(BASE_DIR / "storage")))
STORAGE_DIR.mkdir(exist_ok=True, parents=True)
