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
from app.schemas.slide_schema import RenderSlideReq

logger = logging.getLogger(__name__)

DEFAULT_COLLECTIONS = {
    "templates",
    "default",
    "starter",
    "neon_dark",
    "vintage",
    "clean_light",
    "pastel_pop",
    "illustrative_culture",
    "minimalist_gradient",
    "cultural_folk",
    "organic_streets",
    "electric_green_white",
    "green_environment_care",
    "rmit_red_modern",
    "startup_neon_pitch",
}

STANDARD_LAYOUT_TYPES = [
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
    "STATEMENT_IMAGE",
    "PYRAMID_LEVELS",
    "FUNNEL_STAGES",
    "PROCESS_ARROWS",
    "CIRCLE_CYCLE",
]

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

# --- style-aware image prompts -------------------------------------------------
# Generated images should match the collection's illustration style. The active
# collection's collection.json may define "image_style"; we set it here before
# generation and append it to every image prompt. If the planner supplied an
# explicit image_prompt_description binding, that takes precedence over the
# content-derived prompt.
_ACTIVE_IMAGE_STYLE: dict = {"hint": ""}
_orig_image_prompt = slide_skills.svg_categories._image_prompt


def _styled_image_prompt(slide, name, texts=None):
    bindings = (slide or {}).get("bindings") or {}
    desc = bindings.get("image_prompt_description")
    base = (
        f"A clear illustration of: {desc}. No text, no words, no letters."
        if isinstance(desc, str) and desc.strip()
        else _orig_image_prompt(slide, name, texts)
    )
    hint = _ACTIVE_IMAGE_STYLE.get("hint") or ""
    return f"{base} Art style: {hint}." if hint else base


slide_skills.svg_categories._image_prompt = _styled_image_prompt


def _set_image_style_for(library_dir) -> None:
    """Load the collection's image_style hint (if any) for prompt styling."""
    import json as _json

    _ACTIVE_IMAGE_STYLE["hint"] = ""
    try:
        meta = Path(library_dir) / "collection.json"
        if meta.exists():
            _ACTIVE_IMAGE_STYLE["hint"] = str(
                _json.loads(meta.read_text(encoding="utf-8")).get("image_style", "")
            )
    except Exception:
        pass


