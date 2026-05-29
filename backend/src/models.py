"""Pydantic models for API responses."""

from pydantic import AliasChoices, BaseModel, Field


class KnowledgeBase(BaseModel):
    """Knowledge base summary for the v1 review workflow."""

    id: str
    name: str
    description: str | None
    published_count: int
    pending_review_count: int
    updated_at: str | None


class KnowledgeBaseCreate(BaseModel):
    """Request body for creating a local knowledge base."""

    name: str
    description: str | None = None


class KnowledgeItemPayload(BaseModel):
    """Shared request body for upload, review edits, and manual items."""

    knowledge_base_id: str = "default"
    title: str | None = None
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    tag_ids: list[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("tag_ids", "tagIds"),
    )
    cluster_id: str | None = None
    cluster_label: str | None = None
    source_type: str = "other"
    item_type: str = "other"
    author: str | None = None
    year: int | None = None
    doi_url: str | None = None
    source_name: str | None = None
    visibility: str = "课题组可见"
    content_preview: str | None = None
    reject_reason: str | None = None
    file_name: str | None = None


class KnowledgeItem(BaseModel):
    """Detailed knowledge item used by the review queue and detail panel."""

    id: str
    knowledge_base_id: str
    title: str
    summary: str | None
    tags: list[str]
    tag_ids: list[str] = Field(default_factory=list)
    cluster_id: str | None
    cluster_label: str | None
    source_type: str
    item_type: str
    author: str | None
    year: int | None
    doi_url: str | None
    source_name: str | None
    visibility: str | None
    review_status: str
    reject_reason: str | None
    content_preview: str | None
    has_source_file: bool = False
    x: float | None
    y: float | None
    created_at: str
    updated_at: str
    published_at: str | None


class KnowledgeMapPoint(BaseModel):
    """Published-only point for the two-dimensional knowledge map."""

    id: str
    title: str
    x: float
    y: float
    cluster_id: str | None
    cluster_label: str | None
    tags: list[str]
    tag_ids: list[str] = Field(default_factory=list)
    summary_preview: str | None
    source_type: str
    item_type: str
    year: int | None
    published_at: str | None
    review_status: str


class KnowledgeCluster(BaseModel):
    """Cluster metadata for published map points."""

    id: str
    label: str
    keywords: list[str]
    item_count: int
    color: str


class KnowledgeMapResponse(BaseModel):
    """Published map response."""

    points: list[KnowledgeMapPoint]
    clusters: list[KnowledgeCluster]


class KnowledgeItemList(BaseModel):
    """Response containing knowledge items."""

    items: list[KnowledgeItem]


class TagPayload(BaseModel):
    """Request body for creating a structured tag."""

    name: str
    tag_group: str
    parent_id: str | None = None
    description: str | None = None
    synonyms: list[str] = Field(default_factory=list)
    sort_order: int = 0
    is_selectable: bool = True


class TagUpdatePayload(BaseModel):
    """Request body for editing a structured tag without changing hierarchy."""

    name: str | None = None
    description: str | None = None
    synonyms: list[str] | None = None
    sort_order: int | None = None
    is_selectable: bool | None = None
    is_active: bool | None = None


class Tag(BaseModel):
    """Structured tag used by admin taxonomy APIs."""

    id: str
    name: str
    slug: str
    tag_group: str
    parent_id: str | None
    level: int
    path: str
    description: str | None
    synonyms: list[str]
    sort_order: int
    is_system: bool
    is_selectable: bool
    is_active: bool
    created_at: str
    updated_at: str


class TagNode(Tag):
    """Tree-shaped structured tag node."""

    children: list["TagNode"] = Field(default_factory=list)


class PublicTag(BaseModel):
    """Read-only active tag exposed to user-facing pages."""

    id: str
    name: str
    slug: str
    tag_group: str
    parent_id: str | None
    level: int
    path: str
    description: str | None
    synonyms: list[str]
    sort_order: int
    is_system: bool
    is_selectable: bool


class PublicTagNode(PublicTag):
    """Tree-shaped read-only active tag for user-facing pages."""

    children: list["PublicTagNode"] = Field(default_factory=list)


class TagSeedResult(BaseModel):
    """Result returned after importing default tag seed data."""

    inserted_count: int
    skipped_count: int
    total_count: int


class TagDisableResult(BaseModel):
    """Result returned after disabling a tag."""

    tag: Tag
    warning: str | None = None


class TagUsageStats(BaseModel):
    """Per-tag usage counters across review statuses."""

    tag_id: str
    item_count: int
    published_item_count: int
    pending_review_item_count: int
    last_used_at: str | None


class PaperSummary(BaseModel):
    """Summary view of a paper for list/visualization."""

    id: int
    title: str | None
    x: float | None
    y: float | None
    z: float | None
    cluster_id: int | None
    cluster_label: str | None
    field_subfield: str | None
    publication_year: int | None
    classification: str | None


class PaperDetail(BaseModel):
    """Detailed view of a paper."""

    id: int
    title: str | None
    sample: str | None
    summarization: str | None
    x: float | None
    y: float | None
    z: float | None
    cluster_id: int | None
    cluster_label: str | None
    field_subfield: str | None
    publication_year: int | None
    classification: str | None
    nearest_papers: list["PaperSummary"]


class PaperSample(BaseModel):
    """Paper sample with extracted data and cluster info."""

    paper_id: int
    sample: str
    title: str | None
    summarization: str | None
    cluster_id: int | None
    cluster_label: str | None
    field_subfield: str | None
    publication_year: int | None
    classification: str | None


class PaperSampleList(BaseModel):
    """List of paper IDs that have samples."""

    paper_ids: list[int]


class ClusterInfo(BaseModel):
    """Information about a cluster."""

    cluster_id: int
    cluster_label: str
    count: int
    color: str


class PapersResponse(BaseModel):
    """Response containing list of papers."""

    papers: list[PaperSummary]


class ClustersResponse(BaseModel):
    """Response containing cluster information."""

    clusters: list[ClusterInfo]


class TemporalDataPoint(BaseModel):
    """Data point for a specific year in temporal analysis."""

    year: int
    count: int


class ClusterTemporalData(BaseModel):
    """Temporal evolution data for a single cluster."""

    cluster_id: int
    cluster_label: str
    color: str
    temporal_data: list[TemporalDataPoint]


class TemporalDataResponse(BaseModel):
    """Response containing temporal evolution data for all clusters."""

    clusters: list[ClusterTemporalData]
