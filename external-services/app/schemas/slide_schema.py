from pydantic import BaseModel, Field


class GenReq(BaseModel):
    topic: str = Field(..., description="The main topic of the presentation")
    collection: str = Field(
        default="starter", description="The slide-skills template collection name"
    )
    palette: str | None = Field(
        default="auto",
        description="The color palette selection (auto, corporate, modern, etc.)",
    )
    language: str | None = Field(
        default=None, description="The generation language target"
    )
    animation: str = Field(
        default="rise", description="Slide transition animation style"
    )


class SlidePlanItem(BaseModel):
    category: str = Field(..., description="The category/layout type for this slide")
    focusTopic: str | None = Field(
        default=None, description="The primary concept/focus of this slide"
    )
    slideTitle: str | None = Field(default=None, description="The title of this slide")
    bindings: dict | None = Field(
        default=None, description="Specific content key-value bindings for this layout"
    )


class PlanGenReq(BaseModel):
    title: str = Field(..., description="Presentation title")
    slides: list[SlidePlanItem] = Field(..., description="Ordered list of slide plans")
    palette: str = Field(default="auto", description="The color palette selection")
    collection: str = Field(
        default="starter", description="The chosen template collection"
    )
    images: bool = Field(
        default=True,
        description="Whether to fill template image slots with generated art",
    )
    image_source: str = Field(
        default="ai",
        description="Image generator: 'ai' (photo model) or 'svg' (cheaper GPT-4o vector)",
    )


class RenderSlideReq(BaseModel):
    layoutType: str = Field(..., description="The template category name")
    slideTitle: str = Field(default="", description="The title of the slide")
    bindings: dict = Field(
        default_factory=dict,
        description="Key-value bindings for the slide placeholders",
    )
    collection: str | None = Field(
        default="starter", description="The slide template collection/theme name"
    )
    palette: str | None = Field(
        default="auto", description="The color palette selection"
    )


class SlotEdit(BaseModel):
    """One reviewer correction to an extracted template slot."""

    name: str = Field(..., description="Current slot name, e.g. 'title_2'")
    rename: str | None = Field(default=None, description="New slot name, e.g. 'body'")
    type: str | None = Field(default=None, description="title | subtitle | text | stat | caption")
    desc: str | None = Field(default=None, description="What the planner should write here")
    max_chars: int | None = Field(default=None, description="Character budget")
    lines: int | None = Field(default=None, description="Number of repeatable lines")
    bullet: bool | None = Field(
        default=None,
        description="Render this slot's lines as a bullet list (null = auto by name)")
    delete: bool = Field(default=False, description="Remove this slot entirely")
    kind: str | None = Field(default=None, description="text | image | chart | table")
    x: float | None = Field(default=None, description="Left edge on a 1440x810 slide")
    y: float | None = Field(default=None, description="Baseline (text) or top edge")
    w: float | None = Field(default=None, description="Wrap width / frame width")
    h: float | None = Field(default=None, description="Wrap height / frame height")


class SlotEditsReq(BaseModel):
    category: str = Field(..., description="Template category, e.g. 'CONTENT_SLIDE'")
    variant: str = Field(default="standard", description="Variant stem")
    edits: list[SlotEdit] = Field(default_factory=list)
