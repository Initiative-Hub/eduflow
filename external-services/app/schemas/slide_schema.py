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
    images: bool = Field(
        default=True,
        description="Whether to fill template image slots with generated art",
    )
    image_source: str = Field(
        default="ai",
        description="Image generator: 'ai' (photo model) or 'svg' (cheaper GPT-4o vector)",
    )
