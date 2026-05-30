# 开发报告：Word 风格编辑器优化

## 日期：2026-05-30

## 概述

参照 Microsoft Word 和好好码字的 UI 设计理念，对「码字台」编辑器页面进行了全面优化升级。本次优化聚焦于工具栏重组、查找替换、纸张风格编辑区和状态栏增强。

---

## 改动详情

### 1. 工具栏重构 (`EditorToolbar.tsx`)

**改动类型：重写**

参照 Word 的 Ribbon 分组设计，将原来扁平排列的工具栏按钮重组为 6 个功能区：

| 分组 | 按钮 | 说明 |
|------|------|------|
| 编辑 | ↩ ↩ 🔍 | 撤销、重做、查找替换 |
| 格式 | **B** *I* <u>U</u> ~~S~~ 🖌 | 加粗、斜体、下划线、删除线、高亮 |
| 段落 | H1 H2 H3 | 一/二/三级标题 |
| 列表 | •≡ 1. ❝ | 无序列表、有序列表、引用 |
| 对齐 | ≡◁ ≡◇ ≡▷ ≡▯ | 左对齐、居中、右对齐、两端对齐 |
| 插入 | 🔗 ― | 链接、分隔线 |

每组有独立标签，组间以竖线分隔。右侧新增「清除格式」按钮。

**新增格式化能力：**
- 下划线 (Ctrl+U) — `@tiptap/extension-underline`
- 删除线 — StarterKit 内置，之前未暴露
- 高亮标记 — `@tiptap/extension-highlight`
- 文本对齐 — `@tiptap/extension-text-align`（左/中/右/两端）

**新增依赖：**
- `@tiptap/extension-underline@^2`
- `@tiptap/extension-text-align@^2`
- `@tiptap/extension-highlight@^2`

### 2. 查找替换栏 (`FindReplaceBar.tsx`)

**改动类型：新增文件**

实现了完整的查找替换功能：

- **Ctrl+F** 打开查找栏，已选文字自动填入搜索框
- **Enter** 跳转下一个匹配，**Shift+Enter** 跳转上一个
- 实时显示匹配计数（如 `3/15`）
- **Ctrl+H** / 点击「替换」按钮展开替换输入框
- 单个替换 + 全部替换
- **Esc** 关闭查找栏并聚焦回编辑器
- 搜索不区分大小写，基于编辑器纯文本内容

**实现细节：**
- 使用 ProseMirror 的 `textContent` 进行全文搜索
- 通过 `descendants` 遍历将文本偏移量转换为文档绝对位置
- 用 `setTextSelection` 导航匹配项
- 全部替换采用从后往前的顺序，避免位置偏移问题

### 3. 纸张风格编辑器 (`WritingEditor.tsx`)

**改动类型：修改**

编辑器区域新增 Word 式的「纸张」效果：

- A4 宽度 (`max-w-[210mm]`) 的白色卡片居中显示
- 卡片带阴影 (`shadow-lg`) 和微圆角 (`rounded-sm`)
- 卡片两侧留白，背景使用主题色 (`--color-editor-bg`)
- 纸张最小高度 `min-h-[297mm]`（A4 高度）

**新增键盘快捷键：**
- Ctrl+F — 打开查找栏
- Ctrl+H — 打开查找替换栏

### 4. 状态栏增强 (`StatusBar.tsx`)

**改动类型：修改**

参照 Word 状态栏的左-中-右三区布局：

| 区域 | 内容 |
|------|------|
| 左侧 | 章节位置 `第 3/15 章` + 本章字数 |
| 中间 | 每日目标状态（达标 / 距目标 X 字） |
| 右侧 | 今日字数 / 计时器 / 保存状态 / 时钟 |

新增 `chapterIndex` 和 `totalChapters` props，自动计算当前章节在作品中的位置。

### 5. 主题变量扩展 (`themes.css`)

**改动类型：修改**

三种主题均新增 `--color-editor-bg` 变量：

| 主题 | 值 | 效果 |
|------|-----|------|
| 浅色 | `#e7e5e4` | 浅灰背景，模拟纸张效果 |
| 暗色 | `#0c0a09` | 深黑背景，暗色纸张 |
| 护眼 | `#f5f0d0` | 柔黄背景，护眼纸张 |

### 6. EditorToolbar 接口变更

新增 `onFind` prop，用于从工具栏触发查找替换栏。

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `package.json` | 新增 3 个依赖 |
| `pnpm-lock.yaml` | 依赖锁定更新 |
| `src/components/editor/EditorToolbar.tsx` | 重写 |
| `src/components/editor/FindReplaceBar.tsx` | 新增 |
| `src/components/editor/WritingEditor.tsx` | 修改 |
| `src/components/editor/StatusBar.tsx` | 修改 |
| `src/styles/themes.css` | 新增变量 |

---

## 设计借鉴

本次优化参考了以下产品的设计：

1. **Microsoft Word** — 分组工具栏、纸张风格编辑区、查找替换交互、状态栏布局
2. **好好码字 (haohaomazi)** — 面向网文作者的极简写作体验理念

---

## 后续规划

- [ ] 打字音效（机械键盘音效增强沉浸感）
- [ ] 一键排版（首行缩进、段间距统一、标点规范化）
- [ ] 敏感词检测（自定义词库 + 实时高亮 + 一键替换）
- [ ] 拼字比赛（V2 在线功能，实时码字速度比拼）
- [ ] 随机取名（AI 生成人名/地名/功法名）
