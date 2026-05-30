# AI Writer Helper — 需求分析与系统设计

## 1. 项目概述

### 1.1 项目定位

面向网络小说作者的桌面端写作助手，提供章节管理、角色/大纲维护、码字统计、AI 辅助写作、多风格主题定制等全流程写作工具。

### 1.2 目标用户

网络小说作者（长篇连载为主），需要：
- 高效的章节编辑和管理能力
- 角色、大纲等创作辅助工具
- 码字统计和写作目标追踪
- AI 辅助续写、润色、灵感激发
- 高度自由的界面和风格定制

### 1.3 平台形态

Windows 桌面应用，下载 exe 文件本地安装运行。

### 1.4 技术栈

| 层 | 技术选型 | 说明 |
|---|---|---|
| 桌面壳 | Tauri 2.x (Rust) | 轻量打包（10-20MB），低内存占用 |
| 前端框架 | React 18 + TypeScript | 组件化开发 |
| 富文本编辑器 | Tiptap (ProseMirror) | 插件化架构，可扩展 |
| 本地数据库 | SQLite (via Tauri plugin) | 所有创作数据本地存储 |
| 加密 | Rust crypto (AES-256-GCM) | API Key 安全存储 |
| 样式 | TailwindCSS + 自定义主题变量 | 支持多主题切换 |

### 1.5 下载安装

前往 [Releases](../../releases) 页面，下载最新版的 `AI Writer Helper_v*_x64-setup.exe`，双击运行即可安装。

> **系统要求：** Windows 10/11 64位
>
> 安装后应用会自动创建桌面快捷方式。所有写作数据存储在本地 `%APPDATA%/com.aiwriter.helper/` 目录下，无需联网即可使用。

---

## 2. 系统架构

### 2.1 整体架构图

```
┌──────────────────────────────────────────────────────────┐
│                      ai-writer-helper                     │
├──────────────────────────────────────────────────────────┤
│  桌面壳 (Tauri/Rust)                                      │
│    ├── SQLite 本地数据库                                   │
│    ├── 文件系统 (导入/导出/备份)                            │
│    ├── 安全存储 (API Key AES-256 加密保管)                  │
│    └── 数据同步层 (预留后端接口，首版不实现)                   │
│                                                           │
│  前端界面 (React + TypeScript)                              │
│    ├── 写作编辑器 (Tiptap 富文本)                            │
│    ├── 章节管理                                            │
│    ├── 角色系统                                            │
│    ├── 大纲系统                                            │
│    ├── 灵感笔记                                            │
│    ├── 码字统计                                            │
│    ├── 写作目标 / 番茄钟                                    │
│    ├── 主题 / 风格 / 布局定制                               │
│    ├── 历史版本 / 数据导出                                  │
│    ├── 导入模块                                            │
│    └── AI 写作 Agent                                       │
└──────────────────────────────────────────────────────────┘
```

### 2.2 设计原则

- **本地优先** — 所有核心功能离线可用，数据存在用户本机 SQLite
- **在线可切换** — 预留数据同步接口，未来支持在线模式切换
- **模块化** — 各功能模块独立开发，低耦合，通过事件总线通信
- **安全性** — API Key 本地加密存储，不上传任何第三方
- **数据所有权归用户** — 随时可导出全部数据为开放格式（Markdown/JSON）

### 2.3 数据存储模式

- **本地模式（首版默认）** — 数据存在本地 SQLite 文件，用户完全掌控
- **在线模式（未来扩展）** — 数据设计时预留 `owner_id`、`sync_status`、`last_synced_at` 字段，Schema 支持多用户隔离
- **模式切换** — 在设置中切换，切换时做本地↔云端数据合并

---

## 3. 数据模型

### 3.1 核心表结构

