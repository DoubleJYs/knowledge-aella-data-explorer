import type { KnowledgeCluster, KnowledgeMapPoint } from "~/types/knowledge";
import * as d3Selection from "d3-selection";
import * as d3Zoom from "d3-zoom";
import { useEffect, useMemo, useRef, useState } from "react";

type CanvasPoint = KnowledgeMapPoint & {
  axisDomainLabel: string;
  axisNodeId: string;
  axisYear: number | null;
  canvasX: number;
  canvasY: number;
  color: string;
};

type KnowledgeMapCanvasProps = {
  activeAxisNodeId?: string | null;
  axisNodes?: KnowledgeMapAxisNode[];
  timeAxisLevel?: KnowledgeMapTimeAxisLevel;
  timeAxisRange?: KnowledgeMapTimeAxisRange;
  points: KnowledgeMapPoint[];
  clusters: KnowledgeCluster[];
  selectedPointId: string | null;
  onPointClick: (pointId: string) => void;
  axisDomainId?: string | null;
  variant?: "light" | "odatamap";
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { b: 148, g: 163, r: 100 };
  const value = Number.parseInt(normalized, 16);
  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith("#")) return color;
  const { b, g, r } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getHashSeed(input: string) {
  let seed = 0;
  for (let index = 0; index < input.length; index += 1) {
    seed = (seed * 31 + input.charCodeAt(index)) % 9973;
  }
  return seed;
}

function truncateCanvasLabel(label: string | null | undefined, maxLength = 14) {
  if (!label) return "未分组";
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label;
}

export type KnowledgeMapAxisNode = {
  aliases: string[];
  children?: KnowledgeMapAxisNode[];
  color: string;
  id: string;
  label: string;
};

export type KnowledgeMapTimeAxisLevel = "year" | "month" | "week" | "day";

export type KnowledgeMapTimeAxisRange = {
  day?: number;
  month?: number;
  week?: number;
  year?: number;
};

