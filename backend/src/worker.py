"""FastAPI server for paper visualization."""

import gzip
import json
import logging
import os
import re
import sqlite3
import time
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

try:
    from workers import WorkerEntrypoint
except ModuleNotFoundError:
    class WorkerEntrypoint:  # type: ignore[no-redef]
        """Fallback so the FastAPI app can be imported in local smoke checks."""

        pass

from models import (
    ClusterInfo,
    ClustersResponse,
    ClusterTemporalData,
    KnowledgeBase,
    KnowledgeBaseCreate,
    KnowledgeCluster,
    KnowledgeItem,
    KnowledgeItemList,
    KnowledgeItemPayload,
    KnowledgeMapPoint,
    KnowledgeMapResponse,
    PaperDetail,
    PaperSample,
    PaperSampleList,
    PapersResponse,
    PaperSummary,
    PublicTag,
    PublicTagNode,
    Tag,
    TagDisableResult,
    TagNode,
    TagPayload,
    TagSeedResult,
    TagUpdatePayload,
    TagUsageStats,
    TemporalDataPoint,
    TemporalDataResponse,
)
from tag_seed import DEFAULT_TAG_TREE, flatten_tag_tree, seed_default_tags

# Configure logging
# Note: In Cloudflare Workers, all logs go to stderr and show as errors in wrangler
# Set to WARNING to reduce log noise, or INFO for detailed performance metrics
logging.basicConfig(
    level=logging.INFO,  # Changed to INFO for debugging database connection
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LAION 论文可视化 API",
    description="用于通过嵌入向量和聚类探索科研论文的 API",
    version="1.0.0",
)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=False,  # Must be False when using wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path - try multiple locations for robustness
# First, check if we're in local dev mode using an environment variable
DB_PATH = None
local_db_path = os.environ.get("LOCAL_DB_PATH")

if local_db_path:
    # Use explicitly configured path for local development
    DB_PATH = Path(local_db_path)
else:
    # Try relative to the worker file
    DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"
    if not DB_PATH.exists():
        # Try relative to current working directory
        DB_PATH = Path("backend/data/db.sqlite")
    if not DB_PATH.exists():
        # Try just data/db.sqlite (when cwd is backend/)
        DB_PATH = Path("data/db.sqlite")

logger.info(f"Using database at: {DB_PATH.resolve()} (exists: {DB_PATH.exists()})")
CACHE_TTL_SECONDS = 5


@app.middleware("http")
async def apply_cache_headers(request: Request, call_next):
    """Apply short-lived caching so browsers and Cloudflare cache responses."""
    response = await call_next(request)
    cache_control_value = f"public, max-age={CACHE_TTL_SECONDS}"
    response.headers["Cache-Control"] = cache_control_value
    response.headers["CDN-Cache-Control"] = cache_control_value
    response.headers["Surrogate-Control"] = cache_control_value

    # Ensure compressed responses vary correctly for downstream caches.
    if "Vary" in response.headers:
        if "accept-encoding" not in response.headers["Vary"].lower():
            response.headers["Vary"] = f"{response.headers['Vary']}, Accept-Encoding"
    else:
        response.headers["Vary"] = "Accept-Encoding"

    return response


@app.exception_handler(Exception)
async def handle_uncaught_exceptions(request: Request, exc: Exception) -> JSONResponse:
    """Log uncaught exceptions and return a generic error response."""
    import asyncio

    if isinstance(exc, HTTPException):
        headers = getattr(exc, "headers", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers if headers is not None else None,
        )

    # Suppress InvalidStateError - it's a harmless ASGI adapter issue
    # that occurs after responses are already sent successfully
    if isinstance(exc, asyncio.InvalidStateError):
        return JSONResponse(
            status_code=200,
            content={"detail": "OK"},
        )

    logger.exception("Unhandled error during request %s %s", request.method, request.url)

    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误"},
    )


def _normalize_params(params: Sequence[Any] | None) -> Sequence[Any]:
    """Ensure query parameters are always a tuple."""
    if params is None:
        return ()
    if isinstance(params, tuple):
        return params
    if isinstance(params, list):
        return tuple(params)
    return (params,)