```sql
-- 作品
CREATE TABLE works (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    pen_name TEXT,
    genre_tags TEXT,          -- JSON array
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'local',  -- local | synced | conflict
    owner_id TEXT             -- 预留给在线模式
);

-- 卷
CREATE TABLE volumes (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id),
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- 章节
CREATE TABLE chapters (
    id TEXT PRIMARY KEY,
    volume_id TEXT REFERENCES volumes(id),
    work_id TEXT NOT NULL REFERENCES works(id),
    title TEXT NOT NULL,
    content_json TEXT,        -- Tiptap JSON 格式
    word_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',  -- draft | writing | completed | published
    sort_order INTEGER NOT NULL,
    source TEXT DEFAULT 'manual', -- manual | import
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 章节历史快照
CREATE TABLE chapter_snapshots (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES chapters(id),
    content_json TEXT NOT NULL,
    word_count INTEGER,
    saved_at TEXT NOT NULL
);

-- 角色
CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id),
    name TEXT NOT NULL,
    aliases TEXT,             -- JSON array
    gender TEXT,
    appearance TEXT,
    personality TEXT,
    background TEXT,
    custom_attrs TEXT,        -- JSON object, 用户自定义字段
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 角色关系
CREATE TABLE character_relations (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id),
    char_a_id TEXT NOT NULL REFERENCES characters(id),
    char_b_id TEXT NOT NULL REFERENCES characters(id),
    relation_type TEXT,       -- 朋友|敌人|恋人|师徒|其他
    description TEXT,
    created_at TEXT NOT NULL
);

-- 大纲
CREATE TABLE outlines (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id),
    parent_id TEXT REFERENCES outlines(id),
    title TEXT NOT NULL,
    content TEXT,
    node_type TEXT DEFAULT 'plot',  -- volume | chapter | plot | scene
    sort_order INTEGER NOT NULL,
    linked_chapter_id TEXT REFERENCES chapters(id),
    is_complete INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 灵感笔记
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    work_id TEXT REFERENCES works(id),
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT,                -- JSON array
    color TEXT DEFAULT '#ffd54f',
    is_pinned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 写作记录
CREATE TABLE writing_sessions (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id),
    chapter_id TEXT REFERENCES chapters(id),
    date TEXT NOT NULL,
    duration_seconds INTEGER,
    word_delta INTEGER,
    created_at TEXT NOT NULL
);

-- 写作目标
CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id),
    goal_type TEXT NOT NULL,  -- daily_words | chapter_count
    target_value INTEGER NOT NULL,
    deadline TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- AI 配置
CREATE TABLE ai_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,  -- AES-256-GCM 加密存储
    model_name TEXT NOT NULL,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- 用户设置
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL  -- JSON
);
```

### 3.2 预留在线模式字段说明

以下字段首版仅存储默认值，不启用同步逻辑：

| 表 | 字段 | 用途 |
|---|---|---|
| works | `sync_status` | 标记本地/已同步/冲突 |
| works | `owner_id` | 在线模式下关联用户 |
| chapters | `version` | 乐观锁版本号，冲突检测 |

---

## 4. 功能模块详细设计

### 4.1 写作编辑器

- 基于 Tiptap 的富文本编辑器，支持 Markdown 快捷输入（`# 标题`、`**加粗**` 等实时转换）
- **Word 风格分组工具栏**：编辑 / 格式 / 段落 / 列表 / 对齐 / 插入 六个功能区
  - 支持加粗、斜体、下划线、删除线、高亮标记
  - 文本对齐（左/中/右/两端对齐）
  - 一键清除格式
- **查找替换**：Ctrl+F 查找，Ctrl+H 替换，实时匹配计数，支持全部替换
- **纸张风格编辑区**：A4 尺寸白色卡片居中显示，模拟真实纸张写作体验
- 编辑器底部状态栏（Word 风格三段式布局）：
  - 左侧：章节位置（第 X/总数 章）+ 本章字数
  - 中间：每日目标达成状态
  - 右侧：今日字数 + 码字计时 + 保存状态 + 实时时钟
- 自动保存（30秒 + Ctrl+S + 失焦 + 切换章节时触发）
- 专注模式：隐藏所有侧边栏，仅保留编辑区

### 4.2 章节管理

