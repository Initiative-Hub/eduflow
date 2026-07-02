"""Generate complete style collections from the default (neon-dark) template bank.

Every category/variant keeps its proven layout and placeholder set; only the
design language changes: palette, typography, decor, and opacity tuning for
light backgrounds. Output: templates/<style>/<CATEGORY>/... — usable directly
via generate_deck_from_plan(collection="<style>") after uploading to S3.

Run:  python scripts/make_style_collections.py
"""

import json
import re
import shutil
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parents[1] / "templates"

# neon-dark source tokens -> per-style replacements
#   bg       slide background        card   panel/card fill
#   accA/B   the two accent colors   ink    headings (was white)
#   body     body text
STYLES = {
    "vintage": {
        "colors": {
            "#0A0E1A": "#F5EEDC",   # aged cream paper
            "#111827": "#EDE2C4",   # parchment card
            "#00F0FF": "#4E6E58",   # sage green
            "#FF007F": "#8C3B2E",   # rust red
            "#FFFFFF": "#3E2C1C",   # dark brown ink
            "#E2E8F0": "#5C4A36",   # warm brown body
        },
        "font": "Georgia, 'Times New Roman', serif",
        "frame": (
            '<rect x="18" y="18" width="1404" height="774" fill="none" '
            'stroke="#8C3B2E" stroke-width="2" stroke-opacity="0.55"/>'
            '<rect x="28" y="28" width="1384" height="754" fill="none" '
            'stroke="#4E6E58" stroke-width="1" stroke-opacity="0.45"/>'
        ),
        "light": True,
        "description": "Vintage / retro style: aged cream paper, rust red and sage green accents, classic serif typography, double-rule frames.",
    },
    "clean_light": {
        "colors": {
            "#0A0E1A": "#FFFFFF",
            "#111827": "#F4F6F8",
            "#00F0FF": "#0F62FE",   # single strong blue
            "#FF007F": "#111111",   # near-black secondary
            "#FFFFFF": "#111111",
            "#E2E8F0": "#4B5563",
        },
        "font": "'Helvetica Neue', Helvetica, Arial, sans-serif",
        "frame": "",
        "light": True,
        "description": "Clean minimal light style: white background, near-black text, one strong blue accent, generous whitespace.",
    },
    "pastel_pop": {
        "colors": {
            "#0A0E1A": "#FDF6F9",   # soft blush
            "#111827": "#FFFFFF",   # white cards
            "#00F0FF": "#4E9B82",   # deep mint
            "#FF007F": "#D26A92",   # rose pink
            "#FFFFFF": "#4A3B50",   # plum ink
            "#E2E8F0": "#6E5A77",   # muted plum body
        },
        "font": "'Avenir Next', 'Trebuchet MS', Verdana, sans-serif",
        "frame": "",
        "light": True,
        "description": "Soft pastel style: blush background, white cards, rose pink and mint accents, friendly rounded feel.",
    },
}

_SANS = re.compile(r'font-family="system-ui[^"]*"')
_FILL_OP = re.compile(r'fill-opacity="0\.(0[3-9]|1[0-6])"')
_STROKE_OP = re.compile(r'stroke-opacity="0\.(2[0-9]|3[0-5])"')


def restyle(svg: str, style: dict) -> str:
    # simultaneous replacement — sequential .replace() chains would let a later
    # rule clobber an earlier rule's output (e.g. bg->white, then white->ink)
    cmap = {k.upper(): v for k, v in style["colors"].items()}
    svg = re.sub(
        "|".join(re.escape(k) for k in cmap),
        lambda m: cmap[m.group(0).upper()],
        svg,
        flags=re.IGNORECASE,
    )
    svg = _SANS.sub(f'font-family="{style["font"]}"', svg)
    if style["light"]:
        # decor tuned for dark backgrounds is nearly invisible on light ones
        svg = _FILL_OP.sub('fill-opacity="0.18"', svg)
        svg = _STROKE_OP.sub('stroke-opacity="0.55"', svg)
    if style["frame"]:
        # inject the frame right after the background rect
        svg = re.sub(r'(<rect width="1440" height="810"[^/]*/>)',
                     r"\1" + style["frame"], svg, count=1)
    return svg


def main() -> None:
    categories = [d for d in sorted(TEMPLATES.iterdir())
                  if d.is_dir() and d.name.isupper()]  # skip starter/neon_dark/styles
    for style_name, style in STYLES.items():
        out_root = TEMPLATES / style_name
        if out_root.exists():
            shutil.rmtree(out_root)
        for cat in categories:
            out_cat = out_root / cat.name
            out_cat.mkdir(parents=True, exist_ok=True)
            for f in sorted(cat.iterdir()):
                if f.suffix == ".svg":
                    (out_cat / f.name).write_text(
                        restyle(f.read_text(encoding="utf-8"), style),
                        encoding="utf-8")
                elif f.name.endswith("schema.json"):
                    shutil.copyfile(f, out_cat / f.name)   # same placeholders
                elif f.name == "category.json":
                    meta = json.loads(f.read_text(encoding="utf-8"))
                    meta["variants"] = {
                        k: f"{style_name} style — {v}"
                        for k, v in (meta.get("variants") or {}).items()}
                    (out_cat / f.name).write_text(
                        json.dumps(meta, ensure_ascii=False, indent=2),
                        encoding="utf-8")
        # collection-level manifest so pickers can describe the style
        (out_root / "collection.json").write_text(json.dumps(
            {"name": style_name, "description": style["description"]},
            ensure_ascii=False, indent=2), encoding="utf-8")
        n = sum(1 for _ in out_root.rglob("*.svg"))
        print(f"{style_name}: {len(categories)} categories, {n} SVGs")


if __name__ == "__main__":
    main()