class BaseDatabase:
    async def fetch_all(self, query: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def fetch_one(self, query: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
        raise NotImplementedError

    async def execute(self, query: str, params: Sequence[Any] | None = None) -> None:
        raise NotImplementedError


class SqliteDatabase(BaseDatabase):
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        logger.info(f"SqliteDatabase initialized with path: {self.db_path.resolve()}")
        logger.info(f"Database file exists: {self.db_path.exists()}")

    async def fetch_all(self, query: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        params = _normalize_params(params)
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.OperationalError as e:
            logger.error(f"SQLite error with db_path={self.db_path.resolve()}, exists={self.db_path.exists()}: {e}")
            raise

    async def fetch_one(self, query: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
        params = _normalize_params(params)
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(query, params)
                row = cursor.fetchone()
            return dict(row) if row else None
        except sqlite3.OperationalError as e:
            logger.error(f"SQLite error with db_path={self.db_path.resolve()}, exists={self.db_path.exists()}: {e}")
            raise

    async def execute(self, query: str, params: Sequence[Any] | None = None) -> None:
        params = _normalize_params(params)
        try:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.execute(query, params)
                conn.commit()
        except sqlite3.OperationalError as e:
            logger.error(f"SQLite error with db_path={self.db_path.resolve()}, exists={self.db_path.exists()}: {e}")
            raise


class D1Database(BaseDatabase):
    def __init__(self, binding: Any) -> None:
        self.binding = binding

    def _convert_row(self, row: Any) -> dict[str, Any]:
        """Convert a D1 row (JsProxy) to a Python dict, handling null values."""
        result = {}
        for key, value in row.object_entries():
            # Convert JavaScript null to Python None
            # Check type name as JsNull doesn't work well with isinstance
            type_name = type(value).__name__
            if value is None or type_name == "JsNull":
                result[key] = None
            else:
                result[key] = value
        return result

    async def fetch_all(self, query: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
        params = _normalize_params(params)
        statement = self.binding.prepare(query)
        if params:
            statement = statement.bind(*params)
        result = await statement.all()
        # Convert JsProxy objects to Python dicts
        return [self._convert_row(row) for row in result.results]

    async def fetch_one(self, query: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
        params = _normalize_params(params)
        statement = self.binding.prepare(query)
        if params:
            statement = statement.bind(*params)
        result = await statement.first()
        # Convert JsProxy object to Python dict
        if result is None:
            return None
        return self._convert_row(result)

    async def execute(self, query: str, params: Sequence[Any] | None = None) -> None:
        params = _normalize_params(params)
        statement = self.binding.prepare(query)
        if params:
            statement = statement.bind(*params)
        await statement.run()


def get_database(request: Request | None = None) -> BaseDatabase:
    """Return an appropriate database client for the current environment."""
    if request is not None:
        env = request.scope.get("env")
        if env is not None:
            binding = getattr(env, "LAION_DB", None) or getattr(env, "DB", None)
            if binding is not None:
                return D1Database(binding)
    return SqliteDatabase(DB_PATH)


# Predefined color palette for clusters (pastel theme)
CLUSTER_COLORS = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
    "#aec7e8",
    "#ffbb78",
    "#98df8a",
    "#ff9896",
    "#c5b0d5",
    "#c49c94",
    "#f7b6d2",
    "#c7c7c7",
    "#dbdb8d",
    "#9edae5",
    "#393b79",
    "#637939",
    "#8c6d31",
    "#843c39",
    "#7b4173",
    "#5254a3",
    "#8ca252",
    "#bd9e39",
    "#ad494a",
    "#a55194",
]


def get_cluster_color(cluster_id: int) -> str:
    """Get consistent color for a cluster."""
    if cluster_id < 0:
        return "#E8E8E8"  # Light gray pastel for unclustered
    return CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)]


KNOWLEDGE_REVIEW_STATUSES = {
    "draft",
    "uploaded",
    "pending_review",
    "ai_analyzing",
    "ai_analysis_failed",
    "reviewing",
    "approved",
    "rejected",
    "published",
}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _json_tags(tags: list[str] | None) -> str:
    if not tags:
        return "[]"
    normalized = [tag.strip() for tag in tags if tag.strip()]
    return json.dumps(normalized, ensure_ascii=False)


def _parse_tags(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(tag) for tag in parsed if str(tag).strip()]


def _knowledge_item_from_row(row: dict[str, Any], tag_ids: Sequence[str] | None = None) -> KnowledgeItem:
    source_path = row.get("source_path")
    return KnowledgeItem(
        id=row["id"],
        knowledge_base_id=row["knowledge_base_id"],
        title=row["title"],
        summary=row["summary"],
        tags=_parse_tags(row["tags_json"]),
        tag_ids=list(tag_ids or []),
        cluster_id=row["cluster_id"],
        cluster_label=row["cluster_label"],
        source_type=row["source_type"],
        item_type=row["item_type"],
        author=row["author"],
        year=row["year"],
        doi_url=row["doi_url"],
        source_name=row["source_name"],
        visibility=row["visibility"],
        review_status=row["review_status"],
        reject_reason=row["reject_reason"],
        content_preview=row["content_preview"],
        has_source_file=bool(source_path),
        x=row["x"],
        y=row["y"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        published_at=row["published_at"],
    )


def _knowledge_map_point_from_row(row: dict[str, Any], tag_ids: Sequence[str] | None = None) -> KnowledgeMapPoint:
    return KnowledgeMapPoint(
        id=row["id"],
        title=row["title"],
        x=row["x"],
        y=row["y"],
        cluster_id=row["cluster_id"],
        cluster_label=row["cluster_label"],
        tags=_parse_tags(row["tags_json"]),
        tag_ids=list(tag_ids or []),
        summary_preview=row["summary"],
        source_type=row["source_type"],
        item_type=row["item_type"],
        year=row["year"],
        published_at=row["published_at"],
        review_status=row["review_status"],
    )


def _ensure_column(conn: sqlite3.Connection, table_name: str, column_name: str, definition: str) -> None:
    columns = {row["name"] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()}
    if column_name not in columns:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def _allowed_pdf_roots() -> list[Path]:
    roots = [
        Path("/Users/zhangjiyan/work_paper/agent_security"),
        Path("/Users/zhangjiyan/paper-reading/Safety-at-Scale-literature"),
    ]
    extra_roots = os.environ.get("KNOWLEDGE_PDF_ROOTS")
    if extra_roots:
        roots.extend(Path(root) for root in extra_roots.split(os.pathsep) if root.strip())
    return [root.resolve() for root in roots]


def _resolve_source_pdf(source_path: str | None) -> Path | None:
    if not source_path:
        return None
    path = Path(source_path).expanduser().resolve()
    if path.suffix.lower() != ".pdf" or not path.is_file():
        return None
    if not any(path.is_relative_to(root) for root in _allowed_pdf_roots()):
        return None
    return path


def _knowledge_coordinates(item_id: str, index_hint: int = 0) -> tuple[float, float]:
    """Generate stable local demo coordinates without external embeddings."""
    seed = sum(ord(char) for char in item_id) + index_hint * 37
    x = ((seed * 17) % 720) - 360
    y = ((seed * 31) % 520) - 260
    return float(x), float(y)


def _connect_knowledge_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_knowledge_schema() -> None:
    """Create the v1 knowledge tables and seed a small local demo dataset."""
    now = _now_iso()
    with _connect_knowledge_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_bases (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS knowledge_items (
                id TEXT PRIMARY KEY,
                knowledge_base_id TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT,
                tags_json TEXT NOT NULL DEFAULT '[]',
                cluster_id TEXT,
                cluster_label TEXT,
                source_type TEXT NOT NULL,
                item_type TEXT NOT NULL,
                author TEXT,
                year INTEGER,
                doi_url TEXT,
                source_name TEXT,
                visibility TEXT,
                review_status TEXT NOT NULL,
                reject_reason TEXT,
                content_preview TEXT,
                source_path TEXT,
                x REAL,
                y REAL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                published_at TEXT,
                FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                tag_group TEXT NOT NULL,
                parent_id TEXT,
                level INTEGER NOT NULL DEFAULT 0,
                path TEXT NOT NULL,
                description TEXT,
                synonyms_json TEXT NOT NULL DEFAULT '[]',
                sort_order INTEGER DEFAULT 0,
                is_system INTEGER DEFAULT 0,
                is_selectable INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (parent_id) REFERENCES tags(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS item_tags (
                item_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                source TEXT DEFAULT 'manual',
                confidence REAL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (item_id, tag_id),
                FOREIGN KEY (item_id) REFERENCES knowledge_items(id),
                FOREIGN KEY (tag_id) REFERENCES tags(id)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_tag_group ON tags(tag_group)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags(parent_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id)")
        _ensure_column(conn, "knowledge_items", "source_path", "TEXT")
        conn.execute(
            """
            INSERT OR IGNORE INTO knowledge_bases (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                "default",
                "高校科研知识库",
                "用于演示论文、笔记和项目资料审核入库后的二维知识地图。",
                now,
                now,
            ),
        )
        existing = conn.execute("SELECT COUNT(*) AS count FROM knowledge_items").fetchone()
        if existing and existing["count"] == 0:
            seed_items = [
                {
                    "id": "demo-paper-001",
                    "title": "科研论文阅读笔记中的隐私风险分类",
                    "summary": "整理 AI 隐私研究中的数据泄露、模型记忆与评测基准，为后续课题综述提供可审核条目。",
                    "tags": ["AI隐私", "论文综述", "风险分类"],
                    "cluster_id": "privacy",
                    "cluster_label": "AI 隐私与数据治理",
                    "source_type": "markdown",
                    "item_type": "note",
                    "author": "课题组示例",
                    "year": 2025,
                    "source_name": "reading-notes/privacy.md",
                    "review_status": "published",
                    "content_preview": "重点关注训练数据暴露、成员推断和生成内容中的隐私泄漏。",
                    "x": -180.0,
                    "y": -70.0,
                },
                {
                    "id": "demo-paper-002",
                    "title": "高校科研项目资料的审核入库流程",
                    "summary": "定义上传、待审核、补全元数据、发布到知识地图的人工审核闭环。",
                    "tags": ["审核流程", "知识库", "科研管理"],
                    "cluster_id": "workflow",
                    "cluster_label": "科研资料审核流程",
                    "source_type": "manual",
                    "item_type": "project_doc",
                    "author": "管理员",
                    "year": 2026,
                    "source_name": "manual-entry",
                    "review_status": "published",
                    "content_preview": "上传成功不等于发布成功，所有资料必须经管理员审核。",
                    "x": 35.0,
                    "y": 120.0,
                },
                {
                    "id": "demo-paper-003",
                    "title": "AI 安全论文二维地图的聚类标签维护",
                    "summary": "记录如何用人工确认的聚类标签辅助研究人员浏览论文集合。",
                    "tags": ["AI安全", "知识地图", "聚类"],
                    "cluster_id": "safety-map",
                    "cluster_label": "AI 安全知识地图",
                    "source_type": "pdf",
                    "item_type": "paper",
                    "author": "研究助理",
                    "year": 2024,
                    "source_name": "aella-sample.pdf",
                    "review_status": "published",
                    "content_preview": "聚类标签用于提高可解释性，但发布前仍需要人工确认。",
                    "x": 220.0,
                    "y": -20.0,
                },
                {
                    "id": "demo-review-001",
                    "title": "待审核：课程材料中的模型评测案例",
                    "summary": "这条资料用于演示待审核状态，不应出现在知识地图中。",
                    "tags": ["待审核", "课程材料"],
                    "cluster_id": "course",
                    "cluster_label": "课程与教学材料",
                    "source_type": "txt",
                    "item_type": "course_material",
                    "author": "上传用户",
                    "year": 2026,
                    "source_name": "evaluation-course.txt",
                    "review_status": "pending_review",
                    "content_preview": "管理员需要补全年份、标签和摘要后再决定是否发布。",
                    "x": -300.0,
                    "y": 180.0,
                },
            ]
            for item in seed_items:
                published_at = now if item["review_status"] == "published" else None
                conn.execute(
                    """
                    INSERT INTO knowledge_items (
                        id, knowledge_base_id, title, summary, tags_json, cluster_id, cluster_label,
                        source_type, item_type, author, year, doi_url, source_name, visibility,
                        review_status, reject_reason, content_preview, x, y, created_at, updated_at, published_at
                    )
                    VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, '课题组可见', ?, NULL, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["title"],
                        item["summary"],
                        _json_tags(item["tags"]),
                        item["cluster_id"],
                        item["cluster_label"],
                        item["source_type"],
                        item["item_type"],
                        item["author"],
                        item["year"],
                        item["source_name"],
                        item["review_status"],
                        item["content_preview"],
                        item["x"],
                        item["y"],
                        now,
                        now,
                        published_at,
                    ),
                )
        conn.commit()


def _fetch_knowledge_item(conn: sqlite3.Connection, item_id: str) -> KnowledgeItem | None:
    row = conn.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        return None
    tag_ids = _fetch_item_tag_ids(conn, item_id)
    return _knowledge_item_from_row(dict(row), tag_ids)


def _normalize_tag_ids(tag_ids: Sequence[str] | None) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for tag_id in tag_ids or []:
        clean_tag_id = str(tag_id).strip()
        if not clean_tag_id or clean_tag_id in seen:
            continue
        seen.add(clean_tag_id)
        normalized.append(clean_tag_id)
    return normalized


def _fetch_item_tag_ids(conn: sqlite3.Connection, item_id: str) -> list[str]:
    rows = conn.execute(
        """
        SELECT it.tag_id
        FROM item_tags it
        LEFT JOIN tags t ON t.id = it.tag_id
        WHERE it.item_id = ?
        ORDER BY COALESCE(t.sort_order, 0), COALESCE(t.name, it.tag_id), it.created_at
        """,
        (item_id,),
    ).fetchall()
    return [row["tag_id"] for row in rows]


def _fetch_item_tag_ids_map(
    conn: sqlite3.Connection,
    item_ids: Sequence[str],
) -> dict[str, list[str]]:
    normalized_item_ids = _normalize_tag_ids(item_ids)
    if not normalized_item_ids:
        return {}
    placeholders = ",".join("?" for _ in normalized_item_ids)
    rows = conn.execute(
        f"""
        SELECT it.item_id, it.tag_id
        FROM item_tags it
        LEFT JOIN tags t ON t.id = it.tag_id
        WHERE it.item_id IN ({placeholders})
        ORDER BY it.item_id, COALESCE(t.sort_order, 0), COALESCE(t.name, it.tag_id), it.created_at
        """,
        normalized_item_ids,
    ).fetchall()
    tag_ids_by_item_id = {item_id: [] for item_id in normalized_item_ids}
    for row in rows:
        tag_ids_by_item_id.setdefault(row["item_id"], []).append(row["tag_id"])
    return tag_ids_by_item_id


async def _fetch_item_tag_ids_map_from_db(
    db: BaseDatabase,
    item_ids: Sequence[str],
) -> dict[str, list[str]]:
    normalized_item_ids = _normalize_tag_ids(item_ids)
    if not normalized_item_ids:
        return {}
    tag_ids_by_item_id = {item_id: [] for item_id in normalized_item_ids}
    batch_size = 80
    for start in range(0, len(normalized_item_ids), batch_size):
        batch = normalized_item_ids[start : start + batch_size]
        placeholders = ",".join("?" for _ in batch)
        rows = await db.fetch_all(
            f"""
            SELECT it.item_id, it.tag_id
            FROM item_tags it
            LEFT JOIN tags t ON t.id = it.tag_id
            WHERE it.item_id IN ({placeholders})
            ORDER BY it.item_id, COALESCE(t.sort_order, 0), COALESCE(t.name, it.tag_id), it.created_at
            """,
            batch,
        )
        for row in rows:
            tag_ids_by_item_id.setdefault(row["item_id"], []).append(row["tag_id"])
    return tag_ids_by_item_id


def _validate_item_tag_ids(
    conn: sqlite3.Connection,
    tag_ids: Sequence[str] | None,
    *,
    require_content_type: bool = False,
) -> list[str]:
    normalized_tag_ids = _normalize_tag_ids(tag_ids)
    if not normalized_tag_ids:
        return []

    placeholders = ",".join("?" for _ in normalized_tag_ids)
    rows = conn.execute(
        f"""
        SELECT id, name, tag_group, is_active
        FROM tags
        WHERE id IN ({placeholders})
        """,
        normalized_tag_ids,
    ).fetchall()
    rows_by_id = {row["id"]: row for row in rows}
    missing_tag_ids = [tag_id for tag_id in normalized_tag_ids if tag_id not in rows_by_id]
    if missing_tag_ids:
        raise HTTPException(status_code=400, detail=f"标签不存在：{', '.join(missing_tag_ids)}")

    inactive_tags = [rows_by_id[tag_id]["name"] for tag_id in normalized_tag_ids if not bool(rows_by_id[tag_id]["is_active"])]
    if inactive_tags:
        raise HTTPException(status_code=400, detail=f"标签已禁用，不能绑定：{'、'.join(inactive_tags)}")

    if require_content_type and not any(rows_by_id[tag_id]["tag_group"] == "content_type" for tag_id in normalized_tag_ids):
        raise HTTPException(status_code=400, detail="请选择内容类型标签后再发布")

    return normalized_tag_ids


def _replace_item_tags(
    conn: sqlite3.Connection,
    *,
    item_id: str,
    tag_ids: Sequence[str],
    source: str,
    now: str,
) -> None:
    conn.execute("DELETE FROM item_tags WHERE item_id = ?", (item_id,))
    for tag_id in tag_ids:
        conn.execute(
            """
            INSERT INTO item_tags (item_id, tag_id, source, confidence, created_at)
            VALUES (?, ?, ?, NULL, ?)
            """,
            (item_id, tag_id, source, now),
        )


def _slugify_tag_name(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or f"tag-{uuid.uuid4().hex[:8]}"


def _tag_from_row(row: dict[str, Any]) -> Tag:
    return Tag(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        tag_group=row["tag_group"],
        parent_id=row["parent_id"],
        level=row["level"],
        path=row["path"],
        description=row["description"],
        synonyms=_parse_tags(row["synonyms_json"]),
        sort_order=row["sort_order"] or 0,
        is_system=bool(row["is_system"]),
        is_selectable=bool(row["is_selectable"]),
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _public_tag_from_row(row: dict[str, Any]) -> PublicTag:
    return PublicTag(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        tag_group=row["tag_group"],
        parent_id=row["parent_id"],
        level=row["level"],
        path=row["path"],
        description=row["description"],
        synonyms=_parse_tags(row["synonyms_json"]),
        sort_order=row["sort_order"] or 0,
        is_system=bool(row["is_system"]),
        is_selectable=bool(row["is_selectable"]),
    )


def _fetch_tag(conn: sqlite3.Connection, tag_id: str) -> Tag | None:
    row = conn.execute("SELECT * FROM tags WHERE id = ?", (tag_id,)).fetchone()
    if not row:
        return None
    return _tag_from_row(dict(row))


def _ensure_unique_tag_name(
    conn: sqlite3.Connection,
    *,
    tag_group: str,
    parent_id: str | None,
    name: str,
    exclude_id: str | None = None,
) -> None:
    sql = "SELECT id FROM tags WHERE tag_group = ? AND name = ?"
    params: list[Any] = [tag_group, name]
    if parent_id:
        sql += " AND parent_id = ?"
        params.append(parent_id)
    else:
        sql += " AND parent_id IS NULL"
    if exclude_id:
        sql += " AND id != ?"
        params.append(exclude_id)
    if conn.execute(sql, params).fetchone():
        raise HTTPException(status_code=400, detail="同一标签组和父级下已存在同名标签")


def _unique_tag_slug(conn: sqlite3.Connection, tag_group: str, base_slug: str) -> str:
    slug = base_slug
    while conn.execute(
        "SELECT 1 FROM tags WHERE tag_group = ? AND slug = ?",
        (tag_group, slug),
    ).fetchone():
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    return slug


async def _fetch_tag_from_db(db: BaseDatabase, tag_id: str) -> Tag | None:
    row = await db.fetch_one("SELECT * FROM tags WHERE id = ?", (tag_id,))
    if not row:
        return None
    return _tag_from_row(row)


async def _ensure_unique_tag_name_db(
    db: BaseDatabase,
    *,
    tag_group: str,
    parent_id: str | None,
    name: str,
    exclude_id: str | None = None,
) -> None:
    sql = "SELECT id FROM tags WHERE tag_group = ? AND name = ?"
    params: list[Any] = [tag_group, name]
    if parent_id:
        sql += " AND parent_id = ?"
        params.append(parent_id)
    else:
        sql += " AND parent_id IS NULL"
    if exclude_id:
        sql += " AND id != ?"
        params.append(exclude_id)
    if await db.fetch_one(sql, params):
        raise HTTPException(status_code=400, detail="同一标签组和父级下已存在同名标签")


async def _unique_tag_slug_db(db: BaseDatabase, tag_group: str, base_slug: str) -> str:
    slug = base_slug
    while await db.fetch_one(
        "SELECT 1 FROM tags WHERE tag_group = ? AND slug = ?",
        (tag_group, slug),
    ):
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    return slug


async def _seed_default_tags_db(db: BaseDatabase) -> int:
    """Import default tag seed data through the active database client."""
    rows = flatten_tag_tree(DEFAULT_TAG_TREE)
    existing_rows = await db.fetch_all("SELECT id FROM tags")
    existing_ids = {row["id"] for row in existing_rows}
    id_remap: dict[str, str] = {}
    now = _now_iso()
    inserted_count = 0

    for row in rows:
        existing_id = row["id"] if row["id"] in existing_ids else None
        parent_id = id_remap.get(row["parent_id"] or "", row["parent_id"])
        if existing_id:
            await db.execute(
                """
                UPDATE tags
                SET name = ?, slug = ?, tag_group = ?, parent_id = ?, level = ?,
                    path = ?, description = ?, synonyms_json = ?,
                    sort_order = ?, is_system = ?, is_selectable = ?,
                    is_active = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    row["name"],
                    row["slug"],
                    row["tag_group"],
                    parent_id,
                    row["level"],
                    row["path"],
                    row["description"],
                    json.dumps(row["synonyms"], ensure_ascii=False),
                    row["sort_order"],
                    int(row["is_system"]),
                    int(row["is_selectable"]),
                    int(row["is_active"]),
                    now,
                    row["id"],
                ),
            )
            id_remap[row["id"]] = existing_id
            continue

        await db.execute(
            """
            INSERT INTO tags (
                id, name, slug, tag_group, parent_id, level, path, description,
                synonyms_json, sort_order, is_system, is_selectable, is_active,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["id"],
                row["name"],
                row["slug"],
                row["tag_group"],
                parent_id,
                row["level"],
                row["path"],
                row["description"],
                json.dumps(row["synonyms"], ensure_ascii=False),
                row["sort_order"],
                int(row["is_system"]),
                int(row["is_selectable"]),
                int(row["is_active"]),
                now,
                now,
            ),
        )
        existing_ids.add(row["id"])
        id_remap[row["id"]] = row["id"]
        inserted_count += 1

    active_seed_ids = {row["id"] for row in rows}
    batch_size = 80
    stale_ids = await db.fetch_all(
        """
        SELECT id
        FROM tags
        WHERE tag_group = 'research_topic'
          AND path LIKE 'research_topic/ai-security/%'
        """,
    )
    stale_seed_ids = [
        row["id"]
        for row in stale_ids
        if row["id"] not in active_seed_ids
    ]
    for start in range(0, len(stale_seed_ids), batch_size):
        batch = stale_seed_ids[start : start + batch_size]
        placeholders = ",".join("?" for _ in batch)
        await db.execute(
            f"""
            UPDATE tags
            SET is_active = 0, is_selectable = 0, updated_at = ?
            WHERE id IN ({placeholders})
            """,
            [now, *batch],
        )
    return inserted_count


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "LAION 论文可视化 API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/papers")
async def get_papers(
    request: Request,
    cluster_id: int | None = Query(None, description="按聚类 ID 过滤"),
    limit: int | None = Query(None, description="限制结果数量"),
    sample_size: int | None = Query(None, description="每个聚类抽取 N 篇最新论文"),
):
    """Get all papers with coordinates and cluster information (gzip compressed)."""
    start_time = time.time()

    # Check if R2 cache is available (production mode)
    # Only use R2 cache if no filters are applied (full dataset request)
    env = request.scope.get("env")
    r2_assets_url = getattr(env, "R2_ASSETS_URL", None) if env else None

    if r2_assets_url and cluster_id is None and limit is None and sample_size is None:
        # Fetch from R2 cache using native Workers fetch API
        logger.info(f"Fetching papers from R2: {r2_assets_url}")
        try:
            from js import fetch as js_fetch

            r2_url = f"{r2_assets_url}/cache-papers.gz"
            response = await js_fetch(r2_url)

            if not response.ok:
                raise Exception(f"R2 fetch failed with status {response.status}")

            # Get the response as bytes (arrayBuffer)
            array_buffer = await response.arrayBuffer()
            # Convert JavaScript ArrayBuffer to Python bytes
            content = bytes(array_buffer.to_py())

            # Return the gzipped content directly
            return Response(
                content=content,
                media_type="application/octet-stream",
                headers={"X-Content-Compressed": "gzip"},
            )
        except Exception as e:
            logger.warning(f"Failed to fetch from R2, falling back to database: {e}")
            # Fall through to database query

    db = get_database(request)

    # Query papers table directly
    # If sample_size is specified, use a subquery approach with GROUP BY and random sampling
    if sample_size is not None and cluster_id is None:
        query_start = time.time()

        # Use a simpler approach: get papers ordered by cluster and year,
        # then limit in Python (more efficient than N queries)
        # But ONLY fetch what we need with LIMIT
        max_clusters = 100
        max_fetch = sample_size * max_clusters  # Fetch at most this many total

        all_rows = await db.fetch_all(
            """
            SELECT id, title, x, y, z, cluster_id,
                   COALESCE(claude_label, cluster_label) as cluster_label,
                   field_subfield, publication_year, classification
            FROM papers
            WHERE x IS NOT NULL AND y IS NOT NULL AND cluster_id IS NOT NULL
            ORDER BY cluster_id, publication_year DESC, id DESC
            LIMIT ?
            """,
            (max_fetch,),
        )

        # Sample N papers per cluster in Python (fast since data is pre-sorted)
        cluster_samples = {}
        for row in all_rows:
            cid = row["cluster_id"]
            if cid not in cluster_samples:
                cluster_samples[cid] = []
            if len(cluster_samples[cid]) < sample_size:
                cluster_samples[cid].append(row)

        # Flatten back to a list
        rows = []
        for cid in sorted(cluster_samples.keys()):
            rows.extend(cluster_samples[cid])

        query_time = time.time() - query_start
        logger.info(f"DB Query (sample_size={sample_size}): {query_time:.3f}s, fetched {len(all_rows)} rows, sampled {len(rows)} papers from {len(cluster_samples)} clusters")
    else:
        # Original query for full data or single cluster
        query = """
            SELECT id, title, x, y, z, cluster_id,
                   COALESCE(claude_label, cluster_label) as cluster_label,
                   field_subfield, publication_year, classification
            FROM papers
            WHERE x IS NOT NULL AND y IS NOT NULL
        """
        params: list[Any] = []

        if cluster_id is not None:
            query += " AND cluster_id = ?"
            params.append(cluster_id)

        query += " ORDER BY id"

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        query_start = time.time()
        rows = await db.fetch_all(query, params)
        query_time = time.time() - query_start

        logger.info(f"DB Query (cluster_id={cluster_id}, limit={limit}): {query_time:.3f}s, returned {len(rows)} papers")

    papers = [
        PaperSummary(
            id=row["id"],
            title=row["title"],
            x=row["x"],
            y=row["y"],
            z=row["z"],
            cluster_id=row["cluster_id"],
            cluster_label=row["cluster_label"],
            field_subfield=row["field_subfield"],
            publication_year=row["publication_year"],
            classification=row["classification"],
        )
        for row in rows
    ]

    response_data = PapersResponse(papers=papers)

    # Compress the JSON response
    serialization_start = time.time()
    json_str = json.dumps(response_data.model_dump())
    serialization_time = time.time() - serialization_start

    compression_start = time.time()
    compressed_content = gzip.compress(json_str.encode("utf-8"), compresslevel=6)
    compression_time = time.time() - compression_start

    total_time = time.time() - start_time

    uncompressed_size = len(json_str.encode("utf-8"))
    compressed_size = len(compressed_content)
    compression_ratio = (compressed_size / uncompressed_size) * 100

    logger.info(f"Serialization: {serialization_time:.3f}s, Compression: {compression_time:.3f}s, Total: {total_time:.3f}s")
    logger.info(f"Size: {uncompressed_size:,} -> {compressed_size:,} bytes ({compression_ratio:.1f}% compression)")

    return Response(
        content=compressed_content,
        media_type="application/octet-stream",
        headers={"X-Content-Compressed": "gzip"},
    )


@app.get("/api/papers/{paper_id}", response_model=PaperDetail)
async def get_paper(paper_id: int, request: Request):
    """Get detailed information for a specific paper, including nearest papers."""
    db = get_database(request)

    # Note: 'sample' column excluded from query (not available in D1)
    row = await db.fetch_one(
        """
        SELECT id, title, summarization, x, y, z, cluster_id,
               COALESCE(claude_label, cluster_label) as cluster_label,
               field_subfield, publication_year, classification, nearest_paper_ids
        FROM papers
        WHERE id = ?
    """,
        (paper_id,),
    )

    if not row:
        raise HTTPException(status_code=404, detail="未找到论文")

    # Fetch nearest papers if pre-computed IDs exist
    nearest_papers = []
    if row["nearest_paper_ids"]:
        try:
            nearest_ids = json.loads(row["nearest_paper_ids"])
            if nearest_ids:
                # Fetch papers by IDs
                placeholders = ",".join("?" * len(nearest_ids))
                nearest_rows = await db.fetch_all(
                    f"""
                    SELECT id, title, x, y, z, cluster_id,
                           COALESCE(claude_label, cluster_label) as cluster_label,
                           field_subfield, publication_year, classification
                    FROM papers
                    WHERE id IN ({placeholders})
                """,
                    nearest_ids,
                )

                # Maintain order from nearest_ids
                row_map = {r["id"]: r for r in nearest_rows}
                ordered_rows = [row_map[pid] for pid in nearest_ids if pid in row_map]

                nearest_papers = [
                    PaperSummary(
                        id=r["id"],
                        title=r["title"],
                        x=r["x"],
                        y=r["y"],
                        z=r["z"],
                        cluster_id=r["cluster_id"],
                        cluster_label=r["cluster_label"],
                        field_subfield=r["field_subfield"],
                        publication_year=r["publication_year"],
                        classification=r["classification"],
                    )
                    for r in ordered_rows
                ]
        except (json.JSONDecodeError, KeyError):
            logger.warning(f"Failed to parse nearest_paper_ids for paper {paper_id}")
            # nearest_papers remains empty list

    return PaperDetail(
        id=row["id"],
        title=row["title"],
        sample=None,  # Excluded from query (not in D1)
        summarization=row["summarization"],
        x=row["x"],
        y=row["y"],
        z=row["z"],
        cluster_id=row["cluster_id"],
        cluster_label=row["cluster_label"],
        field_subfield=row["field_subfield"],
        publication_year=row["publication_year"],
        classification=row["classification"],
        nearest_papers=nearest_papers,
    )


@app.get("/api/clusters", response_model=ClustersResponse)
async def get_clusters(request: Request):
    """Get cluster statistics and colors."""
    start_time = time.time()

    # Check if R2 cache is available (production mode)
    env = request.scope.get("env")
    r2_assets_url = getattr(env, "R2_ASSETS_URL", None) if env else None

    if r2_assets_url:
        # Fetch from R2 cache using native Workers fetch API
        logger.info(f"Fetching clusters from R2: {r2_assets_url}")
        try:
            from js import fetch as js_fetch

            r2_url = f"{r2_assets_url}/cache-clusters.gz"
            response = await js_fetch(r2_url)

            if not response.ok:
                raise Exception(f"R2 fetch failed with status {response.status}")

            # Get the response as bytes (arrayBuffer)
            array_buffer = await response.arrayBuffer()
            # Convert JavaScript ArrayBuffer to Python bytes
            content = bytes(array_buffer.to_py())

            # Decompress and return as JSON
            decompressed = gzip.decompress(content)
            return JSONResponse(content=json.loads(decompressed))
        except Exception as e:
            logger.warning(f"Failed to fetch from R2, falling back to database: {e}")
            # Fall through to database query

    db = get_database(request)

    # Query papers table directly
    rows = await db.fetch_all(
        """
        SELECT cluster_id,
               COALESCE(claude_label, cluster_label) as cluster_label,
               COUNT(*) as count
        FROM papers
        WHERE cluster_id IS NOT NULL AND x IS NOT NULL
        GROUP BY cluster_id, COALESCE(claude_label, cluster_label)
        ORDER BY cluster_id
    """
    )

    clusters = [
        ClusterInfo(
            cluster_id=row["cluster_id"],
            cluster_label=row["cluster_label"],
            count=row["count"],
            color=get_cluster_color(row["cluster_id"]),
        )
        for row in rows
    ]

    total_time = time.time() - start_time
    logger.info(f"Generated clusters response in {total_time:.3f}s")

    return ClustersResponse(clusters=clusters)


@app.get("/api/search")
async def search_papers(
    request: Request,
    q: str = Query(..., description="用于搜索标题或领域的查询词"),
    limit: int = Query(100, description="最大结果数量"),
):
    """Search papers by title or field (gzip compressed)."""
    db = get_database(request)

    query = """
        SELECT id, title, x, y, z, cluster_id,
               COALESCE(claude_label, cluster_label) as cluster_label,
               field_subfield, publication_year, classification
        FROM papers
        WHERE x IS NOT NULL AND y IS NOT NULL
            AND (title LIKE ? OR field_subfield LIKE ?)
        ORDER BY id
        LIMIT ?
    """
    search_pattern = f"%{q}%"
    rows = await db.fetch_all(query, (search_pattern, search_pattern, limit))

    papers = [
        PaperSummary(
            id=row["id"],
            title=row["title"],
            x=row["x"],
            y=row["y"],
            z=row["z"],
            cluster_id=row["cluster_id"],
            cluster_label=row["cluster_label"],
            field_subfield=row["field_subfield"],
            publication_year=row["publication_year"],
            classification=row["classification"],
        )
        for row in rows
    ]

    response_data = PapersResponse(papers=papers)

    # Compress the JSON response
    json_str = json.dumps(response_data.model_dump())
    compressed_content = gzip.compress(json_str.encode("utf-8"), compresslevel=6)

    return Response(
        content=compressed_content,
        media_type="application/octet-stream",
        headers={"X-Content-Compressed": "gzip"},
    )


@app.get("/api/papers/{paper_id}/nearest", response_model=PapersResponse)
async def get_nearest_papers(
    request: Request,
    paper_id: int,
    limit: int = Query(15, description="返回的相近论文数量"),
):
    """Get the nearest papers to a given paper based on Euclidean distance in embedding space."""
    db = get_database(request)

    # Try to use pre-computed nearest neighbors first (fast path)
    target_paper = await db.fetch_one(
        """
        SELECT nearest_paper_ids, x, y, z
        FROM papers
        WHERE id = ?
    """,
        (paper_id,),
    )

    if not target_paper:
        raise HTTPException(status_code=404, detail="未找到论文")

    # Fast path: use pre-computed nearest neighbors if available
    if target_paper["nearest_paper_ids"]:
        try:
            nearest_ids = json.loads(target_paper["nearest_paper_ids"])
            # Limit to requested number
            nearest_ids = nearest_ids[:limit]

            if nearest_ids:
                # Fetch papers by IDs
                placeholders = ",".join("?" * len(nearest_ids))
                rows = await db.fetch_all(
                    f"""
                    SELECT id, title, x, y, z, cluster_id,
                           COALESCE(claude_label, cluster_label) as cluster_label,
                           field_subfield, publication_year, classification
                    FROM papers
                    WHERE id IN ({placeholders})
                """,
                    nearest_ids,
                )

                # Maintain order from nearest_ids
                row_map = {row["id"]: row for row in rows}
                ordered_rows = [row_map[pid] for pid in nearest_ids if pid in row_map]

                papers = [
                    PaperSummary(
                        id=row["id"],
                        title=row["title"],
                        x=row["x"],
                        y=row["y"],
                        z=row["z"],
                        cluster_id=row["cluster_id"],
                        cluster_label=row["cluster_label"],
                        field_subfield=row["field_subfield"],
                        publication_year=row["publication_year"],
                        classification=row["classification"],
                    )
                    for row in ordered_rows
                ]

                return PapersResponse(papers=papers)
        except (json.JSONDecodeError, KeyError):
            logger.warning(f"Failed to parse pre-computed nearest neighbors for paper {paper_id}, falling back to distance calculation")
            # Fall through to slow path

    # Slow path: compute distances in real-time (fallback for papers without pre-computed data)
    if target_paper["x"] is None or target_paper["y"] is None:
        raise HTTPException(status_code=404, detail="论文没有坐标数据")

    target_x, target_y, target_z = target_paper["x"], target_paper["y"], target_paper["z"]
    target_z = target_z if target_z is not None else 0.0

    logger.info(f"Computing nearest neighbors in real-time for paper {paper_id} (pre-computed data not available)")

    # Find nearest papers using Euclidean distance. SQLite doesn't include sqrt, so we sort on squared distance.
    rows = await db.fetch_all(
        """
        SELECT id, title, x, y, z, cluster_id,
               COALESCE(claude_label, cluster_label) as cluster_label,
               field_subfield, publication_year, classification,
               ((x - ?) * (x - ?) + (y - ?) * (y - ?) +
                (COALESCE(z, 0) - ?) * (COALESCE(z, 0) - ?)) as distance_sq
        FROM papers
        WHERE x IS NOT NULL AND y IS NOT NULL AND id != ?
        ORDER BY distance_sq
        LIMIT ?
    """,
        (
            target_x,
            target_x,
            target_y,
            target_y,
            target_z,
            target_z,
            paper_id,
            limit,
        ),
    )

    papers = [
        PaperSummary(
            id=row["id"],
            title=row["title"],
            x=row["x"],
            y=row["y"],
            z=row["z"],
            cluster_id=row["cluster_id"],
            cluster_label=row["cluster_label"],
            field_subfield=row["field_subfield"],
            publication_year=row["publication_year"],
            classification=row["classification"],
        )
        for row in rows
    ]

    return PapersResponse(papers=papers)


@app.get("/api/stats")
async def get_stats(request: Request):
    """Get overall statistics."""
    db = get_database(request)

    total_row = await db.fetch_one("SELECT COUNT(*) as total FROM papers")
    total = total_row["total"] if total_row else 0

    with_coords_row = await db.fetch_one("SELECT COUNT(*) as with_coords FROM papers WHERE x IS NOT NULL")
    with_coords = with_coords_row["with_coords"] if with_coords_row else 0

    num_clusters_row = await db.fetch_one("SELECT COUNT(DISTINCT cluster_id) as num_clusters FROM papers WHERE cluster_id IS NOT NULL")
    num_clusters = num_clusters_row["num_clusters"] if num_clusters_row else 0

    return {
        "total_papers": total,
        "papers_with_coordinates": with_coords,
        "num_clusters": num_clusters,
    }


@app.get("/api/temporal-data", response_model=TemporalDataResponse)
async def get_temporal_data(
    request: Request,
    min_year: int = Query(1990, description="最小发表年份"),
    max_year: int = Query(2025, description="最大发表年份"),
):
    """Get temporal evolution data showing paper counts per cluster per year."""
    db = get_database(request)

    rows = await db.fetch_all(
        """
        SELECT
            cluster_id,
            COALESCE(claude_label, cluster_label) as cluster_label,
            publication_year,
            COUNT(*) as count
        FROM papers
        WHERE cluster_id IS NOT NULL
            AND publication_year IS NOT NULL
            AND publication_year >= ?
            AND publication_year <= ?
        GROUP BY cluster_id, cluster_label, publication_year
        ORDER BY cluster_id, publication_year
    """,
        (min_year, max_year),
    )

    # Organize data by cluster
    cluster_data_map: dict[int, dict[str, Any]] = {}
    for row in rows:
        cluster_id = row["cluster_id"]
        cluster_label = row["cluster_label"]
        year = row["publication_year"]
        count = row["count"]

        if cluster_id not in cluster_data_map:
            cluster_data_map[cluster_id] = {
                "cluster_id": cluster_id,
                "cluster_label": cluster_label,
                "color": get_cluster_color(cluster_id),
                "temporal_data": [],
            }

        cluster_data_map[cluster_id]["temporal_data"].append({"year": int(year), "count": count})

    # Convert to list and create response objects
    clusters = [
        ClusterTemporalData(
            cluster_id=data["cluster_id"],
            cluster_label=data["cluster_label"],
            color=data["color"],
            temporal_data=[TemporalDataPoint(year=point["year"], count=point["count"]) for point in data["temporal_data"]],
        )
        for data in cluster_data_map.values()
    ]

    return TemporalDataResponse(clusters=clusters)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/tags", response_model=list[PublicTag])
async def get_public_tags(
    request: Request,
    tag_group: str | None = Query(None, description="标签组"),
    q: str | None = Query(None, description="按名称、slug、描述或同义词搜索"),
):
    """List active structured tags for user-facing filtering and display."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    where = ["is_active = 1"]
    params: list[Any] = []

    if tag_group:
        where.append("tag_group = ?")
        params.append(tag_group)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        where.append("(name LIKE ? OR slug LIKE ? OR description LIKE ? OR synonyms_json LIKE ?)")
        params.extend([pattern, pattern, pattern, pattern])

    where_sql = " AND ".join(where)
    db = get_database(request)
    rows = await db.fetch_all(
        f"""
        SELECT *
        FROM tags
        WHERE {where_sql}
        ORDER BY tag_group, level, sort_order, name
        """,
        params,
    )
    return [_public_tag_from_row(dict(row)) for row in rows]


@app.get("/api/tags/tree", response_model=list[PublicTagNode])
async def get_public_tag_tree(
    request: Request,
    tag_group: str | None = Query(None, description="标签组"),
):
    """Return active structured tags as a read-only user-facing tree."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    where = ["is_active = 1"]
    params: list[Any] = []
    if tag_group:
        where.append("tag_group = ?")
        params.append(tag_group)

    where_sql = " AND ".join(where)
    db = get_database(request)
    rows = await db.fetch_all(
        f"""
        SELECT *
        FROM tags
        WHERE {where_sql}
        ORDER BY tag_group, level, sort_order, name
        """,
        params,
    )

    nodes_by_id = {
        row["id"]: PublicTagNode(**_public_tag_from_row(dict(row)).model_dump(), children=[])
        for row in rows
    }
    roots: list[PublicTagNode] = []
    for node in nodes_by_id.values():
        if node.parent_id and node.parent_id in nodes_by_id:
            nodes_by_id[node.parent_id].children.append(node)
        else:
            roots.append(node)

    def sort_tree(nodes: list[PublicTagNode]) -> None:
        nodes.sort(key=lambda tag: (tag.tag_group, tag.sort_order, tag.name))
        for tag in nodes:
            tag.children.sort(key=lambda child: (child.sort_order, child.name))
            sort_tree(tag.children)

    sort_tree(roots)
    return roots


@app.get("/api/admin/tags", response_model=list[Tag])
async def get_admin_tags(
    request: Request,
    tag_group: str | None = Query(None, description="标签组"),
    parent_id: str | None = Query(None, description="父标签 ID；空字符串表示根标签"),
    is_active: bool | None = Query(None, description="是否启用"),
    q: str | None = Query(None, description="按名称、slug、描述或同义词搜索"),
):
    """List structured tags for admin management."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    where: list[str] = []
    params: list[Any] = []

    if tag_group:
        where.append("tag_group = ?")
        params.append(tag_group)
    if parent_id is not None:
        if parent_id == "":
            where.append("parent_id IS NULL")
        else:
            where.append("parent_id = ?")
            params.append(parent_id)
    if is_active is not None:
        where.append("is_active = ?")
        params.append(int(is_active))
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        where.append("(name LIKE ? OR slug LIKE ? OR description LIKE ? OR synonyms_json LIKE ?)")
        params.extend([pattern, pattern, pattern, pattern])

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    db = get_database(request)
    rows = await db.fetch_all(
        f"""
        SELECT *
        FROM tags
        {where_sql}
        ORDER BY tag_group, level, sort_order, name
        """,
        params,
    )
    return [_tag_from_row(dict(row)) for row in rows]


@app.get("/api/admin/tags/tree", response_model=list[TagNode])
async def get_admin_tag_tree(
    request: Request,
    tag_group: str | None = Query(None, description="标签组"),
    include_inactive: bool = Query(False, description="是否包含禁用标签"),
):
    """Return structured tags as a tree for admin taxonomy management."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    where: list[str] = []
    params: list[Any] = []
    if tag_group:
        where.append("tag_group = ?")
        params.append(tag_group)
    if not include_inactive:
        where.append("is_active = 1")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    db = get_database(request)
    rows = await db.fetch_all(
        f"""
        SELECT *
        FROM tags
        {where_sql}
        ORDER BY tag_group, level, sort_order, name
        """,
        params,
    )

    nodes_by_id = {
        row["id"]: TagNode(**_tag_from_row(dict(row)).model_dump(), children=[])
        for row in rows
    }
    roots: list[TagNode] = []
    for node in nodes_by_id.values():
        if node.parent_id and node.parent_id in nodes_by_id:
            nodes_by_id[node.parent_id].children.append(node)
        else:
            roots.append(node)

    def sort_tree(nodes: list[TagNode]) -> None:
        nodes.sort(key=lambda tag: (tag.tag_group, tag.sort_order, tag.name))
        for tag in nodes:
            tag.children.sort(key=lambda child: (child.sort_order, child.name))
            sort_tree(tag.children)

    sort_tree(roots)
    return roots


@app.post("/api/admin/tags/seed", response_model=TagSeedResult)
async def seed_admin_tags(request: Request):
    """Import the default research taxonomy idempotently."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    total_count = len(flatten_tag_tree(DEFAULT_TAG_TREE))
    if request.scope.get("env") is None:
        with _connect_knowledge_db() as conn:
            inserted_count = seed_default_tags(conn)
    else:
        inserted_count = await _seed_default_tags_db(get_database(request))
    return TagSeedResult(
        inserted_count=inserted_count,
        skipped_count=max(total_count - inserted_count, 0),
        total_count=total_count,
    )


@app.get("/api/admin/tags/stats", response_model=list[TagUsageStats])
async def get_admin_tag_stats(request: Request):
    """Return usage counters for every structured tag."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    db = get_database(request)
    rows = await db.fetch_all(
        """
        SELECT
            t.id AS tag_id,
            COUNT(DISTINCT ki.id) AS item_count,
            COUNT(DISTINCT CASE WHEN ki.review_status = 'published' THEN it.item_id END) AS published_item_count,
            COUNT(DISTINCT CASE WHEN ki.review_status = 'pending_review' THEN it.item_id END) AS pending_review_item_count,
            MAX(it.created_at) AS last_used_at
        FROM tags t
        LEFT JOIN item_tags it ON it.tag_id = t.id
        LEFT JOIN knowledge_items ki ON ki.id = it.item_id
        GROUP BY t.id
        ORDER BY t.tag_group, t.level, t.sort_order, t.name
        """
    )
    return [
        TagUsageStats(
            tag_id=row["tag_id"],
            item_count=row["item_count"] or 0,
            published_item_count=row["published_item_count"] or 0,
            pending_review_item_count=row["pending_review_item_count"] or 0,
            last_used_at=row["last_used_at"],
        )
        for row in rows
    ]


@app.post("/api/admin/tags", response_model=Tag)
async def create_admin_tag(request: Request, payload: TagPayload):
    """Create one admin-managed structured tag."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    name = payload.name.strip()
    tag_group = payload.tag_group.strip()
    parent_id = payload.parent_id.strip() if payload.parent_id else None
    if not name:
        raise HTTPException(status_code=400, detail="标签名称不能为空")
    if not tag_group:
        raise HTTPException(status_code=400, detail="标签组不能为空")

    now = _now_iso()
    db = get_database(request)
    parent: Tag | None = None
    if parent_id:
        parent = await _fetch_tag_from_db(db, parent_id)
        if parent is None:
            raise HTTPException(status_code=404, detail="父标签不存在")
        if parent.tag_group != tag_group:
            raise HTTPException(status_code=400, detail="子标签必须与父标签属于同一标签组")

    await _ensure_unique_tag_name_db(
        db,
        tag_group=tag_group,
        parent_id=parent_id,
        name=name,
    )
    slug = await _unique_tag_slug_db(db, tag_group, _slugify_tag_name(name))
    level = (parent.level + 1) if parent else 0
    path = f"{parent.path}/{slug}" if parent else f"{tag_group}/{slug}"
    tag_id = f"tag-{tag_group}-{uuid.uuid4().hex[:10]}"
    await db.execute(
        """
        INSERT INTO tags (
            id, name, slug, tag_group, parent_id, level, path, description,
            synonyms_json, sort_order, is_system, is_selectable, is_active,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
        """,
        (
            tag_id,
            name,
            slug,
            tag_group,
            parent_id,
            level,
            path,
            payload.description,
            json.dumps(payload.synonyms, ensure_ascii=False),
            payload.sort_order,
            int(payload.is_selectable),
            now,
            now,
        ),
    )
    tag = await _fetch_tag_from_db(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=500, detail="标签创建失败")
    return tag


@app.patch("/api/admin/tags/{tag_id}", response_model=Tag)
async def update_admin_tag(request: Request, tag_id: str, payload: TagUpdatePayload):
    """Edit one structured tag without moving it in the hierarchy."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    db = get_database(request)
    existing = await _fetch_tag_from_db(db, tag_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="标签不存在")

    updates: list[str] = []
    params: list[Any] = []
    payload_fields = payload.model_fields_set
    if "name" in payload_fields:
        if payload.name is None:
            raise HTTPException(status_code=400, detail="标签名称不能为空")
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="标签名称不能为空")
        await _ensure_unique_tag_name_db(
            db,
            tag_group=existing.tag_group,
            parent_id=existing.parent_id,
            name=name,
            exclude_id=tag_id,
        )
        updates.append("name = ?")
        params.append(name)
    if "description" in payload_fields:
        updates.append("description = ?")
        params.append(payload.description)
    if "synonyms" in payload_fields:
        updates.append("synonyms_json = ?")
        params.append(json.dumps(payload.synonyms or [], ensure_ascii=False))
    if "sort_order" in payload_fields:
        if payload.sort_order is None:
            raise HTTPException(status_code=400, detail="排序值不能为空")
        updates.append("sort_order = ?")
        params.append(payload.sort_order)
    if "is_selectable" in payload_fields:
        if payload.is_selectable is None:
            raise HTTPException(status_code=400, detail="是否可选不能为空")
        updates.append("is_selectable = ?")
        params.append(int(payload.is_selectable))
    if "is_active" in payload_fields:
        if payload.is_active is None:
            raise HTTPException(status_code=400, detail="是否启用不能为空")
        updates.append("is_active = ?")
        params.append(int(payload.is_active))

    if updates:
        updates.append("updated_at = ?")
        params.append(_now_iso())
        params.append(tag_id)
        await db.execute(
            f"UPDATE tags SET {', '.join(updates)} WHERE id = ?",
            params,
        )
    tag = await _fetch_tag_from_db(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=500, detail="标签更新失败")
    return tag


@app.post("/api/admin/tags/{tag_id}/disable", response_model=TagDisableResult)
async def disable_admin_tag(request: Request, tag_id: str):
    """Disable one tag while preserving existing item bindings and children."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    db = get_database(request)
    existing = await _fetch_tag_from_db(db, tag_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="标签不存在")

    child_count_row = await db.fetch_one(
        "SELECT COUNT(*) AS count FROM tags WHERE parent_id = ? AND is_active = 1",
        (tag_id,),
    )
    await db.execute(
        "UPDATE tags SET is_active = 0, updated_at = ? WHERE id = ?",
        (_now_iso(), tag_id),
    )
    tag = await _fetch_tag_from_db(db, tag_id)

    warning = None
    child_count = child_count_row["count"] if child_count_row else 0
    if child_count:
        warning = f"该标签仍有 {child_count} 个启用子标签，子标签未被自动禁用。"
    if tag is None:
        raise HTTPException(status_code=500, detail="标签禁用失败")
    return TagDisableResult(tag=tag, warning=warning)


@app.get("/api/knowledge-bases", response_model=list[KnowledgeBase])
async def get_knowledge_bases():
    """List local knowledge bases with review counters."""
    _ensure_knowledge_schema()
    with _connect_knowledge_db() as conn:
        rows = conn.execute(
            """
            SELECT
                kb.id,
                kb.name,
                kb.description,
                MAX(kb.updated_at, COALESCE(MAX(ki.updated_at), kb.updated_at)) AS updated_at,
                SUM(CASE WHEN ki.review_status = 'published' THEN 1 ELSE 0 END) AS published_count,
                SUM(CASE WHEN ki.review_status = 'pending_review' THEN 1 ELSE 0 END) AS pending_review_count
            FROM knowledge_bases kb
            LEFT JOIN knowledge_items ki ON ki.knowledge_base_id = kb.id
            GROUP BY kb.id, kb.name, kb.description, kb.updated_at
            ORDER BY kb.updated_at DESC
            """
        ).fetchall()
    return [
        KnowledgeBase(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            published_count=row["published_count"] or 0,
            pending_review_count=row["pending_review_count"] or 0,
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


@app.post("/api/knowledge-bases", response_model=KnowledgeBase)
async def create_knowledge_base(payload: KnowledgeBaseCreate):
    """Create a local knowledge base for the v1 demo workflow."""
    _ensure_knowledge_schema()
    base_id = f"kb-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    with _connect_knowledge_db() as conn:
        conn.execute(
            """
            INSERT INTO knowledge_bases (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (base_id, payload.name.strip() or "未命名知识库", payload.description, now, now),
        )
        conn.commit()
    return KnowledgeBase(id=base_id, name=payload.name.strip() or "未命名知识库", description=payload.description, published_count=0, pending_review_count=0, updated_at=now)


@app.get("/api/map", response_model=KnowledgeMapResponse)
async def get_knowledge_map(
    request: Request,
    knowledge_base_id: str = Query("default", description="知识库 ID"),
    q: str | None = Query(None, description="搜索标题、摘要、标签"),
    cluster_id: str | None = Query(None, description="聚类 ID"),
    item_type: str | None = Query(None, description="资料类型"),
    source_type: str | None = Query(None, description="来源类型"),
    year_from: int | None = Query(None, description="起始年份"),
    year_to: int | None = Query(None, description="结束年份"),
):
    """Return published-only knowledge map points."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    where = ["knowledge_base_id = ?", "review_status = 'published'", "x IS NOT NULL", "y IS NOT NULL"]
    params: list[Any] = [knowledge_base_id]
    if q and q.strip():
        where.append("(title LIKE ? OR summary LIKE ? OR tags_json LIKE ?)")
        pattern = f"%{q.strip()}%"
        params.extend([pattern, pattern, pattern])
    if cluster_id:
        where.append("cluster_id = ?")
        params.append(cluster_id)
    if item_type:
        where.append("item_type = ?")
        params.append(item_type)
    if source_type:
        where.append("source_type = ?")
        params.append(source_type)
    if year_from is not None:
        where.append("year >= ?")
        params.append(year_from)
    if year_to is not None:
        where.append("year <= ?")
        params.append(year_to)

    where_sql = " AND ".join(where)
    db = get_database(request)
    rows = await db.fetch_all(
        f"SELECT * FROM knowledge_items WHERE {where_sql} ORDER BY published_at DESC, updated_at DESC",
        params,
    )
    tag_ids_by_item_id = await _fetch_item_tag_ids_map_from_db(
        db,
        [row["id"] for row in rows],
    )
    cluster_rows = await db.fetch_all(
        f"""
        SELECT cluster_id, COALESCE(cluster_label, '未分组') AS cluster_label, COUNT(*) AS item_count, tags_json
        FROM knowledge_items
        WHERE {where_sql}
        GROUP BY cluster_id, COALESCE(cluster_label, '未分组')
        ORDER BY item_count DESC, cluster_label
        """,
        params,
    )

    points = [_knowledge_map_point_from_row(dict(row), tag_ids_by_item_id.get(row["id"], [])) for row in rows]
    clusters = []
    for index, row in enumerate(cluster_rows):
        keywords = _parse_tags(row["tags_json"])[:5]
        clusters.append(
            KnowledgeCluster(
                id=row["cluster_id"] or "unclustered",
                label=row["cluster_label"],
                keywords=keywords,
                item_count=row["item_count"],
                color=get_cluster_color(index),
            )
        )
    return KnowledgeMapResponse(points=points, clusters=clusters)


@app.get("/api/items/{item_id}", response_model=KnowledgeItem)
async def get_knowledge_item(request: Request, item_id: str):
    """Get one knowledge item for the detail panel."""
    if request.scope.get("env") is None:
        _ensure_knowledge_schema()
    db = get_database(request)
    row = await db.fetch_one("SELECT * FROM knowledge_items WHERE id = ?", (item_id,))
    if not row:
        raise HTTPException(status_code=404, detail="未找到知识条目")
    tag_ids_by_item_id = await _fetch_item_tag_ids_map_from_db(db, [item_id])
    return _knowledge_item_from_row(dict(row), tag_ids_by_item_id.get(item_id, []))


@app.get("/api/items/{item_id}/pdf")
async def get_knowledge_item_pdf(
    item_id: str,
    download: bool = Query(False, description="是否作为附件下载"),
):
    """Return the locally indexed PDF for online reading or download."""
    _ensure_knowledge_schema()
    with _connect_knowledge_db() as conn:
        row = conn.execute(
            """
            SELECT title, source_path
            FROM knowledge_items
            WHERE id = ? AND review_status = 'published'
            """,
            (item_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="未找到已发布论文条目")
    path = _resolve_source_pdf(row["source_path"])
    if not path:
        raise HTTPException(status_code=404, detail="该条目没有可读取的本地 PDF")
    return FileResponse(
        path,
        filename=path.name,
        media_type="application/pdf",
        content_disposition_type="attachment" if download else "inline",
    )


@app.get("/api/items/{item_id}/similar", response_model=KnowledgeItemList)
async def get_similar_knowledge_items(item_id: str, limit: int = Query(5, description="返回的相似条目数量")):
    """Return simple same-cluster or nearest-coordinate mock similar items."""
    _ensure_knowledge_schema()
    with _connect_knowledge_db() as conn:
        source_row = conn.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,)).fetchone()
        if not source_row:
            raise HTTPException(status_code=404, detail="未找到知识条目")
        source = dict(source_row)
        rows = conn.execute(
            """
            SELECT *,
                CASE
                    WHEN cluster_id = ? THEN 0
                    ELSE 1
                END AS cluster_rank,
                ((x - ?) * (x - ?) + (y - ?) * (y - ?)) AS distance_rank
            FROM knowledge_items
            WHERE id != ? AND knowledge_base_id = ? AND review_status = 'published' AND x IS NOT NULL AND y IS NOT NULL
            ORDER BY cluster_rank, distance_rank
            LIMIT ?
            """,
            (
                source["cluster_id"],
                source["x"] or 0,
                source["x"] or 0,
                source["y"] or 0,
                source["y"] or 0,
                item_id,
                source["knowledge_base_id"],
                limit,
            ),
        ).fetchall()
        tag_ids_by_item_id = _fetch_item_tag_ids_map(conn, [row["id"] for row in rows])
    return KnowledgeItemList(items=[_knowledge_item_from_row(dict(row), tag_ids_by_item_id.get(row["id"], [])) for row in rows])


@app.post("/api/uploads", response_model=KnowledgeItem)
async def create_upload_review_item(payload: KnowledgeItemPayload):
    """Create a pending review item from a document upload."""
    _ensure_knowledge_schema()
    item_id = f"upload-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    x, y = _knowledge_coordinates(item_id)
    title = (payload.title or payload.file_name or "未命名上传资料").strip()
    source_name = payload.source_name or payload.file_name or "本地上传"
    with _connect_knowledge_db() as conn:
        conn.execute(
            """
            INSERT INTO knowledge_items (
                id, knowledge_base_id, title, summary, tags_json, cluster_id, cluster_label,
                source_type, item_type, author, year, doi_url, source_name, visibility,
                review_status, reject_reason, content_preview, x, y, created_at, updated_at, published_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', NULL, ?, ?, ?, ?, ?, NULL)
            """,
            (
                item_id,
                payload.knowledge_base_id,
                title,
                payload.summary,
                _json_tags(payload.tags),
                payload.cluster_id,
                payload.cluster_label,
                payload.source_type,
                payload.item_type,
                payload.author,
                payload.year,
                payload.doi_url,
                source_name,
                payload.visibility,
                payload.content_preview,
                x,
                y,
                now,
                now,
            ),
        )
        conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (now, payload.knowledge_base_id))
        conn.commit()
        item = _fetch_knowledge_item(conn, item_id)
    if not item:
        raise HTTPException(status_code=500, detail="上传资料创建失败")
    return item


@app.get("/api/review-items", response_model=KnowledgeItemList)
async def get_review_items(
    knowledge_base_id: str = Query("default", description="知识库 ID"),
    status: str | None = Query(None, description="审核状态"),
):
    """List review queue items. Defaults to non-published review work."""
    _ensure_knowledge_schema()
    params: list[Any] = [knowledge_base_id]
    if status:
        where = "knowledge_base_id = ? AND review_status = ?"
        params.append(status)
    else:
        where = "knowledge_base_id = ? AND review_status IN ('pending_review', 'reviewing', 'draft', 'rejected')"
    with _connect_knowledge_db() as conn:
        rows = conn.execute(f"SELECT * FROM knowledge_items WHERE {where} ORDER BY updated_at DESC", params).fetchall()
        tag_ids_by_item_id = _fetch_item_tag_ids_map(conn, [row["id"] for row in rows])
    return KnowledgeItemList(items=[_knowledge_item_from_row(dict(row), tag_ids_by_item_id.get(row["id"], [])) for row in rows])


@app.patch("/api/review-items/{item_id}", response_model=KnowledgeItem)
async def update_review_item(item_id: str, payload: KnowledgeItemPayload):
    """Save draft edits for a review item."""
    _ensure_knowledge_schema()
    now = _now_iso()
    with _connect_knowledge_db() as conn:
        existing = conn.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="未找到待审核资料")
        status = dict(existing)["review_status"]
        if status == "published":
            status = "published"
        elif status not in {"rejected", "draft"}:
            status = "reviewing"
        conn.execute(
            """
            UPDATE knowledge_items
            SET title = ?, summary = ?, tags_json = ?, cluster_id = ?, cluster_label = ?,
                source_type = ?, item_type = ?, author = ?, year = ?, doi_url = ?, source_name = ?,
                visibility = ?, review_status = ?, reject_reason = ?, content_preview = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                (payload.title or "").strip() or dict(existing)["title"],
                payload.summary,
                _json_tags(payload.tags),
                payload.cluster_id,
                payload.cluster_label,
                payload.source_type,
                payload.item_type,
                payload.author,
                payload.year,
                payload.doi_url,
                payload.source_name,
                payload.visibility,
                status,
                payload.reject_reason,
                payload.content_preview,
                now,
                item_id,
            ),
        )
        conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (now, dict(existing)["knowledge_base_id"]))
        conn.commit()
        item = _fetch_knowledge_item(conn, item_id)
    if not item:
        raise HTTPException(status_code=500, detail="保存审核草稿失败")
    return item


@app.post("/api/review-items/{item_id}/publish", response_model=KnowledgeItem)
async def publish_review_item(item_id: str, payload: KnowledgeItemPayload):
    """Approve and publish a knowledge item."""
    _ensure_knowledge_schema()
    now = _now_iso()
    with _connect_knowledge_db() as conn:
        existing = conn.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="未找到待审核资料")
        tag_ids = _validate_item_tag_ids(conn, payload.tag_ids, require_content_type=bool(payload.tag_ids))
        existing_dict = dict(existing)
        x = existing_dict["x"]
        y = existing_dict["y"]
        if x is None or y is None:
            x, y = _knowledge_coordinates(item_id)
        conn.execute(
            """
            UPDATE knowledge_items
            SET title = ?, summary = ?, tags_json = ?, cluster_id = ?, cluster_label = ?,
                source_type = ?, item_type = ?, author = ?, year = ?, doi_url = ?, source_name = ?,
                visibility = ?, review_status = 'published', reject_reason = NULL, content_preview = ?,
                x = ?, y = ?, updated_at = ?, published_at = ?
            WHERE id = ?
            """,
            (
                (payload.title or "").strip() or existing_dict["title"],
                payload.summary,
                _json_tags(payload.tags),
                payload.cluster_id,
                payload.cluster_label,
                payload.source_type,
                payload.item_type,
                payload.author,
                payload.year,
                payload.doi_url,
                payload.source_name,
                payload.visibility,
                payload.content_preview,
                x,
                y,
                now,
                now,
                item_id,
            ),
        )
        _replace_item_tags(conn, item_id=item_id, tag_ids=tag_ids, source="admin", now=now)
        conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (now, existing_dict["knowledge_base_id"]))
        conn.commit()
        item = _fetch_knowledge_item(conn, item_id)
    if not item:
        raise HTTPException(status_code=500, detail="发布失败")
    return item


@app.post("/api/review-items/{item_id}/reject", response_model=KnowledgeItem)
async def reject_review_item(item_id: str, payload: KnowledgeItemPayload):
    """Reject a review item. Rejected items never enter the map."""
    _ensure_knowledge_schema()
    now = _now_iso()
    with _connect_knowledge_db() as conn:
        existing = conn.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="未找到待审核资料")
        existing_dict = dict(existing)
        conn.execute(
            """
            UPDATE knowledge_items
            SET review_status = 'rejected', reject_reason = ?, updated_at = ?
            WHERE id = ?
            """,
            (payload.reject_reason or "管理员驳回，需补充资料。", now, item_id),
        )
        conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (now, existing_dict["knowledge_base_id"]))
        conn.commit()
        item = _fetch_knowledge_item(conn, item_id)
    if not item:
        raise HTTPException(status_code=500, detail="驳回失败")
    return item


@app.post("/api/admin/items", response_model=KnowledgeItem)
async def create_manual_knowledge_item(payload: KnowledgeItemPayload):
    """Create a manually curated published item without uploading a file."""
    _ensure_knowledge_schema()
    item_id = f"manual-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    with _connect_knowledge_db() as conn:
        tag_ids = _validate_item_tag_ids(conn, payload.tag_ids, require_content_type=bool(payload.tag_ids))
        published_count_row = conn.execute(
            "SELECT COUNT(*) AS count FROM knowledge_items WHERE knowledge_base_id = ? AND review_status = 'published'",
            (payload.knowledge_base_id,),
        ).fetchone()
        x, y = _knowledge_coordinates(item_id, published_count_row["count"] if published_count_row else 0)
        conn.execute(
            """
            INSERT INTO knowledge_items (
                id, knowledge_base_id, title, summary, tags_json, cluster_id, cluster_label,
                source_type, item_type, author, year, doi_url, source_name, visibility,
                review_status, reject_reason, content_preview, x, y, created_at, updated_at, published_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NULL, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_id,
                payload.knowledge_base_id,
                (payload.title or "手动新增知识节点").strip(),
                payload.summary,
                _json_tags(payload.tags),
                payload.cluster_id or "manual",
                payload.cluster_label or "手动维护条目",
                payload.source_type or "manual",
                payload.item_type or "other",
                payload.author,
                payload.year,
                payload.doi_url,
                payload.source_name or "手动新增",
                payload.visibility,
                payload.content_preview,
                x,
                y,
                now,
                now,
                now,
            ),
        )
        _replace_item_tags(conn, item_id=item_id, tag_ids=tag_ids, source="admin", now=now)
        conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (now, payload.knowledge_base_id))
        conn.commit()
        item = _fetch_knowledge_item(conn, item_id)
    if not item:
        raise HTTPException(status_code=500, detail="手动新增失败")
    return item


@app.get("/api/samples", response_model=PaperSampleList)
async def get_sample_ids(request: Request):
    """Get list of paper IDs that have samples available."""
    db = get_database(request)

    rows = await db.fetch_all(
        """
        SELECT paper_id
        FROM paper_samples
        ORDER BY paper_id
    """
    )

    paper_ids = [row["paper_id"] for row in rows]
    return PaperSampleList(paper_ids=paper_ids)


@app.get("/api/samples/{paper_id}", response_model=PaperSample)
async def get_paper_sample(paper_id: int, request: Request):
    """Get paper sample with extracted data and cluster info."""
    db = get_database(request)

    # Join paper_samples with papers table to get all data
    row = await db.fetch_one(
        """
        SELECT
            ps.paper_id,
            ps.sample,
            p.title,
            p.summarization,
            p.cluster_id,
            COALESCE(p.claude_label, p.cluster_label) as cluster_label,
            p.field_subfield,
            p.publication_year,
            p.classification
        FROM paper_samples ps
        JOIN papers p ON ps.paper_id = p.id
        WHERE ps.paper_id = ?
    """,
        (paper_id,),
    )

    if not row:
        raise HTTPException(status_code=404, detail="未找到论文样本")

    return PaperSample(
        paper_id=row["paper_id"],
        sample=row["sample"],
        title=row["title"],
        summarization=row["summarization"],
        cluster_id=row["cluster_id"],
        cluster_label=row["cluster_label"],
        field_subfield=row["field_subfield"],
        publication_year=row["publication_year"],
        classification=row["classification"],
    )


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        import asgi

        return await asgi.fetch(app, request.js_object, self.env)
