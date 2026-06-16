import base64
import logging
import tempfile
import textwrap
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Union
from fastapi.concurrency import run_in_threadpool
import slide_skills  # type: ignore
from slide_skills.image_generator import generate_image  # type: ignore
from app.deps import SLIDE_TEMPLATES_DIR

logger = logging.getLogger(__name__)


async def generate_and_encode_image(prompt: str, aspect_ratio: float = 1.0) -> str:
    try:
        # Generate image using slide_skills DALL-E runner
        img_bytes = await run_in_threadpool(
            generate_image,
            prompt,
            aspect_ratio=aspect_ratio,
        )
        b64_str = base64.b64encode(img_bytes).decode("utf-8")
        return f"data:image/png;base64,{b64_str}"
    except Exception as e:
        logger.warning(f"DALL-E image generation failed, using SVG placeholder: {e}")
        # Create a beautiful vector SVG placeholder matching our neon tech theme
        prompt_snippet = prompt[:45] + "..." if len(prompt) > 45 else prompt
        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="500" height="420" viewBox="0 0 500 420">
  <rect width="500" height="420" fill="#111827" rx="12"/>
  <rect x="10" y="10" width="480" height="400" fill="none" stroke="#00F0FF" stroke-width="2" stroke-dasharray="8 4" stroke-opacity="0.4" rx="10"/>
  <text x="250" y="190" font-family="system-ui, sans-serif" font-size="20" fill="#FFFFFF" text-anchor="middle" font-weight="bold">AI Generated Media</text>
  <text x="250" y="230" font-family="system-ui, sans-serif" font-size="14" fill="#00F0FF" text-anchor="middle">{prompt_snippet}</text>
</svg>"""
        b64_svg = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")
        return f"data:image/svg+xml;base64,{b64_svg}"


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
    ) -> Dict[str, Any]:
        slides_list = []
        if isinstance(plan, dict):
            slides_list = plan.get("slides", [])
        elif isinstance(plan, list):
            slides_list = plan

        generated_images = []

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

            image_prompt = (
                bindings.get("image_prompt_description")
                or bindings.get("image_prompt")
                or (bindings.get("body_text") if category == "MEDIA_TEXT" else None)
            )
            if image_prompt:
                image_url = await generate_and_encode_image(
                    str(image_prompt), aspect_ratio=1.19
                )
                generated_images.append(image_url)

            slide["bindings"] = bindings

        actual_palette = None if palette == "auto" else palette
        res = await run_in_threadpool(
            slide_skills.generate_deck_from_plan,
            plan,
            SLIDE_TEMPLATES_DIR,
            output_path,
            palette=actual_palette,
            language=language,
            animation=animation,
            title=title,
        )

        # Post-process compiled HTML to inject generated image base64 URIs sequentially
        out_file_path = Path(output_path)
        if out_file_path.exists() and generated_images:
            try:
                html_content = out_file_path.read_text(encoding="utf-8")
                for img_url in generated_images:
                    html_content = html_content.replace(
                        "__IMAGE_URL_PLACEHOLDER__", img_url, 1
                    )
                out_file_path.write_text(html_content, encoding="utf-8")
                logger.info(
                    f"Successfully post-processed HTML to inject {len(generated_images)} image placeholders."
                )
            except Exception as pe:
                logger.error(f"Failed to post-process slide image replacements: {pe}")

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