def flatten_slide_bindings(category: str, slide_title: str, bindings: dict) -> dict:
    flat = bindings.copy()

    # Always ensure slide title is mapped to heading for SVG template consistency
    if slide_title:
        flat["heading"] = slide_title
        # Multi-line heading for templates with a narrow heading panel
        # (e.g. TITLE_BULLETS/split_panel uses {{heading.1..3}}). Wrap so a
        # long title breaks across lines instead of overflowing. Widen until
        # the whole title fits in 3 lines (never drop words); fit_text_to_boxes
        # then shrinks any line still wider than the panel.
        wrap_width = max(16, -(-len(slide_title) // 3))  # ceil(len/3), min 16
        lines = textwrap.wrap(slide_title, width=wrap_width)
        while len(lines) > 3:
            wrap_width += 2
            lines = textwrap.wrap(slide_title, width=wrap_width)
        for idx, line in enumerate(lines, 1):
            flat[f"heading.{idx}"] = line

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
        for idx, src in enumerate(bindings["sources"][:4], 1):
            if isinstance(src, dict):
                flat[f"source_title_{idx}"] = str(src.get("title", ""))
                flat[f"source_url_{idx}"] = str(src.get("url", ""))

    # 13b. Flatten STATEMENT_IMAGE: statement -> statement.1..3 script lines
    if "statement" in bindings and isinstance(bindings["statement"], str):
        s_width = max(20, -(-len(bindings["statement"]) // 3))
        s_lines = textwrap.wrap(bindings["statement"], width=s_width)
        while len(s_lines) > 3:
            s_width += 2
            s_lines = textwrap.wrap(bindings["statement"], width=s_width)
        for idx, line in enumerate(s_lines, 1):
            flat[f"statement.{idx}"] = line

    # 14. Flatten diagram families (PYRAMID_LEVELS / FUNNEL_STAGES /
    #     PROCESS_ARROWS / CIRCLE_CYCLE): Array<{title, description}>
    #     -> title_1/desc_1 ... The per-count variants (tiers_3..5, stages_3..5,
    #     steps_3..5, phases_4..6) all use these same placeholder names, so one
    #     flattener covers every size.
    for diagram_key in ("levels", "stages", "process_steps", "phases"):
        if diagram_key in bindings and isinstance(bindings[diagram_key], list):
            for idx, item in enumerate(bindings[diagram_key][:6], 1):
                if isinstance(item, dict):
                    flat[f"title_{idx}"] = str(item.get("title", ""))
                    desc = str(item.get("description", ""))
                    flat[f"desc_{idx}"] = desc
                    # PROCESS_ARROWS descriptions are 2 short centered lines
                    wrapped = textwrap.wrap(desc, width=26)
                    for line_idx, line in enumerate(wrapped[:2], 1):
                        flat[f"desc_{idx}.{line_idx}"] = line
            break

    return flat


class SlideService:
    async def _ensure_collection_downloaded(self, collection: str | None) -> Path:
        if not collection:
            collection = "templates"

        col_path = Path(SLIDE_TEMPLATES_DIR) / collection
        # Check if the folder exists and has files (already downloaded)
        if col_path.exists() and any(col_path.glob("**/*.svg")):
            return col_path

        if collection.lower() in DEFAULT_COLLECTIONS:
            from app.deps import AWS_S3_DEFAULT_TEMPLATES_BUCKET as BUCKET_NAME
        else:
            from app.deps import AWS_S3_TEMPLATES_BUCKET as BUCKET_NAME

        from app.services.s3_service import (
            list_files_in_s3_prefix,
            download_file_from_s3,
        )

        s3_prefix = f"templates/{collection}/"
        s3_keys = await list_files_in_s3_prefix(s3_prefix, bucket_name=BUCKET_NAME)
        if not s3_keys:
            logger.warning(
                f"No files found in S3 bucket {BUCKET_NAME} for template collection '{collection}' at prefix '{s3_prefix}'"
            )
            return col_path

        logger.info(
            f"Downloading template collection '{collection}' from S3 bucket {BUCKET_NAME}..."
        )
        col_path.mkdir(parents=True, exist_ok=True)
        for key in s3_keys:
            relative = key[len(s3_prefix) :]
            if not relative:
                continue
            dest = col_path / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            await download_file_from_s3(
                key,
                dest,
                bucket_name=BUCKET_NAME,
            )
        return col_path

    async def get_categories(self) -> List[Dict[str, Any]]:
        # Always scan the downloaded default 'templates' library
        library_dir = await self._ensure_collection_downloaded("templates")
        library = await run_in_threadpool(
            slide_skills.scan_template_library, str(library_dir)
        )
        return library.category_map()

    async def get_collection_categories(self, collection: str) -> Dict[str, Any]:
        from app.deps import AWS_S3_DEFAULT_TEMPLATES_BUCKET, AWS_S3_TEMPLATES_BUCKET
        from app.services.s3_service import list_files_in_s3_prefix

        bucket_name = (
            AWS_S3_DEFAULT_TEMPLATES_BUCKET
            if collection.lower() in DEFAULT_COLLECTIONS
            else AWS_S3_TEMPLATES_BUCKET
        )
        s3_prefix = f"templates/{collection}/"
        s3_keys = await list_files_in_s3_prefix(s3_prefix, bucket_name=bucket_name)

        categories: set[str] = set()
        for key in s3_keys:
            relative = key[len(s3_prefix) :]
            parts = relative.split("/")
            if len(parts) > 1 and parts[0]:
                categories.add(parts[0])

        is_custom = collection.lower() not in DEFAULT_COLLECTIONS

        if not categories:
            return {"categories": STANDARD_LAYOUT_TYPES, "is_custom": is_custom}

        valid_categories = {cat for cat in categories if cat.isupper()}
        if not valid_categories:
            return {"categories": STANDARD_LAYOUT_TYPES, "is_custom": is_custom}

        return {"categories": sorted(valid_categories), "is_custom": is_custom}

    async def get_collections(self) -> List[Dict[str, Any]]:
        import json as _json
        import tempfile
        import asyncio
        from app.deps import AWS_S3_TEMPLATES_BUCKET, AWS_S3_DEFAULT_TEMPLATES_BUCKET
        from app.services.s3_service import list_files_in_s3_prefix

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
            "statement_image",
            "pyramid_levels",
            "funnel_stages",
            "process_arrows",
            "circle_cycle",
        }

        try:
            # 1. Fetch system template keys from AWS_S3_DEFAULT_TEMPLATES_BUCKET
            default_keys = await list_files_in_s3_prefix(
                "templates/", bucket_name=AWS_S3_DEFAULT_TEMPLATES_BUCKET
            )

            # 2. Fetch custom template keys from AWS_S3_TEMPLATES_BUCKET
            custom_keys = await list_files_in_s3_prefix(
                "templates/", bucket_name=AWS_S3_TEMPLATES_BUCKET
            )

            # Group keys by collection name along with their source bucket
            collections_files: Dict[str, Dict[str, Any]] = {}

            # Add default collections
            for key in default_keys:
                parts = key.split("/")
                if len(parts) >= 3 and parts[0] == "templates" and parts[1]:
                    col_name = parts[1]
                    if col_name not in collections_files:
                        collections_files[col_name] = {
                            "keys": [],
                            "bucket": AWS_S3_DEFAULT_TEMPLATES_BUCKET,
                        }
                    collections_files[col_name]["keys"].append(key)

            # Add custom collections
            for key in custom_keys:
                parts = key.split("/")
                if len(parts) >= 3 and parts[0] == "templates" and parts[1]:
                    col_name = parts[1]
                    if col_name not in collections_files:
                        collections_files[col_name] = {
                            "keys": [],
                            "bucket": AWS_S3_TEMPLATES_BUCKET,
                        }
                    collections_files[col_name]["keys"].append(key)

            async def get_description(name: str, keys: List[str], bucket: str) -> str:
                default_desc = f"Custom slide template collection '{name}'."
                json_key = f"templates/{name}/collection.json"
                if json_key not in keys:
                    well_known = {
                        "vintage": "A classic, retro style with warm tones and elegant typography.",
                        "clean_light": "A clean, modern light theme focusing on readability and simplicity.",
                        "pastel_pop": "A vibrant and playful theme featuring soft pastel colors.",
                        "starter": "Standard starter templates for clean presentation designs.",
                        "neon_dark": "A modern, high-contrast dark theme with glowing neon accents.",
                        "illustrative_culture": "Warm cream paper, hand-drawn buildings & clouds, Yogyakarta street aesthetic, sage green accents.",
                        "minimalist_gradient": "Sleek dark theme with electric royal blue and violet gradient glows, crisp geometric typography, and ambient grid lines.",
                        "organic_streets": "Organic illustration style: cream paper, plum script headlines, golden sun discs, slate and terracotta blobs, line-art European skylines.",
                        "cultural_folk": "Rich cultural folk style: warm plum night sky over a sand earth strip, arch and temple shapes, radiant sun badges, festival bunting and stitched lines in terracotta, gold, dusty blue and rose.",
                        "electric_green_white": "Clean white editorial EV style with black contrast, electric green accents, grayscale automotive imagery, chrome details, and bold geometric typography.",
                        "green_environment_care": "Modern environmental care style: cream paper, deep forest-green condensed headlines, lush nature photography, sage botanical ornaments, halftone texture, and conservation editorial layouts.",
                        "rmit_red_modern": "RMIT-inspired academic style: crisp white space, bold red geometric frames, subtle contour-line texture, black sans-serif typography, and red-washed campus photo panels.",
                        "startup_neon_pitch": "Black startup pitch style with bold white typography, electric blue and violet light trails, glossy gradient pills, contact-footer details, and high-contrast business layouts.",
                    }
                    return well_known.get(name.lower(), default_desc)

                try:
                    with tempfile.TemporaryDirectory() as tmpdir:
                        temp_file = Path(tmpdir) / f"{name}_collection.json"
                        from app.services.s3_service import download_file_from_s3

                        downloaded = await download_file_from_s3(
                            json_key, temp_file, bucket_name=bucket
                        )
                        if downloaded:
                            content = temp_file.read_text(encoding="utf-8")
                            return _json.loads(content).get("description", default_desc)
                except Exception as e:
                    logger.warning(
                        f"Could not read collection.json for {name} from S3: {e}"
                    )
                return default_desc

            # Process names that are not individual categories and not the base "templates" or "default" collections
            valid_collections = [
                name
                for name in collections_files.keys()
                if name.lower() not in categories
                and name.lower() not in ("templates", "default")
            ]

            tasks = [
                get_description(
                    name,
                    collections_files[name]["keys"],
                    collections_files[name]["bucket"],
                )
                for name in sorted(valid_collections)
            ]
            descriptions = await asyncio.gather(*tasks)

            return [
                {"name": name, "description": desc}
                for name, desc in zip(sorted(valid_collections), descriptions)
            ]
        except Exception as e:
            logger.warning(f"Could not list S3 template collections: {e}")
            return []

    async def generate_deck(
        self,
        topic: str,
        collection: str,
        output_path: Union[str, Path],
        palette: Union[str, tuple, None] = "auto",
        language: str | None = None,
        animation: str = "rise",
    ) -> Dict[str, Any]:
        col_name = collection or "templates"
        await self._ensure_collection_downloaded(col_name)
        return await run_in_threadpool(
            slide_skills.generate_web_deck,
            col_name,
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

            # Diagram families come in per-count variants (tiers_3..5,
            # stages_3..5, steps_3..5, phases_4..6). Expose the item count as
            # talking_points so slide_skills' capacity shortlist picks the
            # variant whose level count matches the content exactly.
            for diagram_key in ("levels", "stages", "process_steps", "phases"):
                items = bindings.get(diagram_key)
                if isinstance(items, list) and items:
                    slide["talking_points"] = [
                        str(it.get("title", "")) if isinstance(it, dict) else str(it)
                        for it in items
                    ]
                    break

            # Flatten bindings to map to flat SVG placeholders
            bindings = flatten_slide_bindings(category, slide_title, bindings)

            if "body_text" in bindings and isinstance(bindings["body_text"], str):
                bindings["body_text"] = textwrap.wrap(bindings["body_text"], width=50)

            slide["bindings"] = bindings

        library_dir = SLIDE_TEMPLATES_DIR
        temp_dir_context = None

        col_name = collection or "templates"
        collection_path = await self._ensure_collection_downloaded(col_name)
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
                library_dir = collection_path
                logger.info(
                    f"Using new-format collection '{col_name}' directly as library_dir"
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
                    "BIG_QUOTE_TAKEAWAY": [
                        "quote",
                        "takeaway",
                        "saying",
                        "citation",
                    ],
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

                library_dir = temp_lib_dir

        try:
            actual_palette = None if palette == "auto" else palette
            _set_image_style_for(library_dir)  # style-matched AI image prompts
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
            if col_name and col_name not in DEFAULT_COLLECTIONS:
                col_path = Path(SLIDE_TEMPLATES_DIR) / col_name
                if col_path.exists() and col_path.is_dir():
                    shutil.rmtree(col_path, ignore_errors=True)
                    logger.info(
                        f"Cleaned up downloaded S3 collection '{col_name}' after generation"
                    )

        return res

    async def render_slide(self, req: RenderSlideReq) -> Dict[str, Any]:

        bindings: Dict[str, Any] = req.bindings.copy() if req.bindings else {}
        slide: Dict[str, Any] = {
            "category": req.layoutType,
            "slideTitle": req.slideTitle,
            "bindings": bindings,
        }
        category = req.layoutType
        slide_title = req.slideTitle

        slide["category"] = category

        for diagram_key in ("levels", "stages", "process_steps", "phases"):
            items = bindings.get(diagram_key)
            if isinstance(items, list) and items:
                slide["talking_points"] = [
                    str(it.get("title", "")) if isinstance(it, dict) else str(it)
                    for it in items
                ]
                break

        bindings = flatten_slide_bindings(category, slide_title, bindings)

        if "body_text" in bindings and isinstance(bindings["body_text"], str):
            bindings["body_text"] = textwrap.wrap(bindings["body_text"], width=50)

        slide["bindings"] = bindings

        col_name = req.collection or "templates"
        collection_path = await self._ensure_collection_downloaded(col_name)

        library_dir = SLIDE_TEMPLATES_DIR
        temp_dir_context = None

        if collection_path.exists() and collection_path.is_dir():
            has_category_subdirs = any(
                child.is_dir() for child in collection_path.iterdir()
            )
            if has_category_subdirs:
                library_dir = collection_path
            else:
                # Legacy flat format
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
                    "SECTION_HEADER": ["section", "header", "slide_02"],
                    "TITLE_BULLETS": ["bullets", "bullet", "points", "slide_03"],
                    "TWO_COLUMN_SPLIT": ["split", "columns", "slide_04"],
                    "BIG_QUOTE_TAKEAWAY": ["quote", "takeaway", "slide_05"],
                    "KPI_BIG_NUMBER": ["kpi", "number", "metric", "slide_06"],
                    "CHART_INSIGHT": ["chart", "insight", "graph", "slide_07"],
                    "DATA_TABLE": ["table", "data_table", "slide_08"],
                    "MEDIA_TEXT": ["media", "image_text", "slide_09"],
                    "TIMELINE_MILESTONES": ["timeline", "milestone", "slide_10"],
                    "STEP_BY_STEP": ["step", "process_steps", "slide_11"],
                    "CONCLUSION_SUMMARY": ["conclusion", "summary", "slide_12"],
                    "CALL_TO_ACTION": ["cta", "action", "slide_13"],
                    "QA_CONTACT": ["qa", "contact", "slide_14"],
                    "REFERENCES_LIST": ["references", "source", "slide_15"],
                }

                svg_files = list(collection_path.glob("*.svg"))
                for idx, cat in enumerate(categories_to_map):
                    cat_dir = temp_lib_dir / cat
                    cat_dir.mkdir(parents=True, exist_ok=True)

                    matched_file = None
                    for pattern in patterns.get(cat, []):
                        for svg_file in svg_files:
                            if pattern in svg_file.name.lower():
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

                library_dir = temp_lib_dir

        try:
            lib = await run_in_threadpool(
                slide_skills.scan_template_library, library_dir
            )
            key = lib.resolve(category)
            if key is None:
                raise ValueError(
                    f"No category matches {category!r} in template library"
                )

            mapping = {}
            target = (
                slide_skills.PRESETS.get(req.palette)
                if isinstance(req.palette, str)
                else req.palette
            )
            if target is not None:
                from slide_skills.svg_categories import _library_palette

                mapping = slide_skills.auto_map_palette(_library_palette(lib), target)

            result = await run_in_threadpool(
                slide_skills.svg_categories.select_and_fill_slide,
                lib.categories[key],
                slide,
            )
            if not result:
                raise ValueError(f"No variant selected for layout {category}")

            variant = result["variant"]
            svg = Path(variant.path).read_text(encoding="utf-8")

            from slide_skills.svg_categories import (
                prune_empty_groups,
                fill_svg,
                fit_text_to_boxes,
            )

            svg = prune_empty_groups(svg, result["texts"])

            texts = result["texts"]
            if 'data-w="' in svg:
                from slide_skills.svg_categories import _backfill_slots

                texts = _backfill_slots(texts, variant, slide)

            svg = fill_svg(svg, texts)
            svg = fit_text_to_boxes(svg)

            if mapping:
                svg = slide_skills.retheme_svg(svg, mapping)

            return {"svg": svg}
        finally:
            if temp_dir_context:
                try:
                    temp_dir_context.cleanup()
                except Exception:
                    pass
            if col_name and col_name not in DEFAULT_COLLECTIONS:
                col_path = Path(SLIDE_TEMPLATES_DIR) / col_name
                if col_path.exists() and col_path.is_dir():
                    shutil.rmtree(col_path, ignore_errors=True)
                    logger.info(
                        f"Cleaned up downloaded S3 collection '{col_name}' after rendering"
                    )

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
            dest_dir_with_suffix = (
                Path(SLIDE_TEMPLATES_DIR) / f"{collection_name}_template"
            )
            if not dest_dir.exists() and dest_dir_with_suffix.exists():
                dest_dir = dest_dir_with_suffix

            if dest_dir.exists() and dest_dir.is_dir():
                # Auto-create collection.json if it doesn't exist
                meta_file = dest_dir / "collection.json"
                if not meta_file.exists():
                    import json

                    try:
                        meta_file.write_text(
                            json.dumps(
                                {
                                    "name": collection_name,
                                    "description": f"Custom slide template collection '{collection_name}'.",
                                },
                                indent=2,
                                ensure_ascii=False,
                            ),
                            encoding="utf-8",
                        )
                        logger.info(
                            f"Created default collection.json for custom collection '{collection_name}'"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Could not auto-create collection.json for '{collection_name}': {e}"
                        )

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
