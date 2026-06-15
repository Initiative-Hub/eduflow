import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Union
from fastapi.concurrency import run_in_threadpool
import slide_skills  # type: ignore
from app.deps import SLIDE_TEMPLATES_DIR


class SlideService:
    async def get_categories(self) -> List[Dict[str, Any]]:
        library = await run_in_threadpool(
            slide_skills.scan_template_library, SLIDE_TEMPLATES_DIR
        )
        return library.category_map()

    async def get_collections(self) -> List[Dict[str, Any]]:
        return await run_in_threadpool(
            slide_skills.list_collections, SLIDE_TEMPLATES_DIR
        )

    async def generate_deck(
        self,
        topic: str,
        collection: str,
        output_path: Union[str, Path],
        palette: Union[str, tuple, None] = "auto",
        language: str | None = None,
        animation: str = "rise",
    ) -> Dict[str, Any]:
        return await run_in_threadpool(
            slide_skills.generate_web_deck,
            collection,
            topic,
            output_path,
            palette=palette,
            language=language,
            animation=animation,
            base_dir=SLIDE_TEMPLATES_DIR,
        )

    async def generate_deck_from_plan(
        self,
        plan: Union[list, dict],
        output_path: Union[str, Path],
        palette: Union[str, tuple, None] = "auto",
        language: str | None = None,
        animation: str = "rise",
        title: str | None = None,
    ) -> Dict[str, Any]:
        return await run_in_threadpool(
            slide_skills.generate_deck_from_plan,
            plan,
            SLIDE_TEMPLATES_DIR,
            output_path,
            palette=palette,
            language=language,
            animation=animation,
            title=title,
        )

    async def import_template_collection(
        self, file_bytes: bytes, filename: str, name: str | None = None
    ) -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            if filename.lower().endswith(".zip"):
                zip_path = temp_path / "upload.zip"
                zip_path.write_bytes(file_bytes)

                extract_path = temp_path / "extracted"
                extract_path.mkdir()

                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(extract_path)

                # If there is a nested folder, use it
                subdirs = [x for x in extract_path.iterdir() if x.is_dir()]
                src_path = subdirs[0] if len(subdirs) == 1 else extract_path
            else:
                svg_path = temp_path / filename
                svg_path.write_bytes(file_bytes)
                src_path = svg_path

            return await run_in_threadpool(
                slide_skills.import_collection,
                src_path,
                name,
                base_dir=SLIDE_TEMPLATES_DIR,
                overwrite=True,
            )
