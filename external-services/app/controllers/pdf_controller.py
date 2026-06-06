from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.pdf_service import PDFService

router = APIRouter()
pdf_service = PDFService()


@router.post("/markitdown")
async def convert_pdf_to_markdown(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        pdf_bytes = await file.read()
        markdown = await pdf_service.convert_pdf(pdf_bytes, filename)
        return {"markdown": markdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        await file.close()
