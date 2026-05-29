"""Import the local Safety-at-Scale paper corpus into Knowledge Land.

This importer keeps SQLite lightweight: it stores metadata, local PDF paths,
and structured tag bindings. It does not store PDF binaries or full text.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from tag_seed import seed_default_tags
from worker import DB_PATH, _ensure_knowledge_schema, _knowledge_coordinates

CORPUS_DIR = Path("/Users/zhangjiyan/paper-reading/Safety-at-Scale-literature")
MAIN_PDF_PATH = Path("/Users/zhangjiyan/work_paper/agent_security/Safety-at-Scale.pdf")
METADATA_DIR = CORPUS_DIR / "metadata"
CATALOG_PATH = METADATA_DIR / "references_catalog.json"
STATUS_PATH = METADATA_DIR / "download_status.json"
KNOWLEDGE_BASE_ID = "default"

SECTION_LABELS = {
    "00_Unmapped": "Safety-at-Scale 未映射文献",
    "01_Introduction": "Safety-at-Scale 综述引言",
    "02_Vision_Foundation_Model_Safety": "视觉基础模型安全",
    "03_Large_Language_Model_Safety": "大语言模型安全",
    "04_Vision_Language_Pre_Training_Model_Safety": "视觉语言预训练模型安全",
    "05_Vision_Language_Model_Safety": "视觉语言模型安全",
    "06_Diffusion_Model_Safety": "扩散模型安全",
    "07_Agent_Safety": "智能体安全",
    "08_Open_Challenges": "开放挑战",
    "09_Conclusion": "结论",
    "10_Author_Contributions": "作者贡献",
}

BASE_TAGS = [
    ("content_type", "paper"),
    ("academic_domain", "ai-security"),
    ("data_origin", "public-data"),
    ("data_modality", "text-data"),
]

AI_TAG_PREFIX = "tag-research_topic-ai-security"


def ai_tag(*slugs: str) -> tuple[str, str]:
    return ("id", "-".join([AI_TAG_PREFIX, *slugs]))


SECTION_TAGS = {
    "02_Vision_Foundation_Model_Safety": [
        ai_tag("vision-foundation-model-safety"),
    ],
    "03_Large_Language_Model_Safety": [
        ai_tag("large-language-model-safety"),
    ],
    "04_Vision_Language_Pre_Training_Model_Safety": [
        ai_tag("vision-language-pre-training-model-safety"),
    ],
    "05_Vision_Language_Model_Safety": [
        ai_tag("vision-language-model-safety"),
    ],
    "06_Diffusion_Model_Safety": [
        ai_tag("diffusion-model-safety"),
    ],
    "07_Agent_Safety": [
        ai_tag("agent-safety"),
    ],
    "08_Open_Challenges": [
        ai_tag("open-challenges"),
    ],
}

KEYWORD_TAGS = [
    (
        ("prompt injection", "instruction injection", "fine-print injection"),
        ai_tag("large-language-model-safety", "llm-prompt-injection-attacks"),
    ),
    (
        ("indirect prompt injection",),
        ai_tag("agent-safety", "indirect-prompt-injection"),
    ),
    (
        ("jailbreak", "jailbreaking", "jailbroken"),
        ai_tag("large-language-model-safety", "llm-jailbreak-attacks"),
    ),
    (
        ("backdoor", "trojan"),
        ai_tag("large-language-model-safety", "llm-backdoor-attacks"),
    ),
    (
        ("poison", "poisoning"),
        ai_tag("large-language-model-safety", "llm-backdoor-attacks", "data-poisoning"),
    ),
    (
        ("rag", "retrieval-augmented", "retrieval augmented", "knowledge corruption"),
        ai_tag("large-language-model-safety", "llm-prompt-injection-attacks"),
    ),
    (
        ("privacy", "leakage", "information theft"),
        ai_tag("large-language-model-safety", "llm-data-extraction-attacks"),
    ),
    (
        ("membership inference",),
        ai_tag("diffusion-model-safety", "dm-membership-inference-attacks"),
    ),
    (
        ("adversarial example", "adversarial attack", "adversarial robustness"),
        ai_tag("vision-foundation-model-safety", "vit-attacks-and-defenses", "vit-adversarial-attacks"),
    ),
    (
        ("robust", "robustness"),
        ai_tag("vision-foundation-model-safety", "vit-attacks-and-defenses", "vit-adversarial-defenses"),
    ),
    (
        ("red teaming", "red-teaming", "redteam"),
        ai_tag("agent-safety", "agent-benchmarks"),
    ),
    (
        ("benchmark", "bench"),
        ai_tag("agent-safety", "agent-benchmarks"),
    ),
    (
        ("watermark", "watermarking", "copyright"),
        ai_tag("diffusion-model-safety", "intellectual-property-protection"),
    ),
    (
        ("tool", "tool-calling", "mcp", "model context protocol"),
        ai_tag("agent-safety", "tool-attacks-and-defenses"),
    ),
    (
        ("agent", "agents", "multi-agent", "web agents"),
        ai_tag("agent-safety"),
    ),
    (
        ("diffusion", "text-to-image", "stable diffusion"),
        ai_tag("diffusion-model-safety"),
    ),
]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def parse_doi(raw: str) -> str | None:
    match = re.search(r"\b10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", raw)
    return f"https://doi.org/{match.group(0).rstrip('.,')}" if match else None


def normalize_title(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def tag_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], str]:
    rows = conn.execute(
        "SELECT id, slug, tag_group FROM tags WHERE is_active = 1"
    ).fetchall()
    lookup: dict[tuple[str, str], str] = {}
    for row in rows:
        lookup[("id", row["id"])] = row["id"]
        lookup.setdefault((row["tag_group"], row["slug"]), row["id"])
    return lookup


def tag_names(conn: sqlite3.Connection, tag_ids: Iterable[str]) -> list[str]:
    ids = list(dict.fromkeys(tag_ids))
    if not ids:
        return []
    placeholders = ",".join("?" for _ in ids)
    rows = conn.execute(f"SELECT id, name FROM tags WHERE id IN ({placeholders})", ids).fetchall()
    names_by_id = {row["id"]: row["name"] for row in rows}
    return [names_by_id[tag_id] for tag_id in ids if tag_id in names_by_id]


def resolve_tags(lookup: dict[tuple[str, str], str], section: str, title: str) -> list[str]:
    selected = [*BASE_TAGS, *SECTION_TAGS.get(section, [])]
    lowered = title.lower()
    for keywords, tag_key in KEYWORD_TAGS:
        if any(keyword in lowered for keyword in keywords):
            selected.append(tag_key)
    tag_ids: list[str] = []
    for key in selected:
        tag_id = lookup.get(key)
        if tag_id and tag_id not in tag_ids:
            tag_ids.append(tag_id)
    return tag_ids


def item_coordinates(item_id: str, index_hint: int) -> tuple[float, float]:
    return _knowledge_coordinates(item_id, index_hint)


def upsert_item(
    conn: sqlite3.Connection,
    *,
    item_id: str,
    title: str,
    summary: str,
    tags: list[str],
    tag_ids: list[str],
    cluster_id: str,
    cluster_label: str,
    author: str | None,
    year: int | None,
    doi_url: str | None,
    source_name: str,
    source_path: str,
    content_preview: str,
    index_hint: int,
    timestamp: str,
) -> None:
    x, y = item_coordinates(item_id, index_hint)
    conn.execute(
        """
        INSERT INTO knowledge_items (
            id, knowledge_base_id, title, summary, tags_json, cluster_id, cluster_label,
            source_type, item_type, author, year, doi_url, source_name, visibility,
            review_status, reject_reason, content_preview, source_path, x, y,
            created_at, updated_at, published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pdf', 'paper', ?, ?, ?, ?, '公开可读',
            'published', NULL, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            summary = excluded.summary,
            tags_json = excluded.tags_json,
            cluster_id = excluded.cluster_id,
            cluster_label = excluded.cluster_label,
            source_type = excluded.source_type,
            item_type = excluded.item_type,
            author = excluded.author,
            year = excluded.year,
            doi_url = excluded.doi_url,
            source_name = excluded.source_name,
            visibility = excluded.visibility,
            review_status = excluded.review_status,
            reject_reason = NULL,
            content_preview = excluded.content_preview,
            source_path = excluded.source_path,
            x = COALESCE(knowledge_items.x, excluded.x),
            y = COALESCE(knowledge_items.y, excluded.y),
            updated_at = excluded.updated_at,
            published_at = COALESCE(knowledge_items.published_at, excluded.published_at)
        """,
        (
            item_id,
            KNOWLEDGE_BASE_ID,
            title,
            summary,
            json.dumps(tags, ensure_ascii=False),
            cluster_id,
            cluster_label,
            author,
            year,
            doi_url,
            source_name,
            content_preview,
            source_path,
            x,
            y,
            timestamp,
            timestamp,
            timestamp,
        ),
    )
    conn.execute("DELETE FROM item_tags WHERE item_id = ?", (item_id,))
    conn.executemany(
        """
        INSERT INTO item_tags (item_id, tag_id, source, confidence, created_at)
        VALUES (?, ?, 'admin', 1.0, ?)
        """,
        [(item_id, tag_id, timestamp) for tag_id in tag_ids],
    )


def import_main_paper(conn: sqlite3.Connection, lookup: dict[tuple[str, str], str], timestamp: str) -> bool:
    if not MAIN_PDF_PATH.exists():
        return False
    tag_ids = [
        tag_id
        for key in [
            ("content_type", "paper"),
            ("academic_domain", "ai-security"),
            ("data_origin", "public-data"),
            ("data_modality", "text-data"),
            ("research_topic", "ai-security"),
            ai_tag("vision-foundation-model-safety"),
            ai_tag("large-language-model-safety"),
            ai_tag("vision-language-pre-training-model-safety"),
            ai_tag("vision-language-model-safety"),
            ai_tag("diffusion-model-safety"),
            ai_tag("agent-safety"),
            ai_tag("open-challenges"),
        ]
        if (tag_id := lookup.get(key))
    ]
    tags = tag_names(conn, tag_ids)
    upsert_item(
        conn,
        item_id="safety-at-scale-main",
        title="Safety at Scale: A Comprehensive Survey of Large Model and Agent Safety",
        summary="Safety-at-Scale 主论文，系统综述大模型、视觉语言模型、扩散模型与智能体安全风险、攻击、防御和评测。",
        tags=tags,
        tag_ids=tag_ids,
        cluster_id="safety_at_scale_main",
        cluster_label="Safety-at-Scale 主论文",
        author="Xingjun Ma et al.",
        year=2025,
        doi_url="https://arxiv.org/abs/2502.05206",
        source_name="Safety-at-Scale 主论文",
        source_path=str(MAIN_PDF_PATH),
        content_preview="主论文用于组织当前文献集的章节分类和标签映射，覆盖大模型与智能体安全的攻击、防御、评测和开放挑战。",
        index_hint=0,
        timestamp=timestamp,
    )
    return True


def import_references(conn: sqlite3.Connection, lookup: dict[tuple[str, str], str], timestamp: str, limit: int | None) -> tuple[int, int]:
    catalog_rows = {str(row["id"]): row for row in load_json(CATALOG_PATH)}
    status_rows = load_json(STATUS_PATH)
    imported = 0
    skipped = 0
    for ref_id in sorted(status_rows, key=lambda value: int(value)):
        if limit is not None and imported >= limit:
            break
        status = status_rows[ref_id]
        path_value = status.get("path")
        path = Path(path_value) if isinstance(path_value, str) else None
        if status.get("status") != "downloaded" or not path or not path.exists():
            skipped += 1
            continue
        catalog = catalog_rows.get(ref_id, {})
        section = str(status.get("primary_section") or catalog.get("primary_section") or "00_Unmapped")
        title = normalize_title(str(catalog.get("title") or status.get("title") or path.stem))
        year_text = str(catalog.get("year") or "")
        raw = str(catalog.get("raw") or "")
        year = int(year_text) if year_text.isdigit() else None
        tag_ids = resolve_tags(lookup, section, title)
        tags = tag_names(conn, tag_ids)
        label = SECTION_LABELS.get(section, section)
        upsert_item(
            conn,
            item_id=f"safety-at-scale-ref-{int(ref_id):03d}",
            title=title,
            summary=f"Safety-at-Scale 参考文献 [{int(ref_id):03d}]，归属章节：{label}。",
            tags=tags,
            tag_ids=tag_ids,
            cluster_id=section,
            cluster_label=label,
            author=None,
            year=year,
            doi_url=parse_doi(raw),
            source_name=f"Safety-at-Scale 文献集 / {label}",
            source_path=str(path),
            content_preview=raw or f"本地 PDF：{path.name}",
            index_hint=int(ref_id),
            timestamp=timestamp,
        )
        imported += 1
    return imported, skipped


def run(limit: int | None = None) -> dict[str, int]:
    _ensure_knowledge_schema()
    timestamp = now_iso()
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        seed_default_tags(conn)
        lookup = tag_lookup(conn)
        main_imported = 1 if import_main_paper(conn, lookup, timestamp) else 0
        reference_imported, skipped = import_references(conn, lookup, timestamp, limit)
        conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (timestamp, KNOWLEDGE_BASE_ID))
        conn.commit()
    return {
        "main_imported": main_imported,
        "reference_imported": reference_imported,
        "skipped_without_pdf": skipped,
        "total_imported": main_imported + reference_imported,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Safety-at-Scale local PDFs into Knowledge Land.")
    parser.add_argument("--limit", type=int, default=None, help="Optional maximum number of reference PDFs to import.")
    args = parser.parse_args()
    print(json.dumps(run(limit=args.limit), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
