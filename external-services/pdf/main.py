from fastapi import FastAPI, UploadFile, File, HTTPException
from markitdown import MarkItDown
import os
import shutil
import tempfile

app = FastAPI(title="MarkItDown API Service")
md = MarkItDown()

@app.get("/")
async def root():
    return {"message": "MarkItDown API Service is running. Use POST /markitdown to convert files."}

@app.post("/")
@app.post("/markitdown")
@app.post("/markitdown/")
async def convert_pdf_to_markdown(file: UploadFile = File(...)):
    print(f"Received request to convert: {file.filename}")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Create a temporary file to store the uploaded PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        shutil.copyfileobj(file.file, temp_pdf)
        temp_pdf_path = temp_pdf.name

    try:
        # Convert PDF to Markdown
        result = md.convert(temp_pdf_path)
        return {"markdown": result.text_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