export const knowledgeMapAxisDomains: KnowledgeMapAxisNode[] = [
  {
    aliases: ["人工智能", "AI", "大模型", "Prompt", "模型", "生成式"],
    children: [
      {
        aliases: ["对抗", "鲁棒", "投毒", "后门", "模型窃取", "反演"],
        children: [
          {
            aliases: ["对抗样本", "对抗攻击"],
            children: [
              {
                aliases: ["白盒攻击", "white-box"],
                color: "#60a5fa",
                id: "ai_white_box_attack",
                label: "白盒攻击",
              },
              {
                aliases: ["黑盒攻击", "black-box"],
                color: "#60a5fa",
                id: "ai_black_box_attack",
                label: "黑盒攻击",
              },
            ],
            color: "#60a5fa",
            id: "ai_adversarial_examples",
            label: "对抗样本",
          },
          {
            aliases: ["后门攻击", "后门"],
            color: "#60a5fa",
            id: "ai_backdoor_attack",
            label: "后门攻击",
          },
          {
            aliases: ["模型窃取", "模型盗用"],
            color: "#60a5fa",
            id: "ai_model_stealing",
            label: "模型窃取",
          },
        ],
        color: "#60a5fa",
        id: "ai_model_security",
        label: "模型安全",
      },
      {
        aliases: ["训练数据", "数据污染", "数据标注", "数据来源", "版权"],
        children: [
          {
            aliases: ["数据投毒", "训练数据污染"],
            color: "#60a5fa",
            id: "ai_data_poisoning",
            label: "数据投毒",
          },
          {
            aliases: ["数据来源", "数据合规"],
            color: "#60a5fa",
            id: "ai_data_provenance",
            label: "数据来源合规",
          },
          {
            aliases: ["敏感数据", "泄露"],
            color: "#60a5fa",
            id: "ai_sensitive_data_leak",
            label: "敏感数据泄露",
          },
        ],
        color: "#60a5fa",
        id: "ai_data_security",
        label: "数据安全",
      },
      {
        aliases: ["大模型", "Prompt", "越狱", "RAG", "Agent", "提示词"],
        children: [
          {
            aliases: ["Prompt Injection", "提示词注入"],
            children: [
              {
                aliases: ["直接注入", "Direct Prompt Injection"],
                color: "#60a5fa",
                id: "llm_direct_prompt_injection",
                label: "直接注入",
              },
              {
                aliases: ["间接注入", "Indirect Prompt Injection"],
                color: "#60a5fa",
                id: "llm_indirect_prompt_injection",
                label: "间接注入",
              },
            ],
            color: "#60a5fa",
            id: "llm_prompt_injection",
            label: "提示词注入",
          },
          {
            aliases: ["越狱", "jailbreak"],
            color: "#60a5fa",
            id: "llm_jailbreak",
            label: "越狱攻击",
          },
          {
            aliases: ["RAG投毒", "知识库污染"],
            color: "#60a5fa",
            id: "llm_rag_poisoning",
            label: "知识库污染",
          },
          {
            aliases: ["Agent", "工具调用", "权限控制"],
            color: "#60a5fa",
            id: "llm_agent_permission",
            label: "Agent权限控制",
          },
        ],
        color: "#60a5fa",
        id: "llm_security",
        label: "大模型安全",
      },
      {
        aliases: ["隐私", "联邦学习", "差分隐私", "同态", "成员推理"],
        color: "#60a5fa",
        id: "ai_privacy",
        label: "隐私安全",
      },
      {
        aliases: ["评测", "红队", "基准", "对齐", "偏见"],
        color: "#60a5fa",
        id: "ai_eval_redteam",
        label: "评测红队",
      },
      {
        aliases: ["内容安全", "深度伪造", "水印", "虚假信息", "伦理"],
        color: "#60a5fa",
        id: "ai_content_risk",
        label: "内容风险",
      },
    ],
    color: "#60a5fa",
    id: "ai_security",
    label: "人工智能安全",
  },
  {
    aliases: [
      "网络空间",
      "网络安全",
      "攻防",
      "渗透",
      "漏洞",
      "入侵",
      "恶意代码",
      "安全运营",
      "数据安全",
      "隐私",
      "密码",
      "加密",
      "系统",
      "软件",
      "通信",
      "威胁",
      "检测",
    ],
    children: [
      {
        aliases: ["密码", "加密", "零知识", "多方计算", "区块链"],
        children: [
          {
            aliases: ["零知识", "ZK"],
            color: "#2dd4bf",
            id: "cyber_zero_knowledge",
            label: "零知识证明",
          },
          {
            aliases: ["同态加密"],
            color: "#2dd4bf",
            id: "cyber_homomorphic_encryption",
            label: "同态加密",
          },
          {
            aliases: ["安全多方计算", "MPC"],
            color: "#2dd4bf",
            id: "cyber_mpc",
            label: "安全多方计算",
          },
        ],
        color: "#2dd4bf",
        id: "cyber_crypto",
        label: "密码学与应用",
      },
      {
        aliases: ["协议", "Web", "无线", "移动网络", "物联网", "5G", "6G"],
        children: [
          {
            aliases: ["协议安全"],
            color: "#2dd4bf",
            id: "cyber_protocol_security",
            label: "协议安全",
          },
          {
            aliases: ["Web安全", "Web"],
            color: "#2dd4bf",
            id: "cyber_web_security",
            label: "Web安全",
          },
          {
            aliases: ["物联网", "IoT"],
            color: "#2dd4bf",
            id: "cyber_iot_security",
            label: "物联网安全",
          },
        ],
        color: "#2dd4bf",
        id: "cyber_network",
        label: "网络与通信安全",
      },
      {
        aliases: ["系统", "内核", "虚拟化", "容器", "云安全", "固件", "硬件"],
        color: "#2dd4bf",
        id: "cyber_system",
        label: "系统与平台安全",
      },
      {
        aliases: ["漏洞", "程序分析", "模糊测试", "代码审计", "供应链"],
        color: "#2dd4bf",
        id: "cyber_software",
        label: "软件应用安全",
      },
      {
        aliases: ["数据安全", "隐私", "治理", "合规", "泄露", "访问控制"],
        color: "#2dd4bf",
        id: "cyber_data_privacy",
        label: "数据安全与隐私",
      },
      {
        aliases: ["检测", "响应", "APT", "威胁情报", "取证", "溯源"],
        color: "#2dd4bf",
        id: "cyber_detection",
        label: "威胁检测响应",
      },
      {
        aliases: ["靶场", "CTF", "红队", "蓝队", "风险评估", "基线"],
        color: "#2dd4bf",
        id: "cyber_ops",
        label: "攻防评测运营",
      },
    ],
    color: "#2dd4bf",
    id: "cyberspace_security",
    label: "网络空间安全",
  },
  {
    aliases: ["知识库", "科研", "课程", "项目", "阅读", "审核", "资料"],
    children: [
      {
        aliases: ["知识库", "审核", "入库"],
        color: "#94a3b8",
        id: "knowledge_workflow",
        label: "知识库流程",
      },
      {
        aliases: ["项目", "课程", "资料", "阅读"],
        color: "#94a3b8",
        id: "research_materials",
        label: "科研资料",
      },
    ],
    color: "#94a3b8",
    id: "research_engineering",
    label: "科研工程资料",
  },
];

