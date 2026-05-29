"""Default structured tag seed data for the V3.1 taxonomy."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from typing import NotRequired, TypedDict


class TagTreeNode(TypedDict):
    """Tree-shaped seed node before database IDs and paths are derived."""

    name: str
    slug: str
    tag_group: str
    description: str
    synonyms: list[str]
    children: list[TagTreeNode]
    sort_order: int
    is_system: bool
    is_selectable: bool


class FlatTagSeed(TypedDict):
    """Flattened tag row ready for insertion into SQLite."""

    id: str
    name: str
    slug: str
    tag_group: str
    parent_id: str | None
    level: int
    path: str
    description: str
    synonyms: list[str]
    sort_order: int
    is_system: bool
    is_selectable: bool
    is_active: bool


class RawTagSpec(TypedDict):
    """Compact input form for nested taxonomy definitions."""

    name: str
    slug: str
    description: NotRequired[str]
    synonyms: NotRequired[list[str]]
    children: NotRequired[list[RawTagSpec]]
    is_selectable: NotRequired[bool]


def _tag(
    tag_group: str,
    name: str,
    slug: str,
    *,
    children: list[TagTreeNode] | None = None,
    description: str = "",
    is_selectable: bool = True,
    sort_order: int = 0,
    synonyms: list[str] | None = None,
) -> TagTreeNode:
    return {
        "name": name,
        "slug": slug,
        "tag_group": tag_group,
        "description": description,
        "synonyms": synonyms or [],
        "children": children or [],
        "sort_order": sort_order,
        "is_system": True,
        "is_selectable": is_selectable,
    }


def _leaves(tag_group: str, items: list[tuple[str, str]]) -> list[TagTreeNode]:
    return [
        _tag(
            tag_group,
            name,
            slug,
            description=f"{name}默认系统标签。",
            sort_order=index,
        )
        for index, (name, slug) in enumerate(items)
    ]


def _topic(spec: RawTagSpec, sort_order: int = 0) -> TagTreeNode:
    children = [
        _topic(child, child_index)
        for child_index, child in enumerate(spec.get("children", []))
    ]
    return _tag(
        "research_topic",
        spec["name"],
        spec["slug"],
        children=children,
        description=spec.get("description", f"{spec['name']}研究主题。"),
        is_selectable=spec.get("is_selectable", True),
        sort_order=sort_order,
        synonyms=spec.get("synonyms", []),
    )


CYBERSECURITY_TOPIC: RawTagSpec = {
    "name": "网络空间安全",
    "slug": "cyberspace-security",
    "description": "网络空间安全研究主题根节点。",
    "children": [
        {"name": "网络空间安全基础理论", "slug": "cyberspace-security-foundations"},
        {
            "name": "密码学与密码应用",
            "slug": "cryptography-and-applications",
            "children": [
                {"name": "对称密码", "slug": "symmetric-cryptography"},
                {"name": "公钥密码", "slug": "public-key-cryptography"},
                {"name": "后量子密码", "slug": "post-quantum-cryptography"},
                {
                    "name": "零知识证明",
                    "slug": "zero-knowledge-proof",
                    "children": [
                        {"name": "zk-SNARK", "slug": "zk-snark"},
                        {"name": "zk-STARK", "slug": "zk-stark"},
                        {"name": "交互式零知识证明", "slug": "interactive-zkp"},
                    ],
                },
                {"name": "同态加密", "slug": "homomorphic-encryption"},
                {"name": "安全多方计算", "slug": "secure-multi-party-computation"},
                {"name": "密码协议", "slug": "cryptographic-protocol"},
                {"name": "区块链密码学", "slug": "blockchain-cryptography"},
            ],
        },
        {
            "name": "网络与通信安全",
            "slug": "network-and-communication-security",
            "children": [
                {"name": "协议安全", "slug": "protocol-security"},
                {
                    "name": "Web安全",
                    "slug": "web-security",
                    "children": [
                        {"name": "XSS攻击", "slug": "xss-attack"},
                        {"name": "SQL注入", "slug": "sql-injection"},
                        {"name": "CSRF攻击", "slug": "csrf-attack"},
                        {"name": "认证绕过", "slug": "authentication-bypass"},
                    ],
                },
                {"name": "无线与移动网络安全", "slug": "wireless-mobile-network-security"},
                {"name": "物联网安全", "slug": "iot-security"},
                {"name": "5G/6G安全", "slug": "5g-6g-security"},
                {"name": "车联网安全", "slug": "vehicle-network-security"},
                {"name": "卫星互联网安全", "slug": "satellite-internet-security"},
                {"name": "SDN/NFV安全", "slug": "sdn-nfv-security"},
            ],
        },
        {
            "name": "系统与平台安全",
            "slug": "system-and-platform-security",
            "children": [
                {"name": "操作系统安全", "slug": "operating-system-security"},
                {"name": "内核安全", "slug": "kernel-security"},
                {"name": "虚拟化安全", "slug": "virtualization-security"},
                {"name": "容器安全", "slug": "container-security"},
                {"name": "云安全", "slug": "cloud-security"},
                {"name": "可信执行环境", "slug": "trusted-execution-environment"},
                {"name": "固件安全", "slug": "firmware-security"},
                {"name": "硬件安全", "slug": "hardware-security"},
                {"name": "侧信道攻击与防御", "slug": "side-channel-attack-defense"},
            ],
        },
        {
            "name": "软件与应用安全",
            "slug": "software-and-application-security",
            "children": [
                {
                    "name": "漏洞挖掘",
                    "slug": "vulnerability-discovery",
                    "children": [
                        {"name": "静态分析漏洞挖掘", "slug": "static-vulnerability-discovery"},
                        {"name": "动态分析漏洞挖掘", "slug": "dynamic-vulnerability-discovery"},
                        {"name": "二进制漏洞挖掘", "slug": "binary-vulnerability-discovery"},
                    ],
                },
                {"name": "漏洞利用", "slug": "vulnerability-exploitation"},
                {"name": "程序分析", "slug": "program-analysis"},
                {"name": "模糊测试", "slug": "fuzz-testing"},
                {"name": "代码审计", "slug": "code-audit"},
                {"name": "API安全", "slug": "api-security"},
                {"name": "移动应用安全", "slug": "mobile-application-security"},
                {"name": "软件供应链安全", "slug": "software-supply-chain-security"},
                {"name": "DevSecOps", "slug": "devsecops"},
            ],
        },
        {
            "name": "数据安全与隐私保护",
            "slug": "data-security-and-privacy-protection",
            "children": [
                {
                    "name": "数据分类分级",
                    "slug": "data-classification-grading",
                    "children": [
                        {"name": "敏感数据识别", "slug": "sensitive-data-identification"},
                        {"name": "数据分级策略", "slug": "data-grading-policy"},
                        {"name": "数据资产目录", "slug": "data-asset-catalog"},
                    ],
                },
                {"name": "数据访问控制", "slug": "data-access-control"},
                {"name": "数据库安全", "slug": "database-security"},
                {"name": "数据泄露检测", "slug": "data-leakage-detection"},
                {"name": "隐私计算", "slug": "privacy-computing"},
                {"name": "差分隐私", "slug": "data-differential-privacy"},
                {"name": "联邦学习隐私", "slug": "federated-learning-privacy"},
                {"name": "数据合规", "slug": "data-compliance"},
            ],
        },
        {
            "name": "身份认证与访问控制",
            "slug": "identity-authentication-and-access-control",
            "children": [
                {"name": "身份认证", "slug": "identity-authentication"},
                {"name": "多因素认证", "slug": "multi-factor-authentication"},
                {"name": "身份联邦", "slug": "identity-federation"},
                {"name": "访问控制模型", "slug": "access-control-model"},
                {"name": "零信任", "slug": "zero-trust"},
                {"name": "生物特征认证", "slug": "biometric-authentication"},
            ],
        },
        {
            "name": "威胁检测与响应",
            "slug": "threat-detection-and-response",
            "children": [
                {
                    "name": "入侵检测",
                    "slug": "intrusion-detection",
                    "children": [
                        {"name": "网络入侵检测", "slug": "network-intrusion-detection"},
                        {"name": "主机入侵检测", "slug": "host-intrusion-detection"},
                        {"name": "异常行为检测", "slug": "anomaly-behavior-detection"},
                    ],
                },
                {"name": "恶意代码分析", "slug": "malware-analysis"},
                {"name": "APT检测", "slug": "apt-detection"},
                {"name": "威胁情报", "slug": "threat-intelligence"},
                {"name": "态势感知", "slug": "situational-awareness"},
                {"name": "数字取证", "slug": "digital-forensics"},
                {"name": "攻击溯源", "slug": "attack-attribution"},
                {"name": "日志分析", "slug": "log-analysis"},
                {"name": "SOC/SIEM/XDR", "slug": "soc-siem-xdr"},
            ],
        },
        {
            "name": "工业控制与关键基础设施安全",
            "slug": "industrial-control-and-critical-infrastructure-security",
            "children": [
                {"name": "工控安全", "slug": "industrial-control-security"},
                {"name": "SCADA安全", "slug": "scada-security"},
                {"name": "电力安全", "slug": "power-security"},
                {"name": "能源安全", "slug": "energy-security"},
                {"name": "交通安全", "slug": "transportation-security"},
                {"name": "医疗系统安全", "slug": "medical-system-security"},
                {"name": "OT安全", "slug": "ot-security"},
            ],
        },
        {
            "name": "信息内容安全与网络治理",
            "slug": "information-content-security-and-cyber-governance",
            "children": [
                {"name": "内容安全", "slug": "content-safety"},
                {"name": "虚假信息检测", "slug": "misinformation-detection"},
                {"name": "网络舆情安全", "slug": "online-public-opinion-security"},
                {"name": "社会工程", "slug": "social-engineering"},
                {"name": "钓鱼检测", "slug": "phishing-detection"},
                {"name": "网络空间治理", "slug": "cyberspace-governance"},
            ],
        },
        {
            "name": "攻防评测与安全运营",
            "slug": "attack-defense-evaluation-and-security-operations",
            "children": [
                {"name": "渗透测试", "slug": "penetration-testing"},
                {"name": "红队评估", "slug": "red-team-assessment"},
                {"name": "蓝队防御", "slug": "blue-team-defense"},
                {"name": "靶场", "slug": "cyber-range"},
                {"name": "CTF", "slug": "ctf"},
                {"name": "风险评估", "slug": "risk-assessment"},
                {"name": "安全基线", "slug": "security-baseline"},
            ],
        },
    ],
}


AI_SECURITY_TOPIC: RawTagSpec = {
    "name": "人工智能安全",
    "slug": "ai-security",
    "description": "按 Safety at Scale 综述组织的大模型与智能体安全研究主题。",
    "synonyms": ["AI安全", "大模型安全", "智能体安全"],
    "children": [
        {
            "name": "视觉基础模型安全",
            "slug": "vision-foundation-model-safety",
            "synonyms": ["VFM安全", "ViT安全", "SAM安全"],
            "children": [
                {
                    "name": "ViT攻击与防御",
                    "slug": "vit-attacks-and-defenses",
                    "children": [
                        {
                            "name": "对抗攻击",
                            "slug": "vit-adversarial-attacks",
                            "children": [
                                {
                                    "name": "白盒攻击",
                                    "slug": "white-box-attacks",
                                    "children": [
                                        {"name": "图像块攻击", "slug": "patch-attacks"},
                                        {
                                            "name": "位置嵌入攻击",
                                            "slug": "position-embedding-attacks",
                                        },
                                        {"name": "注意力攻击", "slug": "attention-attacks"},
                                    ],
                                },
                                {
                                    "name": "黑盒攻击",
                                    "slug": "black-box-attacks",
                                    "children": [
                                        {"name": "迁移攻击", "slug": "transfer-based-attacks"},
                                        {"name": "查询攻击", "slug": "query-based-attacks"},
                                    ],
                                },
                            ],
                        },
                        {
                            "name": "对抗防御",
                            "slug": "vit-adversarial-defenses",
                            "children": [
                                {"name": "对抗训练", "slug": "adversarial-training"},
                                {"name": "对抗检测", "slug": "adversarial-detection"},
                                {"name": "鲁棒架构", "slug": "robust-architecture"},
                                {"name": "对抗净化", "slug": "adversarial-purification"},
                            ],
                        },
                        {
                            "name": "后门攻击",
                            "slug": "vit-backdoor-attacks",
                            "children": [
                                {"name": "数据投毒", "slug": "data-poisoning"},
                            ],
                        },
                        {
                            "name": "后门防御",
                            "slug": "vit-backdoor-defenses",
                            "children": [
                                {"name": "鲁棒推理", "slug": "robust-inference"},
                            ],
                        },
                    ],
                },
                {
                    "name": "SAM攻击与防御",
                    "slug": "sam-attacks-and-defenses",
                    "children": [
                        {
                            "name": "对抗攻击",
                            "slug": "sam-adversarial-attacks",
                            "children": [
                                {"name": "白盒提示无关攻击", "slug": "white-box-prompt-agnostic-attacks"},
                                {"name": "黑盒迁移攻击", "slug": "black-box-transfer-attacks"},
                                {"name": "黑盒通用攻击", "slug": "black-box-universal-attacks"},
                            ],
                        },
                        {
                            "name": "对抗防御",
                            "slug": "sam-adversarial-defenses",
                            "children": [
                                {"name": "对抗调优", "slug": "adversarial-tuning"},
                            ],
                        },
                        {
                            "name": "后门与投毒攻击",
                            "slug": "sam-backdoor-and-poisoning-attacks",
                            "children": [
                                {"name": "数据投毒", "slug": "data-poisoning"},
                            ],
                        },
                    ],
                },
            ],
        },
        {
            "name": "大语言模型安全",
            "slug": "large-language-model-safety",
            "synonyms": ["LLM安全", "大模型文本安全"],
            "children": [
                {
                    "name": "对抗攻击",
                    "slug": "llm-adversarial-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "对抗防御",
                    "slug": "llm-adversarial-defenses",
                    "children": [
                        {"name": "对抗检测", "slug": "adversarial-detection"},
                        {"name": "鲁棒推理", "slug": "robust-inference"},
                    ],
                },
                {
                    "name": "越狱攻击",
                    "slug": "llm-jailbreak-attacks",
                    "children": [
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                    ],
                },
                {
                    "name": "越狱防御",
                    "slug": "llm-jailbreak-defenses",
                    "children": [
                        {"name": "输入防御", "slug": "input-defense"},
                        {"name": "输出防御", "slug": "output-defense"},
                        {"name": "集成防御", "slug": "ensemble-defense"},
                        {"name": "微调攻击防御", "slug": "fine-tuning-attack-defense"},
                    ],
                },
                {
                    "name": "提示注入攻击",
                    "slug": "llm-prompt-injection-attacks",
                    "synonyms": ["Prompt Injection"],
                    "children": [
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "提示注入防御",
                    "slug": "llm-prompt-injection-defenses",
                    "children": [
                        {"name": "输入防御", "slug": "input-defense"},
                        {"name": "参数防御", "slug": "parameter-defense"},
                    ],
                },
                {
                    "name": "后门攻击",
                    "slug": "llm-backdoor-attacks",
                    "children": [
                        {"name": "数据投毒", "slug": "data-poisoning"},
                        {"name": "训练操控", "slug": "training-manipulation"},
                        {"name": "参数修改", "slug": "parameter-modification"},
                    ],
                },
                {
                    "name": "后门防御",
                    "slug": "llm-backdoor-defenses",
                    "children": [
                        {"name": "后门检测", "slug": "backdoor-detection"},
                        {"name": "后门移除", "slug": "backdoor-removal"},
                        {"name": "鲁棒训练", "slug": "robust-training"},
                        {"name": "鲁棒推理", "slug": "robust-inference"},
                    ],
                },
                {
                    "name": "安全对齐",
                    "slug": "safety-alignment",
                    "children": [
                        {"name": "人类反馈", "slug": "human-feedback"},
                        {"name": "AI反馈", "slug": "ai-feedback"},
                        {"name": "社会交互", "slug": "social-interactions"},
                        {"name": "欺骗性对齐", "slug": "deceptive-alignment"},
                    ],
                },
                {
                    "name": "能耗时延攻击",
                    "slug": "llm-energy-latency-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "模型提取攻击",
                    "slug": "llm-model-extraction-attacks",
                    "children": [
                        {"name": "微调阶段", "slug": "fine-tuning-stage"},
                        {"name": "对齐阶段", "slug": "alignment-stage"},
                    ],
                },
                {
                    "name": "数据提取攻击",
                    "slug": "llm-data-extraction-attacks",
                    "children": [
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                    ],
                },
            ],
        },
        {
            "name": "视觉语言预训练模型安全",
            "slug": "vision-language-pre-training-model-safety",
            "synonyms": ["VLP安全"],
            "children": [
                {
                    "name": "对抗攻击",
                    "slug": "vlp-adversarial-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "对抗防御",
                    "slug": "vlp-adversarial-defenses",
                    "children": [
                        {"name": "对抗调优", "slug": "adversarial-tuning"},
                        {"name": "对抗训练", "slug": "adversarial-training"},
                        {"name": "对抗检测", "slug": "adversarial-detection"},
                    ],
                },
                {
                    "name": "后门与投毒攻击",
                    "slug": "vlp-backdoor-and-poisoning-attacks",
                    "children": [
                        {"name": "后门攻击", "slug": "backdoor-attacks"},
                        {"name": "投毒攻击", "slug": "poisoning-attacks"},
                        {"name": "后门与投毒", "slug": "backdoor-and-poisoning"},
                    ],
                },
                {
                    "name": "后门与投毒防御",
                    "slug": "vlp-backdoor-and-poisoning-defenses",
                    "children": [
                        {"name": "后门移除", "slug": "backdoor-removal"},
                        {"name": "鲁棒训练", "slug": "robust-training"},
                        {"name": "后门检测", "slug": "backdoor-detection"},
                    ],
                },
            ],
        },
        {
            "name": "视觉语言模型安全",
            "slug": "vision-language-model-safety",
            "synonyms": ["VLM安全"],
            "children": [
                {
                    "name": "对抗攻击",
                    "slug": "vlm-adversarial-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "灰盒攻击", "slug": "gray-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "越狱攻击",
                    "slug": "vlm-jailbreak-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "越狱防御",
                    "slug": "vlm-jailbreak-defenses",
                    "children": [
                        {"name": "越狱检测", "slug": "jailbreak-detection"},
                        {"name": "越狱预防", "slug": "jailbreak-prevention"},
                    ],
                },
                {
                    "name": "能耗时延攻击",
                    "slug": "vlm-energy-latency-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                    ],
                },
                {
                    "name": "提示注入攻击",
                    "slug": "vlm-prompt-injection-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "后门与投毒攻击",
                    "slug": "vlm-backdoor-and-poisoning-attacks",
                    "children": [
                        {"name": "后门攻击", "slug": "backdoor-attacks"},
                        {"name": "投毒攻击", "slug": "poisoning-attacks"},
                    ],
                },
            ],
        },
        {
            "name": "扩散模型安全",
            "slug": "diffusion-model-safety",
            "synonyms": ["DM安全", "生成模型安全"],
            "children": [
                {
                    "name": "对抗攻击",
                    "slug": "dm-adversarial-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "灰盒攻击", "slug": "gray-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "越狱攻击",
                    "slug": "dm-jailbreak-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "灰盒攻击", "slug": "gray-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "越狱防御",
                    "slug": "dm-jailbreak-defenses",
                    "children": [
                        {"name": "概念擦除", "slug": "concept-erasure"},
                        {"name": "推理引导", "slug": "inference-guidance"},
                    ],
                },
                {
                    "name": "后门攻击",
                    "slug": "dm-backdoor-attacks",
                    "children": [
                        {"name": "训练操控", "slug": "training-manipulation"},
                        {"name": "数据投毒", "slug": "data-poisoning"},
                    ],
                },
                {
                    "name": "后门防御",
                    "slug": "dm-backdoor-defenses",
                    "children": [
                        {"name": "后门检测", "slug": "backdoor-detection"},
                        {"name": "后门移除", "slug": "backdoor-removal"},
                    ],
                },
                {
                    "name": "成员推断攻击",
                    "slug": "dm-membership-inference-attacks",
                    "children": [
                        {"name": "白盒攻击", "slug": "white-box-attacks"},
                        {"name": "灰盒攻击", "slug": "gray-box-attacks"},
                        {"name": "黑盒攻击", "slug": "black-box-attacks"},
                    ],
                },
                {
                    "name": "数据提取攻击",
                    "slug": "dm-data-extraction-attacks",
                    "children": [
                        {"name": "显式条件提取", "slug": "explicit-condition-based-extraction"},
                        {"name": "代理条件提取", "slug": "surrogate-condition-based-extraction"},
                    ],
                },
                {
                    "name": "模型提取攻击",
                    "slug": "dm-model-extraction-attacks",
                    "children": [
                        {"name": "LoRA提取", "slug": "lora-based-extraction"},
                    ],
                },
                {
                    "name": "知识产权保护",
                    "slug": "intellectual-property-protection",
                    "children": [
                        {"name": "自然数据保护", "slug": "natural-data-protection"},
                        {"name": "生成数据保护", "slug": "generated-data-protection"},
                        {"name": "模型保护", "slug": "model-protection"},
                    ],
                },
            ],
        },
        {
            "name": "智能体安全",
            "slug": "agent-safety",
            "synonyms": ["Agent安全", "大模型智能体安全"],
            "children": [
                {
                    "name": "间接提示注入",
                    "slug": "indirect-prompt-injection",
                    "children": [
                        {"name": "恶意指令", "slug": "malicious-instruction"},
                        {"name": "间接越狱", "slug": "indirect-jailbreak"},
                        {"name": "防御", "slug": "defenses"},
                    ],
                },
                {
                    "name": "记忆攻击与防御",
                    "slug": "memory-attacks-and-defenses",
                    "children": [
                        {"name": "后门攻击", "slug": "backdoor-attacks"},
                        {"name": "投毒攻击", "slug": "poisoning-attacks"},
                        {"name": "防御", "slug": "defenses"},
                    ],
                },
                {
                    "name": "工具攻击与防御",
                    "slug": "tool-attacks-and-defenses",
                    "children": [
                        {"name": "工具操控", "slug": "tool-manipulation"},
                        {"name": "MCP操控", "slug": "mcp-manipulation"},
                        {"name": "防御", "slug": "defenses"},
                    ],
                },
                {
                    "name": "VLM智能体",
                    "slug": "vlm-agent",
                    "children": [
                        {"name": "攻击", "slug": "attacks"},
                        {"name": "防御", "slug": "defenses"},
                    ],
                },
                {
                    "name": "多智能体系统",
                    "slug": "multi-agent-systems",
                    "children": [
                        {"name": "攻击", "slug": "attacks"},
                        {"name": "防御", "slug": "defenses"},
                    ],
                },
                {
                    "name": "具身智能体",
                    "slug": "embodied-agents",
                    "children": [
                        {"name": "攻击", "slug": "attacks"},
                        {"name": "防御", "slug": "defenses"},
                    ],
                },
                {
                    "name": "智能体攻击与防御",
                    "slug": "agentic-attacks-and-defenses",
                    "children": [
                        {"name": "智能体攻击", "slug": "agentic-attacks"},
                        {"name": "智能体防御", "slug": "agentic-defenses"},
                    ],
                },
                {
                    "name": "基准测试",
                    "slug": "agent-benchmarks",
                    "children": [
                        {"name": "仿真基准", "slug": "simulation-based-benchmarks"},
                        {"name": "真实交互基准", "slug": "real-interaction-benchmarks"},
                    ],
                },
            ],
        },
        {
            "name": "开放挑战",
            "slug": "open-challenges",
            "children": [
                {"name": "综合安全评估", "slug": "comprehensive-safety-evaluation"},
                {"name": "可扩展有效防御", "slug": "scalable-effective-defense"},
                {"name": "可持续数据实践", "slug": "sustainable-data-practices"},
                {"name": "社区协作与治理", "slug": "community-collaboration-and-governance"},
            ],
        },
    ],
}


DEFAULT_TAG_TREE: list[TagTreeNode] = [
    *_leaves(
        "content_type",
        [
            ("论文", "paper"),
            ("实验数据", "experiment-data"),
            ("会议记录", "meeting-record"),
            ("周报", "weekly-report"),
            ("实验记录", "experiment-record"),
            ("阅读笔记", "reading-note"),
            ("项目资料", "project-document"),
            ("课程材料", "course-material"),
            ("其他", "other"),
        ],
    ),
    *_leaves(
        "academic_domain",
        [
            ("网络空间安全", "cyberspace-security"),
            ("人工智能安全", "ai-security"),
            ("数据安全与隐私保护", "data-security-and-privacy-protection"),
            ("软件与系统安全", "software-and-system-security"),
            ("密码学与密码应用", "cryptography-and-applications"),
            ("网络与通信安全", "network-and-communication-security"),
            ("威胁检测与响应", "threat-detection-and-response"),
            ("信息内容安全与网络治理", "information-content-security-and-cyber-governance"),
        ],
    ),
    _topic(CYBERSECURITY_TOPIC),
    _topic(AI_SECURITY_TOPIC, 1),
    *_leaves(
        "data_origin",
        [
            ("个人数据", "personal-data"),
            ("公共数据", "public-data"),
            ("课题组内部数据", "research-group-internal-data"),
            ("合作单位数据", "partner-organization-data"),
            ("合成数据", "synthetic-data"),
        ],
    ),
    *_leaves(
        "data_modality",
        [
            ("文本数据", "text-data"),
            ("图像数据", "image-data"),
            ("音频数据", "audio-data"),
            ("视频数据", "video-data"),
            ("多模态数据", "multimodal-data"),
            ("网络流量", "network-traffic"),
            ("系统日志", "system-log"),
            ("恶意样本", "malware-sample"),
            ("漏洞数据", "vulnerability-data"),
            ("代码数据", "code-data"),
            ("Prompt数据", "prompt-data"),
            ("模型权重", "model-weights"),
        ],
    ),
    *_leaves(
        "dataset_type",
        [
            ("原始数据", "raw-data"),
            ("清洗数据", "cleaned-data"),
            ("标注数据", "labeled-data"),
            ("特征数据", "feature-data"),
            ("训练集", "training-set"),
            ("验证集", "validation-set"),
            ("测试集", "test-set"),
            ("公开数据集", "public-dataset"),
            ("私有数据集", "private-dataset"),
            ("基准数据集", "benchmark-dataset"),
        ],
    ),
    *_leaves(
        "meeting_type",
        [
            ("日常会议", "daily-meeting"),
            ("重要会议", "important-meeting"),
            ("组会", "group-meeting"),
            ("项目推进会", "project-progress-meeting"),
            ("课题讨论会", "research-topic-discussion"),
            ("需求评审会", "requirement-review-meeting"),
            ("成果汇报会", "achievement-report-meeting"),
            ("答辩评审会", "defense-review-meeting"),
            ("外部合作会议", "external-collaboration-meeting"),
        ],
    ),
    *_leaves(
        "report_type",
        [
            ("个人周报", "personal-weekly-report"),
            ("项目周报", "project-weekly-report"),
            ("实验周报", "experiment-weekly-report"),
            ("阅读周报", "reading-weekly-report"),
            ("进度同步", "progress-sync"),
            ("风险问题", "risk-issue"),
            ("下周计划", "next-week-plan"),
        ],
    ),
    *_leaves(
        "experiment_type",
        [
            ("模型训练", "model-training"),
            ("攻击实验", "attack-experiment"),
            ("防御实验", "defense-experiment"),
            ("评测实验", "evaluation-experiment"),
            ("消融实验", "ablation-experiment"),
            ("数据处理", "data-processing"),
            ("复现实验", "reproduction-experiment"),
            ("失败实验", "failed-experiment"),
        ],
    ),
    *_leaves(
        "project_type",
        [
            ("立项资料", "project-initiation-material"),
            ("需求文档", "requirement-document"),
            ("技术方案", "technical-proposal"),
            ("系统设计", "system-design"),
            ("接口文档", "api-document"),
            ("部署文档", "deployment-document"),
            ("测试文档", "test-document"),
            ("验收材料", "acceptance-material"),
            ("汇报材料", "reporting-material"),
        ],
    ),
    *_leaves(
        "course_type",
        [
            ("课件", "courseware"),
            ("作业", "assignment"),
            ("实验指导", "experiment-guide"),
            ("试题", "exam-question"),
            ("参考资料", "reference-material"),
            ("课程项目", "course-project"),
        ],
    ),
]


def _tag_id(tag_group: str, path: str) -> str:
    return f"tag-{tag_group}-{path.replace('/', '-')}"


def flatten_tag_tree(
    nodes: list[TagTreeNode],
    *,
    level: int = 0,
    parent_id: str | None = None,
    parent_path: str = "",
) -> list[FlatTagSeed]:
    """Flatten tree-shaped tag data into stable rows for SQLite insertion."""
    flat_tags: list[FlatTagSeed] = []
    for index, node in enumerate(nodes):
        path = f"{parent_path}/{node['slug']}" if parent_path else node["slug"]
        tag_id = _tag_id(node["tag_group"], path)
        flat_tags.append(
            {
                "id": tag_id,
                "name": node["name"],
                "slug": node["slug"],
                "tag_group": node["tag_group"],
                "parent_id": parent_id,
                "level": level,
                "path": f"{node['tag_group']}/{path}",
                "description": node["description"],
                "synonyms": node["synonyms"],
                "sort_order": node["sort_order"] if node["sort_order"] else index,
                "is_system": node["is_system"],
                "is_selectable": node["is_selectable"],
                "is_active": True,
            }
        )
        flat_tags.extend(
            flatten_tag_tree(
                node["children"],
                level=level + 1,
                parent_id=tag_id,
                parent_path=path,
            )
        )
    return flat_tags


def seed_default_tags(conn: sqlite3.Connection) -> int:
    """Insert default tags idempotently and return the number of inserted rows."""
    rows = flatten_tag_tree(DEFAULT_TAG_TREE)
    existing_rows = conn.execute("SELECT id FROM tags").fetchall()
    existing_ids = {row[0] for row in existing_rows}
    id_remap: dict[str, str] = {}
    now = datetime.now(UTC).isoformat()
    inserted_count = 0

    for row in rows:
        existing_id = row["id"] if row["id"] in existing_ids else None
        parent_id = id_remap.get(row["parent_id"] or "", row["parent_id"])
        if existing_id:
            conn.execute(
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

        conn.execute(
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
    placeholders = ",".join("?" for _ in active_seed_ids)
    conn.execute(
        f"""
        UPDATE tags
        SET is_active = 0, is_selectable = 0, updated_at = ?
        WHERE tag_group = 'research_topic'
          AND path LIKE 'research_topic/ai-security/%'
          AND id NOT IN ({placeholders})
        """,
        [now, *active_seed_ids],
    )
    conn.commit()
    return inserted_count
