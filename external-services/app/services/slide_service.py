import logging
import tempfile
import textwrap
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Union
from fastapi.concurrency import run_in_threadpool
import slide_skills  # type: ignore
import slide_skills.svg_categories
from app.deps import SLIDE_TEMPLATES_DIR

logger = logging.getLogger(__name__)

# Monkeypatch select_and_fill_slide to enforce outline bindings
_orig_select_and_fill_slide = slide_skills.svg_categories.select_and_fill_slide

def custom_select_and_fill_slide(variants, slide_content, **kwargs):
    res = _orig_select_and_fill_slide(variants, slide_content, **kwargs)
    if not res:
        return res
    
    variant = res.get("variant")
    texts = res.get("texts") or {}
    
    # Overwrite LLM-generated values with input bindings if they exist
    input_bindings = slide_content.get("bindings") or {}
    for key in variant.placeholders:
        if key in input_bindings:
            texts[key] = input_bindings[key]
            
    res["texts"] = texts
    return res

slide_skills.svg_categories.select_and_fill_slide = custom_select_and_fill_slide


def flatten_slide_bindings(category: str, slide_title: str, bindings: dict) -> dict:
    flat = bindings.copy()

    # Always ensure slide title is mapped to heading for SVG template consistency
    if slide_title:
        flat["heading"] = slide_title

    # 1. Flatten AGENDA_OUTLINE: items -> items.1, items.2, etc.
    if "items" in bindings and isinstance(bindings["items"], list):
        for idx, item in enumerate(bindings["items"][:5], 1):
            flat[f"items.{idx}"] = str(item)
            flat[f"item_{idx}"] = str(item)

    # 2. Flatten TITLE_BULLETS: bullets -> bullets.1, bullets.2, etc.
    if "bullets" in bindings and isinstance(bindings["bullets"], list):
        for idx, item in enumerate(bindings["bullets"][:5], 1):
            flat[f"bullets.{idx}"] = str(item)
            flat[f"bullet_{idx}"] = str(item)

    # 3. Flatten TWO_COLUMN_SPLIT: left_col_text and right_col_text arrays
    if "left_col_text" in bindings and isinstance(bindings["left_col_text"], list):
        for idx, item in enumerate(bindings["left_col_text"][:5], 1):
            flat[f"left_col_text.{idx}"] = str(item)
    if "right_col_text" in bindings and isinstance(bindings["right_col_text"], list):
        for idx, item in enumerate(bindings["right_col_text"][:5], 1):
            flat[f"right_col_text.{idx}"] = str(item)

    # 4. Flatten BIG_QUOTE_TAKEAWAY: quote textwrap
    if "quote" in bindings and isinstance(bindings["quote"], str):
        wrapped = textwrap.wrap(bindings["quote"], width=50)
        for idx, line in enumerate(wrapped[:3], 1):
            flat[f"quote.{idx}"] = line

    # 5. Flatten KPI_BIG_NUMBER: metrics -> stat_1, label_1, etc.
    if "metrics" in bindings and isinstance(bindings["metrics"], list):
        for idx, metric in enumerate(bindings["metrics"][:3], 1):
            if isinstance(metric, dict):
                flat[f"stat_{idx}"] = str(metric.get("value", ""))
                flat[f"label_{idx}"] = str(metric.get("label", ""))

    # 6. Flatten CHART_INSIGHT: chart_data & insight_text wrap
    if "chart_data" in bindings and isinstance(bindings["chart_data"], list):
        for idx, data_point in enumerate(bindings["chart_data"][:4], 1):
            if isinstance(data_point, dict):
                flat[f"chart_label_{idx}"] = str(data_point.get("label", ""))
                flat[f"chart_value_{idx}"] = str(data_point.get("value", ""))
    if "insight_text" in bindings and isinstance(bindings["insight_text"], str):
        wrapped = textwrap.wrap(bindings["insight_text"], width=45)
        for idx, line in enumerate(wrapped[:3], 1):
            flat[f"insight_text.{idx}"] = line

    # 7. Flatten DATA_TABLE: headers & rows
    if "headers" in bindings and isinstance(bindings["headers"], list):
        for idx, header in enumerate(bindings["headers"][:4], 1):
            flat[f"header_{idx}"] = str(header)
    if "rows" in bindings and isinstance(bindings["rows"], list):
        for r_idx, row in enumerate(bindings["rows"][:3], 1):
            if isinstance(row, list):
                for c_idx, val in enumerate(row[:4], 1):
                    flat[f"row_{r_idx}_{c_idx}"] = str(val)

    # 8. Flatten TIMELINE_MILESTONES: events date & desc wrap
    if "events" in bindings and isinstance(bindings["events"], list):
        for idx, ev in enumerate(bindings["events"][:4], 1):
            if isinstance(ev, dict):
                flat[f"date_{idx}"] = str(
                    ev.get("date_or_step", "") or ev.get("date", "")
                )
                desc = str(ev.get("description", ""))
                wrapped = textwrap.wrap(desc, width=25)
                for line_idx, line in enumerate(wrapped[:2], 1):
                    flat[f"desc_{idx}.{line_idx}"] = line

    # 9. Flatten STEP_BY_STEP: steps -> step_1, step_2, etc.
    if "steps" in bindings and isinstance(bindings["steps"], list):
        for idx, step in enumerate(bindings["steps"][:4], 1):
            flat[f"step_{idx}"] = str(step)

    # 10. Flatten CONCLUSION_SUMMARY: summary_points -> summary_points.1, etc.
    if "summary_points" in bindings and isinstance(bindings["summary_points"], list):
        for idx, pt in enumerate(bindings["summary_points"][:4], 1):
            flat[f"summary_points.{idx}"] = str(pt)

    # 11. Flatten CALL_TO_ACTION: action_items -> action_items.1, etc.
    if "action_items" in bindings and isinstance(bindings["action_items"], list):
        for idx, item in enumerate(bindings["action_items"][:4], 1):
            flat[f"action_items.{idx}"] = str(item)

    # 12. Flatten QA_CONTACT: footer_note
    if "footer_note" in bindings and isinstance(bindings["footer_note"], str):
        wrapped = textwrap.wrap(bindings["footer_note"], width=50)
        for idx, line in enumerate(wrapped[:2], 1):
            flat[f"footer_note.{idx}"] = line

    # 13. Flatten REFERENCES_LIST: sources -> source_title_1, source_url_1
    if "sources" in bindings and isinstance(bindings["sources"], list):
        for idx, src in enumerate(bindings["sources"][:3], 1):
            if isinstance(src, dict):
                flat[f"source_title_{idx}"] = str(src.get("title", ""))
                flat[f"source_url_{idx}"] = str(src.get("url", ""))

    return flat


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
        images: bool = True,
        image_source: str = "ai",
        collection: str | None = None,
    ) -> Dict[str, Any]:
        slides_list = []
        if isinstance(plan, dict):
            slides_list = plan.get("slides", [])
        elif isinstance(plan, list):
            slides_list = plan

        for slide in slides_list:
            bindings = slide.get("bindings") or {}
            category = slide.get("category") or slide.get("layoutType") or ""
            slide_title = slide.get("slideTitle") or ""

            # Ensure category field is populated for slide_skills resolver
            slide["category"] = category

            # Flatten bindings to map to flat SVG placeholders
            bindings = flatten_slide_bindings(category, slide_title, bindings)

            if "body_text" in bindings and isinstance(bindings["body_text"], str):
                bindings["body_text"] = textwrap.wrap(bindings["body_text"], width=50)

            slide["bindings"] = bindings

        library_dir = SLIDE_TEMPLATES_DIR
        temp_dir_context = None

        if collection and collection != "starter" and collection != "templates":
            collection_path = Path(SLIDE_TEMPLATES_DIR) / collection
            if collection_path.exists() and collection_path.is_dir():
                import tempfile
                import shutil
                import json

                temp_dir_context = tempfile.TemporaryDirectory()
                temp_lib_dir = Path(temp_dir_context.name)

                categories_to_map = [
                    "TITLE_SLIDE", "AGENDA_OUTLINE", "SECTION_HEADER", "TITLE_BULLETS",
                    "TWO_COLUMN_SPLIT", "BIG_QUOTE_TAKEAWAY", "KPI_BIG_NUMBER", "CHART_INSIGHT",
                    "DATA_TABLE", "MEDIA_TEXT", "TIMELINE_MILESTONES", "STEP_BY_STEP",
                    "CONCLUSION_SUMMARY", "CALL_TO_ACTION", "QA_CONTACT", "REFERENCES_LIST"
                ]

                patterns = {
                    "TITLE_SLIDE": ["title", "slide_00", "slide_title"],
                    "AGENDA_OUTLINE": ["agenda", "outline", "slide_01"],
                    "SECTION_HEADER": ["section", "header", "divider"],
                    "TITLE_BULLETS": ["bullets", "bullet", "list", "slide_02", "slide_03", "slide_04"],
                    "TWO_COLUMN_SPLIT": ["two_column", "two_col", "split", "columns", "comparison"],
                    "BIG_QUOTE_TAKEAWAY": ["quote", "takeaway", "saying", "citation"],
                    "KPI_BIG_NUMBER": ["kpi", "statistic", "number", "metrics"],
                    "CHART_INSIGHT": ["chart", "insight", "graph", "visualization"],
                    "DATA_TABLE": ["table", "data", "grid"],
                    "MEDIA_TEXT": ["media", "image", "photo", "picture"],
                    "TIMELINE_MILESTONES": ["timeline", "milestones", "history"],
                    "STEP_BY_STEP": ["step", "process", "flow", "stages"],
                    "CONCLUSION_SUMMARY": ["conclusion", "summary", "closing"],
                    "CALL_TO_ACTION": ["cta", "action", "signup"],
                    "QA_CONTACT": ["qa", "contact", "questions", "social"],
                    "REFERENCES_LIST": ["reference", "sources", "citations"],
                }

                svg_files = list(collection_path.glob("*.svg"))

                for cat in categories_to_map:
                    cat_dir = temp_lib_dir / cat
                    cat_dir.mkdir(parents=True, exist_ok=True)

                    matched_file = None
                    candidates = patterns.get(cat, [])
                    for svg_file in svg_files:
                        stem_lower = svg_file.stem.lower()
                        for cand in candidates:
                            if cand in stem_lower:
                                matched_file = svg_file
                                break
                        if matched_file:
                            break

                    if not matched_file:
                        for svg_file in svg_files:
                            stem_lower = svg_file.stem.lower()
                            if cat.lower() in stem_lower or cat.replace("_", "").lower() in stem_lower:
                                matched_file = svg_file
                                break

                    if matched_file:
                        shutil.copy2(matched_file, cat_dir / "variant_a.svg")
                        schema_json = matched_file.with_suffix(".schema.json")
                        if schema_json.exists():
                            shutil.copy2(schema_json, cat_dir / "variant_a.schema.json")
                    else:
                        default_cat_dir = Path(SLIDE_TEMPLATES_DIR) / cat
                        if default_cat_dir.exists() and default_cat_dir.is_dir():
                            default_files = list(default_cat_dir.glob("*.svg"))
                            if default_files:
                                shutil.copy2(default_files[0], cat_dir / "variant_a.svg")

                    (cat_dir / "category.json").write_text(
                        json.dumps({"description": f"{cat} category layout", "variants": {"variant_a": "Default design"}}, ensure_ascii=False)
                    )

                library_dir = str(temp_lib_dir)

        try:
            actual_palette = None if palette == "auto" else palette
            res = await run_in_threadpool(
                slide_skills.generate_deck_from_plan,
                plan,
                library_dir,
                output_path,
                palette=actual_palette,
                language=language,
                animation=animation,
                images=images,
                image_source=image_source,
                title=title,
                research=True,
            )
        finally:
            if temp_dir_context:
                try:
                    temp_dir_context.cleanup()
                except Exception:
                    pass

        return res

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
            elif filename.lower().endswith(".pptx"):
                pptx_path = temp_path / filename
                pptx_path.write_bytes(file_bytes)
                out_dir = temp_path / "converted"
                out_dir.mkdir()
                
                await run_in_threadpool(
                    slide_skills.make_svg_templates,
                    str(pptx_path),
                    str(out_dir),
                )
                src_path = out_dir
            else:
                svg_path = temp_path / filename
                svg_path.write_bytes(file_bytes)
                src_path = svg_path

            collection_name = name or Path(filename).stem
            res = await run_in_threadpool(
                slide_skills.import_collection,
                src_path,
                collection_name,
                base_dir=SLIDE_TEMPLATES_DIR,
                overwrite=True,
            )

            # Upload the imported templates to S3 bucket
            from app.services.s3_service import upload_file_to_s3
            dest_dir = Path(SLIDE_TEMPLATES_DIR) / collection_name
            if dest_dir.exists() and dest_dir.is_dir():
                async def upload_dir_to_s3(directory: Path, prefix: str):
                    for child in directory.iterdir():
                        if child.is_file():
                            await upload_file_to_s3(child, f"{prefix}/{child.name}")
                        elif child.is_dir():
                            await upload_dir_to_s3(child, f"{prefix}/{child.name}")
                
                await upload_dir_to_s3(dest_dir, f"templates/{collection_name}")

            return res
