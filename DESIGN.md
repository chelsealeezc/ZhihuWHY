---
name: 知乎 · 回响
description: 把值得在意的一句话，继续读成一场讨论。
colors:
  primary: "#1772f6"
  primary-hover: "#0f62d8"
  deep-blue: "#0d4fb8"
  echo-ink: "#102f61"
  echo-gold: "#e7b85f"
  echo-teal: "#2dbbb3"
  glacier: "#e8f1ff"
  canvas: "#f4f7fb"
  dark-canvas: "#091426"
  dark-surface: "#101f37"
  dark-blue-surface: "#102946"
  text: "#121212"
  text-secondary: "#596273"
  text-muted: "#8590a6"
  border: "#e6eaf0"
  success: "#0f8a4b"
rounded:
  sm: "12px"
  md: "18px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
typography:
  display:
    fontFamily: "Noto Sans SC, PingFang SC, Hiragino Sans GB, sans-serif"
    fontSize: "clamp(36px, 5vw, 64px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Noto Sans SC, PingFang SC, Hiragino Sans GB, sans-serif"
    fontSize: "clamp(24px, 3vw, 34px)"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Noto Sans SC, PingFang SC, Hiragino Sans GB, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontFamily: "Noto Sans SC, PingFang SC, Hiragino Sans GB, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: 知乎 · 回响

## Overview

**Creative North Star: “深海里的回声档案馆”**

知乎 · 回响把知乎内容从单向阅读带到有方向的交流。整体基于知乎蓝建立可信、清醒的产品气质，再以深海蓝承载观点，以冰川蓝承载阅读，以少量暖金标记值得停留的判断。页面应该有品牌张力，但不靠堆叠装饰或解释性文案制造存在感。

阅读页是白色正文与深海蓝观点舱的双场景对照；讨论页以深海蓝主题卡作为入口，让真实观点流成为视觉主体。内容先于效果，互动状态必须清晰，所有装饰都服务于阅读、选择和回应。全站支持导航栏主题切换，深色主题使用深海蓝黑作为画布，保持知乎蓝、冰川蓝和回响金的语义不变。

**Key Characteristics:**
- 知乎蓝为行动色，深海蓝为品牌锚点。
- 冰川蓝制造轻盈的阅读层次，暖金只强调选择与分歧。
- 大留白、清晰信息层级、克制圆角，避免模板化卡片堆叠。
- 文案直接面向用户，不用“AI 正在理解你”式的自我解释。

## Colors

蓝色是可信度与连续阅读的主线；深色表面只用于重要场景，暖金和青绿色作为低频语义标记。

