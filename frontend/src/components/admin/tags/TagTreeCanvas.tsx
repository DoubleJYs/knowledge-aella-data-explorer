import { Button } from "~/components/ui/Button";
import type { TagNode, TagUsageStats } from "~/types/tags";
import { cn } from "~/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Maximize2Icon,
  MinusIcon,
  MoveDownIcon,
  MoveLeftIcon,
  MoveRightIcon,
  MoveUpIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type StatsByTagId = Record<string, TagUsageStats | undefined>;

type TreeCanvasNode = {
  displayDepth: number;
  node: TagNode;
  x: number;
  y: number;
};

type TreeCanvasLink = {
  source: TreeCanvasNode;
  target: TreeCanvasNode;
};

type SearchResult = {
  ancestors: TagNode[];
  node: TagNode;
};

type VisibleRoots = {
  ancestors: TagNode[];
  focus: TagNode | null;
  roots: TagNode[];
};

const CARD_WIDTH = 236;
const CARD_HEIGHT = 68;
const COLUMN_GAP = 320;
const ROW_GAP = 92;
const VIEWPORT_HEIGHT = 620;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 1.8;
const ZOOM_STEP = 0.12;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

function findNode(nodes: TagNode[], id: string | null): SearchResult | null {
  if (!id) return null;

  const walk = (items: TagNode[], ancestors: TagNode[]): SearchResult | null => {
    for (const item of items) {
      if (item.id === id) return { ancestors, node: item };
      const result = walk(item.children, [...ancestors, item]);
      if (result) return result;
    }
    return null;
  };

  return walk(nodes, []);
}

function getVisibleRoots(
  nodes: TagNode[],
  focusNodeId: string | null,
): VisibleRoots {
  const focused = findNode(nodes, focusNodeId);
  if (!focused) {
    return { ancestors: [], focus: null, roots: nodes };
  }

  return {
    ancestors: focused.ancestors,
    focus: focused.node,
    roots: [focused.node],
  };
}

function getTreeLayout(nodes: TagNode[], focusNodeId: string | null) {
  const { focus, roots } = getVisibleRoots(nodes, focusNodeId);
  const canvasNodes: TreeCanvasNode[] = [];
  const links: TreeCanvasLink[] = [];
  const showChildren = Boolean(focus);
  const rootRows = Math.max(1, roots.length);
  const childRows = showChildren
    ? Math.max(1, ...roots.map((root) => Math.max(root.children.length, 1)))
    : rootRows;
  const centerOffset = focus ? Math.max(0, (childRows - rootRows) * ROW_GAP * 0.5) : 0;

  roots.forEach((root, rootIndex) => {
    const current: TreeCanvasNode = {
      displayDepth: 0,
      node: root,
      x: 96,
      y: 92 + rootIndex * ROW_GAP + centerOffset,
    };
    canvasNodes.push(current);

    if (!showChildren) return;

    root.children.forEach((child, childIndex) => {
      const childNode: TreeCanvasNode = {
        displayDepth: 1,
        node: child,
        x: 96 + COLUMN_GAP,
        y: 92 + childIndex * ROW_GAP,
      };
      canvasNodes.push(childNode);
      links.push({ source: current, target: childNode });
    });
  });

  return {
    height: Math.max(VIEWPORT_HEIGHT, childRows * ROW_GAP + 190),
    links,
    nodes: canvasNodes,
    width: Math.max(1120, focus ? 820 : 520),
  };
}

function getLinkPath(link: TreeCanvasLink) {
  const sourceX = link.source.x + CARD_WIDTH;
  const sourceY = link.source.y + CARD_HEIGHT / 2;
  const targetX = link.target.x;
  const targetY = link.target.y + CARD_HEIGHT / 2;
  const middleX = sourceX + (targetX - sourceX) / 2;
  return `M ${sourceX} ${sourceY} C ${middleX} ${sourceY}, ${middleX} ${targetY}, ${targetX} ${targetY}`;
}