- 树形列表：作品 → 卷 → 章节，支持拖拽排序
- 章节状态标签：草稿 / 写作中 / 已完成 / 已发布
- 右键菜单：新建、重命名、移动、删除、导出单章、查看历史版本
- 批量操作：多选后批量导出、批量改状态
- 章节搜索：按标题模糊搜索

### 4.3 角色系统

- 角色卡片：基本信息 + 自定义属性字段（作者可自由添加字段）
- 角色关系图谱：以力导向图展示角色间关系
- 角色出场追踪：关联章节列表，显示该角色在哪些章节出现
- 快速参考面板：写作时侧边栏展示当前章节相关角色卡片

### 4.4 大纲系统

- 树形大纲编辑器：无限层级，支持拖拽调整结构
- 大纲节点类型：卷、章、情节、场景
- 大纲↔章节关联：大纲节点可链接到已写章节，显示完成状态
- 自动梳理（导入时触发）：导入大纲文件自动解析层级、匹配章节、标记待补全节点

### 4.5 灵感笔记

- 便签墙视图 + 列表视图可切换
- 支持标签分类、颜色标记、置顶
- 可关联到作品或章节
- 全文搜索

### 4.6 码字统计

- 今日/本周/本月/总计字数看板
- 每日写作时长统计
- 写作日历热力图（类似 GitHub 贡献图）
- 按作品/卷/章节的字数分布饼图
- 写作趋势折线图（近30天字数变化）

### 4.7 写作目标与番茄钟

- 日字数目标设置
- 番茄钟计时器（25分钟专注 + 5分钟休息，周期可自定义）
- 目标完成进度条（实时更新）
- 达成目标时桌面通知

### 4.8 主题与风格定制

- 预设主题：浅色 / 暗色 / 护眼（米黄）/ 自定义
- 编辑器字体、字号、行间距、段落间距可调
- 编辑器宽度可调（窄栏 / 宽栏 / 全屏）
- 侧边栏位置可选（左/右/隐藏）
- 所有设置实时预览

### 4.9 布局定制

- 编辑器采用 Word 式纸张风格：A4 尺寸白色卡片 + 阴影，两侧主题色背景
- 默认布局：左侧侧边栏 + 中间编辑器 + 右侧辅助面板
- 专注布局：仅编辑器，自动居中纸张
- 面板支持拖拽调整大小，侧栏/辅栏可独立展开收起

### 4.10 历史版本

- 自动快照：每50次自动保存生成一个快照
- 手动快照：作者可随时手动保存当前版本
- 版本对比：选中两个版本，高亮显示正文差异
- 版本恢复：选择历史版本恢复替换当前内容

### 4.11 数据导出

- 单章导出：TXT / Markdown / DOCX
- 全书导出：按卷→章顺序合并为一个文件
- 大纲导出：Markdown / OPML
- 角色导出：JSON / Markdown 表格
- 全库备份：打包所有数据为 ZIP（含数据库 + 导出文件）

### 4.12 导入模块

**支持的格式：**

| 格式 | 说明 |
|------|------|
| TXT/Markdown | 按分隔符（如 `### 第X章`）自动拆分章节 |
| DOCX | 保留加粗/斜体等基础格式转换为 Tiptap JSON |
| 文件夹批量导入 | 整个文件夹拖入，每个文件作为一个章节 |
| 大纲文件 (Markdown/OPML) | 层级/缩进自动解析为大纲树 |

**大纲自动梳理逻辑：**

1. 层级解析 — 根据标题层级（`#` `##` `###`）或缩进自动构建大纲树
2. 章节匹配 — 导入章节文件时，将大纲节点与章节标题做模糊匹配关联
3. 节点补全建议 — 检测大纲中引用但还不存在的章节/情节节点，标记为「待补全」
4. 重复检测 — 对比已有章节标题，提示重复项，让作者决定覆盖或跳过

### 4.13 AI 写作 Agent

