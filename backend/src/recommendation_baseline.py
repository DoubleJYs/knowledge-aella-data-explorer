"""SQLite-only baseline recommendation builder for published knowledge items."""

from __future__ import annotations

import json
import math
import re
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


BASELINE_MODEL_NAME = "sqlite-baseline-v3.2"
BASELINE_CLUSTERING_ALGORITHM = "stored-cluster-and-coordinate-baseline"
MAX_RELATIONS_PER_SOURCE = 20


@dataclass(frozen=True)
class BaselineItem:
    id: str
    knowledge_base_id: str
    title: str
    summary: str
    tags: tuple[str, ...]
    tag_ids: tuple[str, ...]
    cluster_id: str | None
    x: float | None
    y: float | None
    year: int | None


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _parse_tags(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(tag).strip() for tag in parsed if str(tag).strip()]


def _normalize_token(value: str) -> str:
    return value.strip().lower()


def _keywords_for_item(item: BaselineItem) -> set[str]:
    text = " ".join([item.title, item.summary, *item.tags])
    raw_tokens = re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}|[\u4e00-\u9fff]{2,}", text)
    tokens: set[str] = set()
    for token in raw_tokens:
        normalized = _normalize_token(token)
        if len(normalized) < 2:
            continue
        tokens.add(normalized)
        if re.fullmatch(r"[\u4e00-\u9fff]{4,}", token):
            tokens.update(token[index : index + 2] for index in range(0, len(token) - 1))
    return tokens


def _jaccard(first: set[str], second: set[str]) -> float:
    if not first or not second:
        return 0.0
    intersection = first & second
    if not intersection:
        return 0.0
    return len(intersection) / len(first | second)


def _coordinate_distance(first: BaselineItem, second: BaselineItem) -> float | None:
    if first.x is None or first.y is None or second.x is None or second.y is None:
        return None
    return math.hypot(first.x - second.x, first.y - second.y)


def _coordinate_similarity(distance: float | None) -> float:
    if distance is None:
        return 0.0
    return max(0.0, 1.0 - min(distance, 900.0) / 900.0)


def _year_gap(first: BaselineItem, second: BaselineItem) -> int | None:
    if first.year is None or second.year is None:
        return None
    return abs(first.year - second.year)


def _year_similarity(gap: int | None) -> float:
    if gap is None:
        return 0.0
    return max(0.0, 1.0 - min(gap, 10) / 10)


def _relation_type(
    *,
    same_cluster: bool,
    shared_keywords: set[str],
    shared_tag_values: set[str],
) -> str:
    if same_cluster:
        return "same_cluster"
    if shared_tag_values or len(shared_keywords) >= 2:
        return "same_topic"
    return "semantic_similarity"