export function TagTreeCanvas({
  nodes,
  onCreateChild,
  onSelect,
  selectedTagId,
  statsByTagId,
}: {
  nodes: TagNode[];
  onCreateChild: (tag: TagNode) => void;
  onSelect: (tag: TagNode) => void;
  selectedTagId: string | null;
  statsByTagId: StatsByTagId;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const focused = useMemo(
    () => getVisibleRoots(nodes, focusNodeId),
    [focusNodeId, nodes],
  );
  const layout = useMemo(
    () => getTreeLayout(nodes, focusNodeId),
    [focusNodeId, nodes],
  );
  const parentNode =
    focused.ancestors.length > 0
      ? focused.ancestors[focused.ancestors.length - 1]
      : null;
  const currentLevelText = focused.focus
    ? `当前层级：${focused.focus.name} / 下一层`
    : "当前层级：根标签";

  useEffect(() => {
    if (!focusNodeId || findNode(nodes, focusNodeId)) return;
    setFocusNodeId(null);
  }, [focusNodeId, nodes]);

  const scrollBy = (left: number, top: number) => {
    scrollerRef.current?.scrollBy({ behavior: "smooth", left, top });
  };

  const setZoom = (nextZoom: number) => {
    setZoomLevel(clampZoom(nextZoom));
  };

  const resetView = () => {
    setFocusNodeId(null);
    setZoomLevel(1);
    requestAnimationFrame(() => {
      if (!scrollerRef.current) return;
      scrollerRef.current.scrollTo({ behavior: "smooth", left: 0, top: 0 });
    });
  };

  const fitView = () => {
    if (!scrollerRef.current) return;
    const rect = scrollerRef.current.getBoundingClientRect();
    setZoom(clampZoom(Math.min(rect.width / layout.width, rect.height / layout.height) * 0.92));
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ behavior: "smooth", left: 0, top: 0 });
    });
  };

  const handleNodeSelect = (node: TagNode) => {
    onSelect(node);
    if (node.children.length > 0) {
      setFocusNodeId(node.id);
      requestAnimationFrame(() => {
        scrollerRef.current?.scrollTo({ behavior: "smooth", left: 0, top: 0 });
      });
    }
  };

  const goParent = () => {
    setFocusNodeId(parentNode?.id ?? null);
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ behavior: "smooth", left: 0, top: 0 });
    });
  };

  return (
    <div className={`
      relative overflow-hidden rounded-[10px] border border-cyan-400/25
      bg-[#020b1a]
    `}>
      <div className={`border-b border-cyan-400/15 bg-cyan-950/30 px-4 py-3`}>
        <div className={`
          flex flex-col gap-3

          xl:flex-row xl:items-center xl:justify-between
        `}>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-cyan-50">
              {currentLevelText}
            </div>
            <div className="mt-1 text-xs text-cyan-100/55">
              默认最多显示两个级别。点击有子标签的节点进入下一层，滚动条用于横向和纵向移动。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              disabled={!focusNodeId}
              onClick={goParent}
            >
              <ChevronLeftIcon className="mr-1.5 h-3.5 w-3.5" />
              上一级
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={resetView}
            >
              <RotateCcwIcon className="mr-1.5 h-3.5 w-3.5" />
              重置
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={fitView}
            >
              <Maximize2Icon className="mr-1.5 h-3.5 w-3.5" />
              适配
            </Button>
          </div>
        </div>

        <div className={`mt-3 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => setZoom(zoomLevel - ZOOM_STEP)}
            >
              <MinusIcon className="mr-1.5 h-3.5 w-3.5" />
              缩小
            </Button>
            <span className={`
              min-w-20 rounded-full border border-cyan-400/25 bg-cyan-950/70
              px-2.5 py-1 text-center text-xs text-cyan-100/70
            `}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => setZoom(zoomLevel + ZOOM_STEP)}
            >
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              放大
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => scrollBy(-360, 0)}
            >
              <ChevronsLeftIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => scrollBy(-120, 0)}
            >
              <MoveLeftIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => scrollBy(0, -120)}
            >
              <MoveUpIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => scrollBy(0, 120)}
            >
              <MoveDownIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => scrollBy(120, 0)}
            >
              <MoveRightIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-950/70 text-cyan-100"
              onClick={() => scrollBy(360, 0)}
            >
              <ChevronsRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={`
          relative max-h-[620px] min-h-[520px] overflow-auto overscroll-contain
        `}
      >
        <div
          className={`pointer-events-none sticky left-0 top-0 z-[1] h-0`}
        >
          <div className={`
            m-4 inline-flex rounded-full border border-cyan-400/25
            bg-cyan-950/80 px-3 py-1 text-xs text-cyan-100/55
          `}>
            鼠标滚轮上下滚动，Shift + 滚轮横向滚动；也可使用控制板按钮。
          </div>
        </div>
        <div
          className={`
            relative origin-top-left
            bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)]

            bg-[size:32px_32px]
          `}
          style={{
            height: layout.height * zoomLevel,
            width: layout.width * zoomLevel,
          }}
        >
          <svg
            className="absolute left-0 top-0"
            role="img"
            aria-label="标签树可缩放画布"
            height={layout.height}
            width={layout.width}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
            }}
          >
            <rect
              x={0}
              y={0}
              width={layout.width}
              height={layout.height}
              fill="transparent"
            />
            {layout.links.map((link) => (
              <path
                key={`${link.source.node.id}-${link.target.node.id}`}
                d={getLinkPath(link)}
                fill="none"
                stroke="rgba(34,211,238,0.26)"
                strokeWidth={1.4}
              />
            ))}
            {layout.nodes.map(({ node, x, y }) => {
              const selected = selectedTagId === node.id;
              const stats = statsByTagId[node.id];
              const hasChildren = node.children.length > 0;
              return (
                <g key={node.id} transform={`translate(${x} ${y})`}>
                  <rect
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    rx={8}
                    className={cn(
                      "transition-colors",
                      selected
                        ? "fill-cyan-500/25 stroke-cyan-200"
                        : node.isActive
                          ? "fill-cyan-950/75 stroke-cyan-500/45"
                          : "fill-slate-900/65 stroke-slate-500/40",
                    )}
                    strokeWidth={selected ? 2 : 1}
                  />
                  <text
                    x={16}
                    y={26}
                    fill={node.isActive ? "#e0f2fe" : "#94a3b8"}
                    fontSize={14}
                    fontWeight={700}
                  >
                    {node.name.length > 14
                      ? `${node.name.slice(0, 14)}…`
                      : node.name}
                  </text>
                  <text x={16} y={48} fill="#67e8f9" fontSize={11}>
                    {node.children.length} 子标签 · {stats?.itemCount ?? 0} 条目
                  </text>
                  {node.isSystem && (
                    <text x={180} y={26} fill="#93c5fd" fontSize={11}>
                      系统
                    </text>
                  )}
                  {!node.isActive && (
                    <text x={168} y={48} fill="#cbd5e1" fontSize={11}>
                      已禁用
                    </text>
                  )}
                  <foreignObject x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT}>
                    <button
                      type="button"
                      className="h-full w-full rounded-[8px]"
                      aria-label={`选择${node.name}`}
                      onClick={() => handleNodeSelect(node)}
                    />
                  </foreignObject>
                  <foreignObject x={CARD_WIDTH - 42} y={38} width={32} height={24}>
                    <button
                      type="button"
                      className={`
                        flex h-6 w-8 items-center justify-center rounded border
                        border-cyan-400/25 bg-cyan-950/80 text-cyan-100

                        hover:border-cyan-200/60
                      `}
                      aria-label={
                        hasChildren ? `进入${node.name}下一层` : `为${node.name}新增子标签`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        if (hasChildren) {
                          handleNodeSelect(node);
                          return;
                        }
                        onCreateChild(node);
                      }}
                    >
                      {hasChildren ? (
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      ) : (
                        <PlusIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