**配置层：**
- 用户自行填写 API 地址（兼容 OpenAI 接口规范）、API Key、模型名
- 支持多组 AI 配置（可切换不同服务商或模型）
- API Key 经 AES-256-GCM 加密后存入本地 SQLite，解密仅在内存中进行
- 预置常见服务商模板：OpenAI / 通义千问 / DeepSeek / Kimi / Ollama 本地模型

**能力列表（原子化，可独立调用）：**

| 能力 | 说明 | 触发方式 |
|------|------|----------|
| 续写 | 选中上文，AI 续写下一段 | 编辑器内快捷键 / AI 面板 |
| 润色 | 选中文字，AI 优化表达 | 选中后右键 / AI 面板 |
| 扩写 | 选中段落，AI 扩展细节 | AI 面板 |
| 缩写 | 选中段落，AI 精简 | AI 面板 |
| 大纲建议 | 根据当前内容，建议后续情节走向 | 大纲页面 AI 按钮 |
| 角色灵感 | 根据已有角色信息生成补充设定 | 角色页面 AI 按钮 |
| 对话生成 | 给定角色和场景，生成对话片段 | AI 面板 |
| 自由对话 | 开放式聊天，讨论剧情走向 | 侧边栏 AI 聊天窗口 |

**交互设计：**
- 编辑器内嵌 AI 面板（可唤出/收起），不打断写作流程
- AI 生成的内容以差异对比形式展示，作者选择「采纳」「修改」「丢弃」
- 快捷键呼出常用 AI 能力（如 `Ctrl+J` 续写）
- AI 聊天窗口作为独立侧边栏面板，可随时讨论剧情

---

## 5. 非功能需求

### 5.1 性能

- 编辑器输入延迟 < 50ms
- 应用冷启动时间 < 3 秒
- 章节（10万字）打开/保存 < 500ms
- 全文搜索（50万字总量）< 1 秒

### 5.2 安全

- API Key 使用 AES-256-GCM 加密存储，应用启动时需输入主密码解锁（可选功能）
- 所有数据默认存储在用户本地文件系统，不上传任何第三方
- AI 请求仅发送用户选中的文本片段和必要上下文，不泄露完整稿件

### 5.3 可靠性

- 自动保存机制：每30秒 + 失焦时 + 切换章节时触发
- 数据库定期自动备份（每天首次启动时备份到 `backups/` 目录）
- 崩溃恢复：启动时检测上次未正常关闭的编辑状态，恢复草稿

### 5.4 兼容性

- 目标平台：Windows 10/11（首版）
- macOS 兼容作为后续考虑（Tauri 天然支持跨平台）

---

## 6. 版本划分

---

## 6.1 V1 — 本地模式（首版）

### 6.1.1 包含功能

| 模块 | 详情 | 状态 |
|------|------|------|
| 写作编辑器 | Tiptap 富文本，分组工具栏，查找替换，纸张风格，选区AI浮动工具栏，**打字机滚动**，崩溃恢复，30秒自动保存，专注模式 | ✅ |
| 章节管理 | 作品→卷→章节树形结构，上移/下移排序，右键菜单（重命名/状态变更/移动/删除），搜索过滤，自定义弹窗交互 | ✅ |
| 角色系统 | 角色卡片（姓名/性别/别名/外貌/性格/背景），**头像上传**，角色关系管理 | ✅ |
| 大纲系统 | 无限层级大纲树，节点类型（卷/章/情节/场景），上移/下移排序，完成标记，关联章节 | ✅ |
| 灵感笔记 | 便签墙/列表双视图，颜色标记，标签分类，置顶，全文搜索 | ✅ |
| 码字统计 | 今日/近7天/本月/总计看板，**30天趋势柱状图**，**作品维度筛选**，年度热力图 | ✅ |
| 写作目标+番茄钟 | 每日字数目标+进度条，25分钟专注+5分钟休息番茄钟，桌面通知，专注结束自动休息 | ✅ |
| 主题定制 | 浅色/暗色/护眼（米黄）三套主题，CSS 变量驱动，一键切换 | ✅ |
| 布局定制 | 三面板可拖拽调整大小（react-resizable-panels），专注模式 | ✅ |
| 历史版本 | 每25次自动保存生成快照，手动快照，版本对比（LCS差分高亮），恢复历史版本，每章最多50个 | ✅ |
| 数据导出 | 单章/全书 TXT/Markdown，大纲 Markdown，角色 JSON，Tiptap→MD 转换 | ✅ |
| 数据导入 | TXT（按章节标记自动拆分），Markdown（按标题层级拆分），文件夹批量导入 | ✅ |
| AI 写作 Agent | 多模型配置（OpenAI/DeepSeek/通义千问/Kimi/Ollama），SSE流式输出，编辑器选区浮动工具栏，**连接测试**，**对话持久化**，API Key XOR 加密 | ✅ |
| 首页导航 | 仪表盘式首页，今日码字/当前作品/累计字数快览，功能卡片入口，←返回按钮 | ✅ |