const unclassifiedAxisNode: KnowledgeMapAxisNode = {
  aliases: [],
  color: "#64748b",
  id: "unclassified_axis",
  label: "未分类",
};

export function getKnowledgeMapAxisDomain(domainId: string | null | undefined) {
  return knowledgeMapAxisDomains.find((domain) => domain.id === domainId) ?? null;
}

function getHashIndex(input: string, size: number) {
  if (size <= 0) return 0;
  return getHashSeed(input) % size;
}

function getPointDate(point: KnowledgeMapPoint) {
  if (point.published_at) {
    const date = new Date(point.published_at);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (typeof point.year === "number") return new Date(point.year, 0, 1);
  return null;
}

function getWeekOfMonth(date: Date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getTimeAxisRatio(
  point: KnowledgeMapPoint,
  level: KnowledgeMapTimeAxisLevel,
  range: KnowledgeMapTimeAxisRange,
  minYear: number,
  maxYear: number,
) {
  const date = getPointDate(point);
  const year = date?.getFullYear() ?? point.year ?? minYear;
  const month = date ? date.getMonth() + 1 : 1;
  const day = date?.getDate() ?? 1;
  const yearSpan = Math.max(maxYear - minYear, 1);

  if (level === "month") {
    if (range.month && range.year) {
      const daysInMonth = getDaysInMonth(range.year, range.month);
      return (day - 1) / Math.max(daysInMonth - 1, 1);
    }
    return (12 - month) / 11;
  }

  if (level === "week") {
    const week = getWeekOfMonth(date ?? new Date(year, month - 1, day));
    return (week - 1) / 4;
  }

  if (level === "day") {
    return (day - 1) / Math.max(getDaysInMonth(year, month) - 1, 1);
  }

  return (maxYear - year) / yearSpan;
}

function axisNodeMatchesText(node: KnowledgeMapAxisNode, searchText: string) {
  const normalizedSearchText = searchText.toLowerCase();
  return node.aliases.some((alias) =>
    normalizedSearchText.includes(alias.toLowerCase()),
  );
}

function normalizeAxisValue(value: string) {
  return value.trim().toLowerCase();
}

function axisNodeMatchesPointTags(node: KnowledgeMapAxisNode, point: KnowledgeMapPoint) {
  const rawNodeId = node.id.startsWith("tag:") ? node.id.slice(4) : node.id;
  const pointTagIds = new Set(point.tag_ids ?? []);
  if (pointTagIds.has(rawNodeId)) return true;

  const pointTagNames = new Set(point.tags.map(normalizeAxisValue));
  return node.aliases.some((alias) => {
    const normalizedAlias = normalizeAxisValue(alias);
    return pointTagIds.has(alias) || pointTagNames.has(normalizedAlias);
  });
}

export function classifyKnowledgeMapPoint(
  point: KnowledgeMapPoint,
  scopedDomainId?: string | null,
  customAxisNodes?: KnowledgeMapAxisNode[],
) {
  const searchText = getPointText(point);
  if (customAxisNodes && customAxisNodes.length > 0) {
    const matchedNode = customAxisNodes.find((candidate) =>
      axisNodeMatchesPointTags(candidate, point),
    );
    const domain = matchedNode ?? unclassifiedAxisNode;
    return { domain, topic: null };
  }

  const scopedDomain = getKnowledgeMapAxisDomain(scopedDomainId);
  const fallbackDomain = knowledgeMapAxisDomains[knowledgeMapAxisDomains.length - 1];
  const domain =
    scopedDomain ??
    knowledgeMapAxisDomains.find((candidate) =>
      axisNodeMatchesText(candidate, searchText),
    ) ??
    fallbackDomain;
  const children = domain.children ?? [];
  let topic: KnowledgeMapAxisNode | null = null;
  if (children.length > 0) {
    topic =
      children.find((candidate) => axisNodeMatchesText(candidate, searchText)) ??
      children[getHashIndex(point.id, children.length)];
  }

  return { domain, topic };
}

export function getKnowledgeMapAxisChildren(domainId: string | null | undefined) {
  return getKnowledgeMapAxisDomain(domainId)?.children ?? [];
}

export function pointMatchesKnowledgeMapAxis(
  point: KnowledgeMapPoint,
  domainId: string | null,
  topicId: string | null,
) {
  if (!domainId) return true;
  const baseClassification = classifyKnowledgeMapPoint(point);
  if (baseClassification.domain.id !== domainId) return false;
  if (!topicId) return true;
  const classification = classifyKnowledgeMapPoint(point, domainId);
  return classification.topic?.id === topicId;
}

function getPointText(point: KnowledgeMapPoint) {
  return [
    point.title,
    point.cluster_label,
    point.summary_preview,
    point.item_type,
    ...(point.tag_ids ?? []),
    ...point.tags,
  ]
    .filter(Boolean)
    .join(" ");
}

export function KnowledgeMapCanvas({
  activeAxisNodeId = null,
  axisDomainId = null,
  axisNodes: customAxisNodes,
  clusters,
  onPointClick,
  points,
  selectedPointId,
  timeAxisLevel = "year",
  timeAxisRange = {},
  variant = "light",
}: KnowledgeMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<d3Zoom.ZoomTransform>(d3Zoom.zoomIdentity);
  const zoomBehaviorRef =
    useRef<d3Zoom.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 620 });
  const [hoveredPoint, setHoveredPoint] = useState<CanvasPoint | null>(null);

  const colorByCluster = useMemo(() => {
    return new Map(clusters.map((cluster) => [cluster.id, cluster.color]));
  }, [clusters]);

  const canvasPoints = useMemo<CanvasPoint[]>(() => {
    if (points.length === 0) return [];

    const isODataMap = variant === "odatamap";
    const years = points
      .map((point) => point.year)
      .filter((year): year is number => typeof year === "number");
    const minYear = years.length > 0 ? Math.min(...years) : new Date().getFullYear();
    const maxYear = years.length > 0 ? Math.max(...years) : minYear;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 72;
    const safeWidth = Math.max(dimensions.width - padding * 2, 1);
    const safeHeight = Math.max(dimensions.height - padding * 2, 1);
    const xSpan = Math.max(maxX - minX, 1);
    const ySpan = Math.max(maxY - minY, 1);

    return points.map((point) => {
      const clusterKey = point.cluster_id ?? "unclustered";
      const classification = classifyKnowledgeMapPoint(
        point,
        axisDomainId,
        customAxisNodes,
      );
      const domain = classification.domain;
      const axisNodes = customAxisNodes?.length
        ? customAxisNodes
        : axisDomainId && domain.children?.length
          ? domain.children
          : knowledgeMapAxisDomains;
      const currentAxisNode =
        axisDomainId && classification.topic
          ? classification.topic
          : domain;
      const domainIndex = Math.max(
        axisNodes.findIndex((axisDomain) => axisDomain.id === currentAxisNode.id),
        0,
      );
      const domainSpan = Math.max(axisNodes.length - 1, 1);
      const seed = getHashSeed(point.id);
      const jitterX = ((seed % 29) - 14) * 0.9;
      const jitterY = (((seed * 7) % 25) - 12) * 0.9;
      const semanticX =
        padding + (domainIndex / domainSpan) * safeWidth + jitterX;
      const semanticY =
        padding +
        getTimeAxisRatio(
          point,
          timeAxisLevel,
          timeAxisRange,
          minYear,
          maxYear,
        ) *
          safeHeight +
        jitterY;
      return {
        ...point,
        axisDomainLabel: currentAxisNode.label,
        axisNodeId: currentAxisNode.id,
        axisYear: point.year ?? null,
        canvasX: isODataMap
          ? Math.min(dimensions.width - padding, Math.max(padding, semanticX))
          : padding + ((point.x - minX) / xSpan) * safeWidth,
        canvasY: isODataMap
          ? Math.min(dimensions.height - padding, Math.max(padding, semanticY))
          : padding + ((point.y - minY) / ySpan) * safeHeight,
        color: isODataMap
          ? classification.domain.color
          : colorByCluster.get(clusterKey) ?? "#64748b",
      };
    });
  }, [
    customAxisNodes,
    axisDomainId,
    colorByCluster,
    dimensions.height,
    dimensions.width,
    points,
    timeAxisLevel,
    timeAxisRange,
    variant,
  ]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nextDimensions = {
        width: Math.max(Math.round(rect.width), 320),
        height: Math.max(Math.round(rect.height), 360),
      };

      setDimensions((current) => {
        if (
          current.width === nextDimensions.width &&
          current.height === nextDimensions.height
        ) {
          return current;
        }
        return nextDimensions;
      });
    };

    updateDimensions();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => updateDimensions());
    if (containerRef.current) {
      resizeObserver?.observe(containerRef.current);
    }
    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = d3Selection.select(canvasRef.current);
    const zoom = d3Zoom
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.35, 8])
      .on("zoom", (event: d3Zoom.D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        transformRef.current = event.transform;
        draw();
      });

    zoomBehaviorRef.current = zoom;
    canvas.call(zoom);
    return () => {
      canvas.on(".zoom", null);
    };
  });

  useEffect(() => {
    draw();
  });

  const findPoint = (clientX: number, clientY: number): CanvasPoint | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const transform = transformRef.current;
    const x = (localX - transform.x) / transform.k;
    const y = (localY - transform.y) / transform.k;

    let nearest: CanvasPoint | null = null;
    let nearestDistance = Infinity;
    for (const point of canvasPoints) {
      const distance = Math.hypot(point.canvasX - x, point.canvasY - y);
      if (distance < 12 && distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    }
    return nearest;
  };

  const applyZoomTransform = (nextTransform: d3Zoom.ZoomTransform) => {
    if (!canvasRef.current || !zoomBehaviorRef.current) {
      transformRef.current = nextTransform;
      draw();
      return;
    }
    const zoomBehavior = zoomBehaviorRef.current;
    const applyTransform = zoomBehavior.transform.bind(zoomBehavior);
    d3Selection.select(canvasRef.current).call(applyTransform, nextTransform);
  };

  const zoomBy = (scaleFactor: number) => {
    const current = transformRef.current;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const nextScale = Math.min(8, Math.max(0.35, current.k * scaleFactor));
    const nextTransform = current
      .translate(centerX / current.k, centerY / current.k)
      .scale(nextScale / current.k)
      .translate(-centerX / current.k, -centerY / current.k);

    applyZoomTransform(nextTransform);
  };

  const resetZoom = () => applyZoomTransform(d3Zoom.zoomIdentity);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * pixelRatio;
    canvas.height = dimensions.height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, dimensions.width, dimensions.height);
    const isODataMap = variant === "odatamap";
    context.fillStyle = isODataMap ? "#02040a" : "#ffffff";
    context.fillRect(0, 0, dimensions.width, dimensions.height);

    if (isODataMap) {
      for (let i = 0; i < 300; i += 1) {
        const x = (i * 83 + (i % 11) * 29) % Math.max(dimensions.width, 1);
        const y = (i * 47 + (i % 7) * 31) % Math.max(dimensions.height, 1);
        const radius = i % 13 === 0 ? 1.25 : i % 5 === 0 ? 0.85 : 0.55;
        context.fillStyle =
          i % 17 === 0
            ? "rgba(147, 197, 253, 0.58)"
            : "rgba(255, 255, 255, 0.28)";
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    const transform = transformRef.current;
    context.save();
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);

    context.strokeStyle = isODataMap
      ? "rgba(96, 165, 250, 0.09)"
      : "rgba(148, 163, 184, 0.18)";
    context.lineWidth = 1;
    for (let x = 40; x < dimensions.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, dimensions.height);
      context.stroke();
    }
    for (let y = 40; y < dimensions.height; y += 80) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(dimensions.width, y);
      context.stroke();
    }

    if (isODataMap) {
      const groupedPoints = new Map<string, CanvasPoint[]>();
      canvasPoints.forEach((point) => {
        const key = point.axisDomainLabel;
        groupedPoints.set(key, [...(groupedPoints.get(key) ?? []), point]);
      });

      Array.from(groupedPoints.entries()).forEach(([groupId, groupPoints], groupIndex) => {
        const groupActive =
          Boolean(activeAxisNodeId) &&
          groupPoints.some((point) => point.axisNodeId === activeAxisNodeId);
        const centerX =
          groupPoints.reduce((sum, point) => sum + point.canvasX, 0) /
          groupPoints.length;
        const centerY =
          groupPoints.reduce((sum, point) => sum + point.canvasY, 0) /
          groupPoints.length;
        const color = groupPoints[0]?.color ?? "#60a5fa";
        const seed = getHashSeed(groupId);
        const angle = ((seed % 42) - 21) * (Math.PI / 180);

        context.save();
        context.globalAlpha = groupActive ? 0.9 : 0.72;
        groupPoints.forEach((point, pointIndex) => {
          for (let i = 0; i < 18; i += 1) {
            const particleSeed = seed + pointIndex * 131 + i * 37;
            const theta = (particleSeed % 360) * (Math.PI / 180);
            const distance = 12 + (particleSeed % 54);
            const x =
              point.canvasX +
              Math.cos(theta) * distance +
              (((particleSeed * 13) % 17) - 8);
            const y =
              point.canvasY +
              Math.sin(theta) * distance * 0.58 +
              (((particleSeed * 7) % 13) - 6);
            const size = i % 5 === 0 ? 2.6 : 1.7;

            context.fillStyle = withAlpha(color, i % 4 === 0 ? 0.5 : 0.34);
            context.shadowColor = withAlpha(color, 0.45);
            context.shadowBlur = i % 5 === 0 ? 5 : 2;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
          }
        });
        context.globalAlpha = 1;
        context.shadowBlur = 0;
        context.restore();

        if (dimensions.width > 520) {
          context.save();
          context.globalAlpha = 1;
          context.translate(centerX, centerY - 14);
          context.rotate(angle * 0.65);
          context.font = "600 12px Inter, ui-sans-serif, system-ui, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.shadowColor = "rgba(2, 6, 23, 0.8)";
          context.shadowBlur = 8;
          context.fillStyle = withAlpha(color, groupIndex % 2 === 0 ? 0.78 : 0.64);
          context.fillText(
            truncateCanvasLabel(groupPoints[0]?.axisDomainLabel),
            0,
            0,
          );
          context.restore();
        }
      });
    }

    canvasPoints.forEach((point) => {
      const isSelected = point.id === selectedPointId;
      const axisActive =
        isODataMap &&
        Boolean(activeAxisNodeId) &&
        point.axisNodeId === activeAxisNodeId;
      context.beginPath();
      context.arc(point.canvasX, point.canvasY, isSelected ? 8 : 5, 0, Math.PI * 2);
      context.fillStyle = point.color;
      context.shadowColor = isODataMap ? point.color : "transparent";
      context.shadowBlur = isODataMap ? (isSelected ? 18 : axisActive ? 14 : 8) : 0;
      context.globalAlpha = isSelected ? 1 : axisActive ? 1 : isODataMap ? 0.86 : 0.78;
      context.fill();
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.strokeStyle = isSelected
        ? isODataMap
          ? "#60a5fa"
          : "#0f172a"
        : isODataMap
          ? "rgba(255, 255, 255, 0.42)"
          : "#ffffff";
      context.lineWidth = isSelected ? 2.5 : 1.5;
      context.stroke();
    });

    context.restore();
  };

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px] w-full">
      <canvas
        ref={canvasRef}
        className={
          variant === "odatamap"
            ? `
              h-full w-full cursor-grab rounded-[14px] border border-[#333843]
              bg-[#111217]
            `
            : `
              h-full w-full cursor-grab rounded border border-border
              bg-background
            `
        }
        style={{ height: dimensions.height, width: dimensions.width }}
        onClick={(event) => {
          const point = findPoint(event.clientX, event.clientY);
          if (point) onPointClick(point.id);
        }}
        onMouseMove={(event) => setHoveredPoint(findPoint(event.clientX, event.clientY))}
        onMouseLeave={() => setHoveredPoint(null)}
      />
      {variant === "odatamap" && (
        <div className={`
          absolute right-3 top-3 z-10 flex overflow-hidden rounded-full border
          border-[#2f3540] bg-[#101318]/86 shadow-[0_14px_34px_rgba(0,0,0,0.32)]
          backdrop-blur
        `}>
          <button
            type="button"
            className={`
              flex h-8 w-9 items-center justify-center border-r border-[#2f3540]
              text-sm font-semibold text-[#bfdbfe] transition-colors

              hover:bg-[#2563eb]/20
            `}
            onClick={() => zoomBy(1.28)}
            aria-label="放大知识地图"
            title="放大"
          >
            +
          </button>
          <button
            type="button"
            className={`
              flex h-8 w-9 items-center justify-center border-r border-[#2f3540]
              text-sm font-semibold text-[#bfdbfe] transition-colors

              hover:bg-[#2563eb]/20
            `}
            onClick={() => zoomBy(0.78)}
            aria-label="缩小知识地图"
            title="缩小"
          >
            -
          </button>
          <button
            type="button"
            className={`
              flex h-8 items-center justify-center px-3 text-xs font-semibold
              text-stone-300 transition-colors

              hover:bg-[#2563eb]/20 hover:text-stone-100
            `}
            onClick={resetZoom}
            aria-label="重置知识地图视图"
            title="重置视图"
          >
            重置
          </button>
        </div>
      )}
      {hoveredPoint && (
        <div
          className={`
            pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-md
            -translate-x-1/2 rounded border px-4 py-3 text-sm shadow-lg
          `}
          style={
            variant === "odatamap"
              ? {
                  background: "rgba(18, 20, 27, 0.94)",
                  borderColor: "rgba(96, 165, 250, 0.35)",
                  color: "#f5f5f4",
                }
              : undefined
          }
        >
          <div className={variant === "odatamap" ? `
            font-semibold text-stone-100
          ` : `font-semibold text-foreground`}>{hoveredPoint.title}</div>
          <div className={variant === "odatamap" ? "mt-1 text-stone-400" : `
            mt-1 text-muted-foreground
          `}>
            {variant === "odatamap"
              ? hoveredPoint.axisDomainLabel
              : hoveredPoint.cluster_label ?? "未分组"}
            {hoveredPoint.year ? ` · ${hoveredPoint.year}` : ""}
          </div>
          <div className={variant === "odatamap" ? "mt-1 text-xs text-[#60a5fa]" : `
            mt-1 text-xs text-muted-foreground
          `}>点击查看详情</div>
        </div>
      )}
    </div>
  );
}