### Primary
- **知乎蓝** (#1772f6): 主要行动、链接、选中态和品牌识别。
- **深海蓝** (#0d4fb8): 观点舱、讨论主题卡和高密度品牌场景。

### Secondary
- **回响金** (#e7b85f): 选中观点、分歧提醒和少量关键标记，不作为大面积背景。
- **回响青** (#2dbbb3): 同观点、正向确认和讨论完成态。

### Neutral
- **画布灰蓝** (#f4f7fb): 页面背景，让白色正文浮起。
- **正文黑** (#121212): 文章与核心标题。
- **次级灰** (#596273): 解释性正文和辅助信息。
- **雾灰** (#8590a6): 时间、数量和非重点状态。
- **结构线** (#e6eaf0): 分隔与输入边界。

**The Signal Rule.** 每个视口只保留一个主视觉信号：要么是深海蓝表面，要么是暖金选择态；不要让所有元素同时高亮。

**The Contrast Rule.** 深色主题中的正文、按钮和状态文字必须使用高对比色；深色表面上不放低对比度的浅灰文字，主题切换后所有输入框、卡片和固定操作区都必须同步换肤。

## Typography

**Display Font:** Noto Sans SC (with PingFang SC, Hiragino Sans GB, sans-serif)
**Body Font:** Noto Sans SC (with PingFang SC, Hiragino Sans GB, sans-serif)

**Character:** 中文字形保持现代、清晰和高可读性，靠字号、字重与留白建立品牌感，而不是用夸张字体抢走内容注意力。

### Hierarchy
- **Display** (700, `clamp(36px, 5vw, 64px)`, `1.12`): 首页主张，承担第一印象。
- **Headline** (700, `clamp(24px, 3vw, 34px)`, `1.35`): 问题标题与页面主标题。
- **Title** (600–700, `15px–20px`, `1.4`): 观点卡、来源和导航标题。
- **Body** (400, `16px`, `1.95`, max `70ch`): 文章正文和长文本阅读。
- **Label** (600, `12px`, `1.4`): 状态、来源、数量和低干扰辅助信息。

## Layout

页面使用居中的内容画布与明确的双栏/三栏关系。阅读页以宽正文配右侧观点舱；讨论页以主题侧栏、观点流和来源侧栏形成稳定的三段节奏。桌面容器使用 `calc(100% - 40px)` 的安全边距，移动端收窄至 `calc(100% - 28px)`。

正文段落控制在 `70ch` 左右，标题留出更大的上方呼吸空间。阅读页右侧观点舱在桌面端吸顶，窄屏转为正文后的普通流；讨论页在中等宽度降为双栏，移动端变为单列。固定操作区只承载当前任务，不遮盖主要内容。

## Elevation & Depth

系统使用“白色内容面 + 蓝色色调层级 + 柔和环境阴影”的混合深度。普通卡片保持轻量，悬浮和当前任务才获得更明显的阴影；深海蓝表面使用低透明白色边界和内嵌光感，避免厚重描边。

### Shadow Vocabulary
- **Rest** (`0 1px 2px rgba(18, 31, 56, 0.04), 0 10px 30px rgba(18, 31, 56, 0.05)`): 普通内容容器。
- **Hover** (`0 2px 4px rgba(18, 31, 56, 0.06), 0 16px 36px rgba(23, 114, 246, 0.11)`): 可互动卡片被指向时。
- **Focus / Composer** (`0 12px 30px rgba(18, 31, 56, 0.11)`): 讨论输入与高优先级操作。

## Shapes

大容器使用 `18px` 圆角，内部控件使用 `12px`，小型操作使用胶囊形。嵌套表面遵循外圆角大于内圆角的同心关系。边框只表达结构、分隔和选中态，不用粗色边框替代层次。

## Components

### Buttons
- **Shape:** 胶囊形 (`999px`)，以 `scale(0.96)` 提供按下反馈。
- **Primary:** 知乎蓝背景、白字、`8px 16px` 内边距。
- **Hover / Focus:** 变为深一点的蓝色并获得柔和蓝色阴影；键盘焦点使用可见外环。
- **Secondary / Ghost:** 白底结构按钮或透明文字按钮，保持与主按钮的动作层级差。

### Cards / Containers
- **Corner Style:** 主卡片 `18px`，内容表面 `12px–16px`。
- **Background:** 正文使用白色；观点舱和主题卡使用深海蓝渐变；局部选择使用冰川蓝或暖金。
- **Shadow Strategy:** 默认轻阴影，互动时上浮；深色表面不使用硬边块状阴影。
- **Internal Padding:** 页面卡片 `24px–48px`，密集内容 `12px–20px`。

### Inputs / Fields
- **Style:** 淡蓝灰背景、结构线和 `11px–16px` 圆角。
- **Focus:** 白色表面、知乎蓝边界和低透明蓝色外环。
- **Error / Disabled:** 错误用低饱和暖色表面；禁用通过透明度和不可点击光标表达。

### Navigation
- **Style:** `64px` 吸顶导航，浅色主题使用白色表面，深色主题使用深色表面；品牌名使用双层中英文，主导航保持低对比度，当前动作和搜索焦点使用知乎蓝。主题按钮提供可见的明暗切换入口并记住用户选择。

### Reading / Discussion Signature
- **Reading:** 正文保持长阅读舒适度，点击带讨论关联的段落即可切换观点舱。
- **Discussion:** 主题卡负责定调，观点流负责参与，输入框始终像一个可以立刻加入的入口。

## Do's and Don'ts

- **Do** 让深海蓝承担少数关键场景，让白色正文成为阅读主场。
- **Do** 用暖金区分“值得注意的判断”和“不同观点”，不要用高饱和危险红制造对立。
- **Do** 为 hover、focus、loading、空状态和移动端保留清晰的静态反馈。
- **Don't** 使用紫色渐变、emoji 代替图标、夸张的 AI 自述或装饰性网格。
- **Don't** 把每一块内容都做成同样尺寸的圆角卡片，也不要把重点全部堆在页面顶部。
- **Don't** 用更多文案解释产品正在做什么；优先让内容结构和可操作状态自己说明。