### 6.1.2 实际项目结构

```
ai-writer-helper/
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 插件注册 + 命令注册
│   │   ├── db.rs                 # SQLite 连接池 + 迁移执行
│   │   ├── crypto.rs             # API Key XOR 加密
│   │   ├── stats.rs              # 写作统计命令
│   │   ├── export.rs             # 数据导出命令（Tiptap→TXT/MD）
│   │   ├── import.rs             # 数据导入命令（TXT/MD 解析）
│   │   └── commands/
│   │       ├── mod.rs
│   │       ├── works.rs          # 作品 CRUD
│   │       ├── volumes.rs        # 卷 CRUD
│   │       ├── chapters.rs       # 章节 CRUD + 移动 + 状态变更
│   │       ├── characters.rs     # 角色 CRUD + 关系管理
│   │       ├── outlines.rs       # 大纲 CRUD + 移动 + 排序
│   │       ├── notes.rs          # 笔记 CRUD + 搜索
│   │       ├── goals.rs          # 目标 CRUD
│   │       ├── snapshots.rs      # 历史快照 + 自动快照
│   │       └── ai.rs             # AI 配置 CRUD
│   ├── migrations/
│   │   ├── 001_init.sql          # works, volumes, chapters, writing_sessions, settings
│   │   ├── 002_characters.sql    # characters, character_relations
│   │   ├── 003_outlines.sql      # outlines
│   │   ├── 004_notes.sql         # notes
│   │   ├── 005_goals.sql         # goals
│   │   ├── 006_snapshots.sql     # chapter_snapshots
│   │   └── 007_ai_config.sql     # ai_configs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/default.json
├── src/                          # React 前端
│   ├── components/
│   │   ├── layout/               # MainLayout, HomePage, Sidebar, HelperPanel
│   │   ├── editor/               # WritingEditor, EditorToolbar, FindReplaceBar, SelectionToolbar, StatusBar
│   │   ├── works/                # WorkTree（统一作品+卷+章节树）
│   │   ├── chapters/             # ChapterActions
│   │   ├── characters/           # CharacterList, CharacterCard, CharacterForm
│   │   ├── outline/              # OutlineTree
│   │   ├── notes/                # NotesList
│   │   ├── stats/                # StatsPanel（热力图+柱状图）
│   │   ├── goals/                # GoalsPomodoro（目标+番茄钟）
│   │   ├── import/               # ImportExport
│   │   ├── snapshots/            # SnapshotPanel
│   │   ├── ai/                   # AiChat, AiSettings
│   │   ├── theme/                # ThemeToggle
│   │   └── common/               # ContextMenu
│   ├── stores/appStore.ts        # Zustand 全局状态
│   ├── types/index.ts            # TypeScript 类型定义
│   ├── lib/
│   │   ├── db.ts                 # Tauri invoke 包装层
│   │   └── utils.ts              # 字数统计/时间格式化/纯文本提取
│   ├── styles/themes.css         # 三套主题 CSS 变量
│   ├── App.tsx
│   └── main.tsx
├── release/                      # 发布文件
│   ├── ai-writer-helper.exe
│   └── WebView2Loader.dll
├── package.json
├── pnpm-lock.yaml
└── vite.config.ts
```