def _load_tag_names(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT id, name FROM tags").fetchall()
    return {row["id"]: row["name"] for row in rows}


def _load_published_items(
    conn: sqlite3.Connection,
    knowledge_base_id: str,
) -> list[BaselineItem]:
    rows = conn.execute(
        """
        SELECT *
        FROM knowledge_items
        WHERE knowledge_base_id = ? AND review_status = 'published'
        ORDER BY published_at DESC, updated_at DESC
        """,
        (knowledge_base_id,),
    ).fetchall()
    if not rows:
        return []

    item_ids = [row["id"] for row in rows]
    placeholders = ",".join("?" for _ in item_ids)
    tag_rows = conn.execute(
        f"""
        SELECT item_id, tag_id
        FROM item_tags
        WHERE item_id IN ({placeholders})
        ORDER BY item_id, created_at
        """,
        item_ids,
    ).fetchall()
    tag_ids_by_item_id: dict[str, list[str]] = {item_id: [] for item_id in item_ids}
    for row in tag_rows:
        tag_ids_by_item_id.setdefault(row["item_id"], []).append(row["tag_id"])

    return [
        BaselineItem(
            id=row["id"],
            knowledge_base_id=row["knowledge_base_id"],
            title=row["title"] or "",
            summary=row["summary"] or "",
            tags=tuple(_parse_tags(row["tags_json"])),
            tag_ids=tuple(tag_ids_by_item_id.get(row["id"], [])),
            cluster_id=row["cluster_id"],
            x=row["x"],
            y=row["y"],
            year=row["year"],
        )
        for row in rows
    ]


def _score_pair(
    source: BaselineItem,
    target: BaselineItem,
    tag_names_by_id: dict[str, str],
) -> tuple[float, str, dict[str, Any]]:
    source_tags = {_normalize_token(tag) for tag in source.tags}
    target_tags = {_normalize_token(tag) for tag in target.tags}
    source_tag_ids = set(source.tag_ids)
    target_tag_ids = set(target.tag_ids)
    shared_tag_ids = source_tag_ids & target_tag_ids
    shared_legacy_tags = source_tags & target_tags
    shared_tag_values = shared_tag_ids | shared_legacy_tags
    source_keywords = _keywords_for_item(source)
    target_keywords = _keywords_for_item(target)
    shared_keywords = source_keywords & target_keywords
    same_cluster = bool(source.cluster_id and source.cluster_id == target.cluster_id)
    distance = _coordinate_distance(source, target)
    year_gap = _year_gap(source, target)

    tag_similarity = _jaccard(source_tags | source_tag_ids, target_tags | target_tag_ids)
    keyword_similarity = _jaccard(source_keywords, target_keywords)
    score = (
        (0.28 if same_cluster else 0.0)
        + tag_similarity * 0.28
        + keyword_similarity * 0.25
        + _coordinate_similarity(distance) * 0.12
        + _year_similarity(year_gap) * 0.07
    )
    score = round(min(max(score, 0.0), 1.0), 4)
    shared_tags = sorted(
        {
            tag_names_by_id.get(tag_id, tag_id)
            for tag_id in shared_tag_ids
        }
        | {tag for tag in shared_legacy_tags}
    )
    evidence = {
        "shared_tags": shared_tags,
        "same_cluster": same_cluster,
        "coordinate_distance": round(distance, 4) if distance is not None else None,
        "shared_keywords": sorted(shared_keywords)[:12],
        "year_gap": year_gap,
    }
    return (
        score,
        _relation_type(
            same_cluster=same_cluster,
            shared_keywords=shared_keywords,
            shared_tag_values=shared_tag_values,
        ),
        evidence,
    )


def rebuild_baseline_recommendations(
    conn: sqlite3.Connection,
    *,
    knowledge_base_id: str,
) -> dict[str, Any]:
    """Synchronously rebuild published-only baseline item relations."""
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    started_at = _now_iso()
    conn.execute(
        """
        INSERT INTO recommendation_runs (
            id, knowledge_base_id, embedding_model, reranker_model, clustering_algorithm,
            status, item_count, started_at, finished_at, error_message
        )
        VALUES (?, ?, ?, ?, ?, 'running', 0, ?, NULL, NULL)
        """,
        (
            run_id,
            knowledge_base_id,
            BASELINE_MODEL_NAME,
            None,
            BASELINE_CLUSTERING_ALGORITHM,
            started_at,
        ),
    )

    try:
      items = _load_published_items(conn, knowledge_base_id)
      item_ids = [item.id for item in items]
      relation_count = 0
      if item_ids:
          placeholders = ",".join("?" for _ in item_ids)
          conn.execute(
              f"DELETE FROM item_relations WHERE source_item_id IN ({placeholders})",
              item_ids,
          )

      tag_names_by_id = _load_tag_names(conn)
      created_at = _now_iso()
      for source in items:
          scored_targets: list[tuple[float, str, dict[str, Any], BaselineItem]] = []
          for target in items:
              if source.id == target.id:
                  continue
              score, relation_type, evidence = _score_pair(
                  source,
                  target,
                  tag_names_by_id,
              )
              if score <= 0.03:
                  continue
              scored_targets.append((score, relation_type, evidence, target))

          scored_targets.sort(key=lambda entry: entry[0], reverse=True)
          for score, relation_type, evidence, target in scored_targets[
              :MAX_RELATIONS_PER_SOURCE
          ]:
              conn.execute(
                  """
                  INSERT INTO item_relations (
                      id, source_item_id, target_item_id, relation_type, score,
                      evidence_json, model_name, run_id, created_at
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  """,
                  (
                      f"rel-{uuid.uuid4().hex[:16]}",
                      source.id,
                      target.id,
                      relation_type,
                      score,
                      json.dumps(evidence, ensure_ascii=False),
                      BASELINE_MODEL_NAME,
                      run_id,
                      created_at,
                  ),
              )
              relation_count += 1

      finished_at = _now_iso()
      conn.execute(
          """
          UPDATE recommendation_runs
          SET status = 'completed', item_count = ?, finished_at = ?, error_message = NULL
          WHERE id = ?
          """,
          (len(items), finished_at, run_id),
      )
      return {
          "run_id": run_id,
          "status": "completed",
          "item_count": len(items),
          "relation_count": relation_count,
      }
    except Exception as exc:
      finished_at = _now_iso()
      conn.execute(
          """
          UPDATE recommendation_runs
          SET status = 'failed', finished_at = ?, error_message = ?
          WHERE id = ?
          """,
          (finished_at, str(exc), run_id),
      )
      raise
