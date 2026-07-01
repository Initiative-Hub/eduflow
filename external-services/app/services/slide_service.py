import logging
import shutil
import tempfile
import textwrap
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Union
from fastapi.concurrency import run_in_threadpool
import slide_skills  # type: ignore
import slide_skills.svg_categories  # type: ignore
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
        collections = await run_in_threadpool(
            slide_skills.list_collections, SLIDE_TEMPLATES_DIR
        )
        categories = {
            "title_slide",
            "agenda_outline",
            "section_header",
            "title_bullets",
            "two_column_split",
            "big_quote_takeaway",
            "kpi_big_number",
            "chart_insight",
            "data_table",
            "media_text",
            "timeline_milestones",
            "step_by_step",
            "conclusion_summary",
            "call_to_action",
            "qa_contact",
            "references_list",
            "image_gallery",
            "kpi_big_numbers",
        }
        local_collections = [c for c in collections if c["name"].lower() not in categories]
        seen_names = {c["name"].lower() for c in local_collections}

        # Also discover custom collections uploaded to S3
        try:
            from app.deps import AWS_S3_TEMPLATES_BUCKET
            from app.services.s3_service import list_files_in_s3_prefix

            s3_keys = await list_files_in_s3_prefix(
                "templates/", bucket_name=AWS_S3_TEMPLATES_BUCKET
            )
            # Keys look like "templates/<collection>/<file>.svg"
            s3_collection_names: set[str] = set()
            for key in s3_keys:
                parts = key.split("/")
                if len(parts) >= 3 and parts[0] == "templates" and parts[1]:
                    s3_collection_names.add(parts[1])

            for name in sorted(s3_collection_names):
                if name.lower() not in seen_names and name.lower() not in categories:
                    local_collections.append(
                        {"name": name, "description": f"Custom collection (stored in S3)"}
                    )
                    seen_names.add(name.lower())
        except Exception as e:
            logger.warning(f"Could not list S3 template collections: {e}")

        return local_collections

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

        if (
            collection
            and collection != "starter"
            and collection != "neon_dark"
            and collection != "templates"
        ):
            from app.deps import AWS_S3_TEMPLATES_BUCKET
            from app.services.s3_service import (
                list_files_in_s3_prefix,
                download_file_from_s3,
            )

            s3_prefix = f"templates/{collection}/"
            s3_keys = await list_files_in_s3_prefix(
                s3_prefix, bucket_name=AWS_S3_TEMPLATES_BUCKET
            )
            if s3_keys:
                logger.info(
                    f"Downloading custom template collection '{collection}' from S3..."
                )
                col_path = Path(SLIDE_TEMPLATES_DIR) / collection
                col_path.mkdir(parents=True, exist_ok=True)
                for key in s3_keys:
                    # key looks like "templates/<collection>/[SUBDIR/]filename"
                    # Preserve the subdirectory structure relative to the collection root
                    relative = key[len(s3_prefix):]  # e.g. "TITLE_SLIDE/standard.svg"
                    if not relative:
                        continue
                    dest = col_path / relative
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    await download_file_from_s3(
                        key,
                        dest,
                        bucket_name=AWS_S3_TEMPLATES_BUCKET,
                    )

            collection_path = Path(SLIDE_TEMPLATES_DIR) / collection
            if collection_path.exists() and collection_path.is_dir():
                # Detect format: new extract_template_smart collections have
                # category subdirectories (TITLE_SLIDE/, AGENDA_OUTLINE/, etc.)
                # while legacy imports store flat SVG files at the root.
                has_category_subdirs = any(
                    child.is_dir() for child in collection_path.iterdir()
                )

                if has_category_subdirs:
                    # New format — the collection dir IS a valid library_dir,
                    # so pass it directly without any manual remapping.
                    library_dir = str(collection_path)
                    logger.info(
                        f"Using new-format collection '{collection}' directly as library_dir"
                    )
                else:
                    # Legacy flat SVG format — map files to category dirs manually
                    import json

                    temp_dir_context = tempfile.TemporaryDirectory()
                    temp_lib_dir = Path(temp_dir_context.name)

                    categories_to_map = [
                        "TITLE_SLIDE",
                        "AGENDA_OUTLINE",
                        "SECTION_HEADER",
                        "TITLE_BULLETS",
                        "TWO_COLUMN_SPLIT",
                        "BIG_QUOTE_TAKEAWAY",
                        "KPI_BIG_NUMBER",
                        "CHART_INSIGHT",
                        "DATA_TABLE",
                        "MEDIA_TEXT",
                        "TIMELINE_MILESTONES",
                        "STEP_BY_STEP",
                        "CONCLUSION_SUMMARY",
                        "CALL_TO_ACTION",
                        "QA_CONTACT",
                        "REFERENCES_LIST",
                    ]

                    patterns = {
                        "TITLE_SLIDE": ["title", "slide_00", "slide_title"],
                        "AGENDA_OUTLINE": ["agenda", "outline", "slide_01"],
                        "SECTION_HEADER": ["section", "header", "divider"],
                        "TITLE_BULLETS": [
                            "bullets",
                            "bullet",
                            "list",
                            "slide_02",
                            "slide_03",
                            "slide_04",
                        ],
                        "TWO_COLUMN_SPLIT": [
                            "two_column",
                            "two_col",
                            "split",
                            "columns",
                            "comparison",
                        ],
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

                    for idx, cat in enumerate(categories_to_map):
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
                                if (
                                    cat.lower() in stem_lower
                                    or cat.replace("_", "").lower() in stem_lower
                                ):
                                    matched_file = svg_file
                                    break

                        # Cycle through custom SVGs so style stays consistent
                        if not matched_file and svg_files:
                            matched_file = svg_files[idx % len(svg_files)]

                        if matched_file:
                            shutil.copy2(matched_file, cat_dir / "variant_a.svg")
                            schema_json = matched_file.with_suffix(".schema.json")
                            if schema_json.exists():
                                shutil.copy2(schema_json, cat_dir / "variant_a.schema.json")

                        (cat_dir / "category.json").write_text(
                            json.dumps(
                                {
                                    "description": f"{cat} category layout",
                                    "variants": {"variant_a": "Default design"},
                                },
                                ensure_ascii=False,
                            )
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
            # Remove the S3-downloaded collection from local disk after use
            if (
                collection
                and collection not in ("starter", "neon_dark", "templates")
            ):
                col_path = Path(SLIDE_TEMPLATES_DIR) / collection
                if col_path.exists() and col_path.is_dir():
                    shutil.rmtree(col_path, ignore_errors=True)
                    logger.info(
                        f"Cleaned up downloaded S3 collection '{collection}' after generation"
                    )

        return res

    async def import_template_collection(
        self, file_bytes: bytes, filename: str, name: str | None = None
    ) -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            collection_name = name or Path(filename).stem

            if filename.lower().endswith(".pptx"):
                # Use the new 0.2.27 extract_template_smart for PPTX files —
                # it maps slides to categories via AI and writes proper
                # CATEGORY/standard.svg structure directly into library_dir.
                pptx_path = temp_path / filename
                pptx_path.write_bytes(file_bytes)

                res = await run_in_threadpool(
                    slide_skills.extract_template_smart,
                    str(pptx_path),
                    collection_name,
                    library_dir=SLIDE_TEMPLATES_DIR,
                    use_ai=True,
                )

            elif filename.lower().endswith(".zip"):
                zip_path = temp_path / "upload.zip"
                zip_path.write_bytes(file_bytes)

                extract_path = temp_path / "extracted"
                extract_path.mkdir()

                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(extract_path)

                # If there is a nested folder, use it
                subdirs = [x for x in extract_path.iterdir() if x.is_dir()]
                src_path = subdirs[0] if len(subdirs) == 1 else extract_path

                res = await run_in_threadpool(
                    slide_skills.import_collection,
                    src_path,
                    collection_name,
                    base_dir=SLIDE_TEMPLATES_DIR,
                    overwrite=True,
                )

            else:
                svg_path = temp_path / filename
                svg_path.write_bytes(file_bytes)

                res = await run_in_threadpool(
                    slide_skills.import_collection,
                    svg_path,
                    collection_name,
                    base_dir=SLIDE_TEMPLATES_DIR,
                    overwrite=True,
                )

            # Upload the imported templates to S3 bucket then remove local copy.
            # extract_template_smart writes to <collection_name>_template/ while
            # import_collection writes to <collection_name>/. Detect which was used.
            from app.deps import AWS_S3_TEMPLATES_BUCKET
            from app.services.s3_service import upload_file_to_s3

            dest_dir = Path(SLIDE_TEMPLATES_DIR) / collection_name
            # Check for the _template suffix variant produced by extract_template_smart
            dest_dir_with_suffix = Path(SLIDE_TEMPLATES_DIR) / f"{collection_name}_template"
            if not dest_dir.exists() and dest_dir_with_suffix.exists():
                dest_dir = dest_dir_with_suffix

            if dest_dir.exists() and dest_dir.is_dir():

                async def upload_dir_to_s3(directory: Path, prefix: str):
                    for child in directory.iterdir():
                        if child.is_file():
                            await upload_file_to_s3(
                                child,
                                f"{prefix}/{child.name}",
                                bucket_name=AWS_S3_TEMPLATES_BUCKET,
                            )
                        elif child.is_dir():
                            await upload_dir_to_s3(child, f"{prefix}/{child.name}")

                # Always use collection_name (without _template) as the S3 prefix
                # so get_collections and generate_deck_from_plan can find it consistently
                await upload_dir_to_s3(dest_dir, f"templates/{collection_name}")

                # Remove local files after successful S3 upload
                shutil.rmtree(dest_dir, ignore_errors=True)
                logger.info(
                    f"Removed local template collection '{dest_dir.name}' after S3 upload"
                )

            return res

    async def generate_pptx(self, deck_id: str) -> Path:
        import io
        import re
        import traceback
        from pptx import Presentation
        from pptx.util import Emu
        import resvg_py
        from app.deps import STORAGE_DIR
        from app.services.s3_service import download_file_from_s3

        # Always fetch latest HTML from S3 to make sure we have visual edits
        s3_key = f"slides/{deck_id}.html"
        local_html_path = STORAGE_DIR / f"{deck_id}_latest.html"

        # Try downloading from S3
        downloaded = await download_file_from_s3(s3_key, local_html_path)
        if not downloaded:
            # Fallback: check if we have the original HTML locally
            local_html_path = STORAGE_DIR / f"{deck_id}.html"
            if not local_html_path.exists():
                raise ValueError("Deck file not found")

        try:
            html_content = local_html_path.read_text(encoding="utf-8")
        except Exception as e:
            traceback.print_exc()
            raise RuntimeError(f"Failed to read deck HTML: {str(e)}")

        # Extract all SVG markup
        svgs = re.findall(r"(<svg[^>]*>.*?</svg>)", html_content, re.DOTALL)
        if not svgs:
            raise ValueError("No SVG slides found in deck")

        # Generate PPTX in a specific output path
        pptx_path = STORAGE_DIR / f"{deck_id}.pptx"
        try:
            prs = Presentation()
            # Set 16:9 aspect ratio
            prs.slide_width = Emu(int(12192000))  # 13.33 in
            prs.slide_height = Emu(int(12192000 * 9 / 16))  # 7.5 in
            blank_layout = prs.slide_layouts[6]  # Blank slide layout

            for idx, svg_markup in enumerate(svgs):
                # Escape bare ampersands to prevent XML parsing errors in resvg-py
                clean_svg = re.sub(
                    r"&(?!(?:[a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)",
                    "&amp;",
                    svg_markup,
                )
                png_bytes = bytes(
                    resvg_py.svg_to_bytes(svg_string=clean_svg, width=1920)
                )
                slide = prs.slides.add_slide(blank_layout)
                slide.shapes.add_picture(
                    io.BytesIO(png_bytes), 0, 0, prs.slide_width, prs.slide_height
                )

            prs.save(str(pptx_path))
        except Exception as e:
            traceback.print_exc()
            raise RuntimeError(f"Failed to assemble PPTX: {str(e)}")

        return pptx_path