### 6.1.3 技术栈与依赖

**Rust 端**：
- `tauri` 2.x — 桌面框架
- `rusqlite` 0.31 (bundled) — SQLite
- `serde` / `serde_json` — 序列化
- `uuid` / `chrono` — ID 生成 / 时间处理
- `tauri-plugin-shell` / `tauri-plugin-sql` / `tauri-plugin-dialog` — Tauri 插件

**前端**：
- `react` 18 + `react-dom` — UI 框架
- `@tiptap/react` + `@tiptap/starter-kit` — 富文本编辑器
- `@tiptap/extension-underline` / `@tiptap/extension-text-align` / `@tiptap/extension-highlight` — 编辑器扩展
- `zustand` — 状态管理
- `tailwindcss` — 样式
- `@dnd-kit/core` + `@dnd-kit/sortable` — 拖拽排序
- `react-resizable-panels` — 可拖拽面板
- `@tauri-apps/api` / `@tauri-apps/plugin-dialog` — Tauri 前端 API

### 6.1.4 V1 数据流

```
┌──────────┐      Tauri Command       ┌──────────────┐
│  React   │ ◄──────────────────────► │  Rust Backend │
│  前端    │    (invoke/event)        │  (SQLite CRUD)│
└──────────┘                          └──────┬───────┘
                                              │
                                        ┌─────▼──────┐
                                        │   SQLite    │
                                        │  本地数据库  │
                                        └────────────┘
```

所有数据操作经 Tauri Command 桥接，Rust 端直接读写本地 SQLite。前端不直接访问文件系统。

---

## 6.2 V2 — 在线模式

### 6.2.1 V2 新增功能

- [ ] 用户账号系统（注册/登录/密码找回）
- [ ] 云端数据同步（手动/自动同步所有创作数据）
- [ ] 多设备支持（PC + 笔记本之间切换写作）
- [ ] 同步冲突解决（冲突检测 + 手动/自动合并策略）
- [ ] 在线备份管理（服务端多版本备份）
- [ ] macOS / Linux 正式支持
- [ ] 写作社区（可选：分享章节片段、写作数据匿名排行）

### 6.2.2 V2 数据流

```
┌──────────┐   Tauri Command    ┌──────────────┐    HTTP/WebSocket    ┌──────────────┐
│  React   │ ◄────────────────► │  Rust Backend │ ◄──────────────────► │  后端服务     │
│  前端    │   (invoke/event)   │  (同步引擎)    │    REST API + WSS    │  (Go/Node)   │
└──────────┘                    └──────┬───────┘                      └──────┬───────┘
                                       │                                     │
                                 ┌─────▼──────┐                        ┌─────▼──────┐
                                 │   SQLite    │                        │ PostgreSQL  │
                                 │  本地数据库  │                        │  云端数据库  │
                                 └────────────┘                        └────────────┘
```

V2 在 V1 基础上新增同步引擎（Rust 端），在本地 SQLite 之上增加一个网络层，与后端服务通信。前端无感知——同一套 Tauri Command，底层在本地模式和在线模式间切换。

---

## 7. V2 后端设计

### 7.1 后端技术选型

| 层 | 技术选型 | 说明 |
|---|---|---|
| 语言/框架 | Go (Gin/Echo) 或 Node.js (Fastify) | 高性能 REST API，Go 部署简单（单二进制） |
| 数据库 | PostgreSQL | 成熟的关系型数据库，支持 JSON 字段 |
| 缓存 | Redis | 会话管理 + 热点数据缓存 |
| 文件存储 | 本地磁盘或 S3 兼容存储（MinIO） | 备份文件、导出文件 |
| 消息队列 | NATS 或 Redis Streams | 同步任务异步处理 |
| API 协议 | REST + WebSocket | REST 用于 CRUD，WebSocket 用于实时同步推送 |

### 7.2 后端架构图

