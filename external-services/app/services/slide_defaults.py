"""The collection a request falls back to when none is chosen.

Kept in its own module so the schemas can import it without pulling in
`slide_service`, which imports the schemas.

Was `starter`, which is a shell in the template bucket: 23 preview PNGs and not
one .svg, so every deck that fell back to it failed with "has no .svg layouts
available". `get_collections` now hides collections with no layouts, so a
default that cannot render is caught before it is offered.
"""

DEFAULT_TEMPLATE_COLLECTION = "rmit_official"
