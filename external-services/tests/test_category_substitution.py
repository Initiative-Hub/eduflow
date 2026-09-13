"""A collection missing a category should stand in from its OWN layouts.

A collection extracted from a real deck carries only the designs that deck
had — Art & Activism has 12 of the 22 standard categories — while the planner
is told to vary layouts across all of them. Backfilling the rest from the base
library produced a deck with two slides in the chosen style and ten in a
foreign one.
"""

import sys
import tempfile
import unittest
from pathlib import Path

EXTERNAL_SERVICES_DIR = Path(__file__).resolve().parents[1]
if str(EXTERNAL_SERVICES_DIR) not in sys.path:
    sys.path.insert(0, str(EXTERNAL_SERVICES_DIR))

from app.services.slide_service import (  # noqa: E402
    CATEGORY_SUBSTITUTES,
    STANDARD_LAYOUT_TYPES,
    _find_substitute_layout,
)

# What the Art & Activism collection actually ships.
EXTRACTED = [
    "AGENDA_OUTLINE", "BIG_QUOTE_TAKEAWAY", "CALL_TO_ACTION",
    "CONCLUSION_SUMMARY", "IMAGE_GALLERY", "MEDIA_TEXT", "REFERENCES_LIST",
    "SECTION_HEADER", "STATEMENT_IMAGE", "TITLE_BULLETS", "TITLE_SLIDE",
    "TWO_COLUMN_SPLIT",
]

# Their content needs real chart and table slots, so losing the chart to keep
# the palette is the wrong trade — these still backfill from the base library.
NEEDS_DATA_SLOTS = {"CHART_INSIGHT", "DATA_TABLE"}


def _library(categories):
    root = Path(tempfile.mkdtemp())
    for name in categories:
        folder = root / name
        folder.mkdir()
        (folder / "standard.svg").write_text("<svg/>")
    return root


class SubstituteLayoutTests(unittest.TestCase):
    def setUp(self):
        self.root = _library(EXTRACTED)
        self.own = set(EXTRACTED)

    def test_every_text_category_stays_in_the_collection(self):
        missing = [
            c for c in STANDARD_LAYOUT_TYPES
            if c not in self.own and c not in NEEDS_DATA_SLOTS
        ]
        self.assertTrue(missing, "fixture must exercise missing categories")
        for category in missing:
            with self.subTest(category=category):
                stand_in = _find_substitute_layout(self.root, category, self.own)
                self.assertIsNotNone(
                    stand_in, f"{category} would be backfilled from another deck"
                )
                self.assertIn(stand_in.name, self.own)

    def test_data_categories_are_left_to_the_base_library(self):
        for category in NEEDS_DATA_SLOTS:
            with self.subTest(category=category):
                self.assertIsNone(
                    _find_substitute_layout(self.root, category, self.own)
                )

    def test_never_stands_in_with_a_folder_a_previous_substitution_made(self):
        # TIMELINE_MILESTONES prefers STEP_BY_STEP, which this collection does
        # not have. Once an earlier iteration creates STEP_BY_STEP as a copy of
        # TITLE_BULLETS, an unguarded search picks it up and three slides land
        # on one design — the monotony the variety rule exists to prevent.
        (self.root / "STEP_BY_STEP").mkdir()
        (self.root / "STEP_BY_STEP" / "standard.svg").write_text("<svg/>")

        stand_in = _find_substitute_layout(
            self.root, "TIMELINE_MILESTONES", self.own
        )
        self.assertIsNotNone(stand_in)
        self.assertNotEqual(stand_in.name, "STEP_BY_STEP")

    def test_spreads_stand_ins_across_the_available_designs(self):
        # Five missing categories all listing TITLE_BULLETS first must not all
        # be served by it.
        used = {}
        picks = []
        for category in ("PROCESS_ARROWS", "PYRAMID_LEVELS", "FUNNEL_STAGES",
                         "CIRCLE_CYCLE", "STEP_BY_STEP"):
            stand_in = _find_substitute_layout(
                self.root, category, self.own, used
            )
            self.assertIsNotNone(stand_in)
            used[stand_in.name] = used.get(stand_in.name, 0) + 1
            picks.append(stand_in.name)
        self.assertGreater(len(set(picks)), 1, f"all five landed on {picks[0]}")

    def test_substitutes_only_name_real_standard_categories(self):
        known = set(STANDARD_LAYOUT_TYPES)
        for category, options in CATEGORY_SUBSTITUTES.items():
            with self.subTest(category=category):
                self.assertIn(category, known)
                for option in options:
                    self.assertIn(option, known)
                self.assertNotIn(
                    category, options, "a category cannot stand in for itself"
                )


if __name__ == "__main__":
    unittest.main()