```
                    ┌──────────────────────────────────────┐
                    │             API Gateway               │
                    │        (Nginx / Caddy 反代)           │
                    └──────────────┬───────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐  ┌───────▼───────┐  ┌─────────▼────────┐
     │   用户服务        │  │   同步服务     │  │   文件服务        │
     │   (Auth/Profile) │  │   (Sync)      │  │   (File/Backup)  │
     │                  │  │               │  │                  │
     │  - 注册/登录      │  │  - 数据同步    │  │  - 备份上传       │
     │  - JWT 鉴权      │  │  - 冲突检测    │  │  - 导出文件存储    │
     │  - 用户设置同步   │  │  - 增量同步    │  │  - 附件管理       │
     └────────┬─────────┘  └──────┬────────┘  └────────┬─────────┘
              │                   │                     │
              └───────────────────┼─────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │   PostgreSQL     │
                         │   + Redis        │
                         └─────────────────┘
```

### 7.3 后端数据模型（新增/扩展表）

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 作品（云端版本，与客户端 works 表对应）
CREATE TABLE cloud_works (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    pen_name TEXT,
    genre_tags JSONB,
    description TEXT,
    cloud_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cloud_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE  -- 软删除
);

-- 同步日志（记录每次同步操作）
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    entity_type TEXT NOT NULL,  -- work | volume | chapter | character | outline | note
    entity_id UUID NOT NULL,
    client_version INTEGER NOT NULL,
    operation TEXT NOT NULL,    -- create | update | delete
    change_summary TEXT,        -- 变更摘要
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 云端备份
CREATE TABLE cloud_backups (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    work_id UUID REFERENCES cloud_works(id),
    file_path TEXT NOT NULL,    -- 备份文件存储路径
    size_bytes BIGINT,
    backup_type TEXT NOT NULL,  -- auto | manual
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.4 同步协议设计

**同步策略：增量同步 + 乐观锁**

每次同步以「作品」为单位，客户端发起同步请求时携带每个实体的 `(entity_id, version)` 对。服务端比对版本号，返回三类数据：

| 类型 | 说明 | 处理方式 |
|------|------|----------|
| `server_newer` | 服务端版本更新 | 客户端拉取新数据覆盖本地 |
| `client_newer` | 客户端版本更新 | 客户端数据上传到服务端 |
| `conflict` | 双端同时修改 | 进入冲突解决流程 |

**冲突解决策略（用户可选）：**
- 总是以本地为准
- 总是以云端为准
- 手动逐条选择

**同步触发时机：**
- 手动点击「同步」按钮
- 应用启动时自动同步（如开启自动同步选项）
- 应用关闭时自动同步
- 定时同步（每 N 分钟，仅在线模式下生效）

**离线编辑保障：**
- 离线时正常编辑，所有操作记录到本地 `pending_sync_ops` 表
- 恢复网络后按操作时间顺序逐条同步
- 同步完成前不丢数据——本地数据永远是完整副本

### 7.5 API 设计概要

```
# 认证
POST   /api/v2/auth/register        # 注册
POST   /api/v2/auth/login           # 登录
POST   /api/v2/auth/refresh         # 刷新 Token
POST   /api/v2/auth/logout          # 登出

# 同步
POST   /api/v2/sync/push            # 客户端推送变更
POST   /api/v2/sync/pull            # 客户端拉取变更
POST   /api/v2/sync/resolve         # 冲突解决结果上报

# 备份
POST   /api/v2/backup/upload        # 上传备份
GET    /api/v2/backup/list          # 备份列表
GET    /api/v2/backup/:id/download  # 下载备份
DELETE /api/v2/backup/:id           # 删除备份

# 用户
GET    /api/v2/user/profile         # 获取用户信息
PATCH  /api/v2/user/profile         # 更新用户信息
PATCH  /api/v2/user/password        # 修改密码
```

### 7.6 V1→V2 客户端变更点

| 模块 | V1 状态 | V2 变更 |
|------|---------|---------|
| 数据访问层 | Tauri Command → SQLite | 增加同步引擎中间层，拦截写操作并记录变更日志 |
| 启动流程 | 直接加载本地数据 | 可选登录 → 拉取云端数据 → 合并 → 进入主界面 |
| 设置页面 | 仅本地设置 | 新增「在线账号」选项卡：登录状态、同步设置、冲突策略 |
| 状态栏 | 仅字数 | 新增同步状态图标（已同步/同步中/待同步/冲突） |
| 数据表 | 现有表 | 新增 `pending_sync_ops`（待同步操作队列）、`sync_state`（同步状态追踪） |

### 7.7 V2 安全性补充

- 用户密码 bcrypt 哈希存储，不可逆
- JWT Token + Refresh Token 双令牌机制，Access Token 短期有效（15分钟）
- API 全链路 HTTPS
- 同步数据传输使用 TLS 加密
- 云端不存储用户 API Key（AI 配置的 Key 仅存本地，不同步到云端）
- 云端备份文件 AES 加密后存储，解密密钥仅用户持有

---

## 8. V1 项目结构规划

```
ai-writer-helper/
├── src-tauri/               # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs            # SQLite 操作
│   │   ├── crypto.rs        # 加密工具
│   │   ├── file_ops.rs      # 文件导入导出
│   │   └── commands/        # Tauri 命令
│   │       ├── mod.rs
│   │       ├── chapters.rs
│   │       ├── outlines.rs
│   │       ├── characters.rs
│   │       ├── notes.rs
│   │       ├── stats.rs
│   │       └── ai_config.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                     # React 前端
│   ├── components/
│   │   ├── editor/          # Tiptap 编辑器及扩展
│   │   ├── chapter-manager/ # 章节列表/树
│   │   ├── characters/      # 角色卡片/关系图
│   │   ├── outline/         # 大纲树编辑器
│   │   ├── notes/           # 灵感笔记
│   │   ├── stats/           # 统计图表
│   │   ├── goals/           # 目标/番茄钟
│   │   ├── ai/              # AI 面板/聊天
│   │   ├── layout/          # 布局框架
│   │   └── settings/        # 设置面板
│   ├── hooks/               # 自定义 hooks
│   ├── stores/              # 状态管理
│   ├── types/               # TypeScript 类型定义
│   ├── lib/                 # 工具函数
│   │   ├── db.ts            # 前端数据库调用封装
│   │   ├── ai.ts            # AI API 调用封装
│   │   └── import.ts        # 导入解析逻辑
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-24-ai-writer-helper-design.md
```

## 9. V2 完整项目结构规划

```
ai-writer-helper/
├── client/                    # 桌面客户端 (同 V1)
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── sync/          # V2 新增：同步引擎
│   │   │   │   ├── mod.rs
│   │   │   │   ├── engine.rs  # 同步调度
│   │   │   │   ├── push.rs    # 推送到服务端
│   │   │   │   ├── pull.rs    # 从服务端拉取
│   │   │   │   └── conflict.rs # 冲突解决
│   │   │   └── ...
│   │   └── ...
│   └── src/                   # React 前端
│       ├── components/
│       │   ├── sync/          # V2 新增：同步状态 UI
│       │   └── ...
│       └── ...
│
├── server/                    # V2 后端起
│   ├── cmd/
│   │   └── server/
│   │       └── main.go        # 入口
│   ├── internal/
│   │   ├── handler/           # HTTP 处理器
│   │   │   ├── auth.go
│   │   │   ├── sync.go
│   │   │   ├── backup.go
│   │   │   └── user.go
│   │   ├── service/           # 业务逻辑
│   │   │   ├── auth.go
│   │   │   ├── sync.go
│   │   │   └── backup.go
│   │   ├── repository/        # 数据库访问
│   │   │   ├── user.go
│   │   │   ├── work.go
│   │   │   └── sync_log.go
│   │   ├── model/             # 数据模型
│   │   ├── middleware/        # JWT 鉴权等
│   │   └── config/            # 配置管理
│   ├── migrations/            # SQL 迁移文件
│   ├── go.mod
│   └── Dockerfile
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-24-ai-writer-helper-design.md
└── docker-compose.yml         # V2 本地开发环境（PostgreSQL + Redis + Server）
```
