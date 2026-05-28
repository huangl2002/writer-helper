# AI Writer Helper — 开发过程记录

## 项目概述

面向网络小说作者的 Windows 桌面写作助手，基于 Tauri 2 + React 18 + Tiptap + SQLite，提供从章节管理、角色大纲、码字统计到 AI 辅助写作的全流程工具。

**开发日期**: 2026-05-24 ~ 2026-05-28  
**分支**: `main`  
**技术栈**: Rust (Tauri 2.x) + TypeScript (React 18) + SQLite

---

## 第一阶段：原型 MVP（05-24 ~ 05-25）

### 环境搭建
- 安装 Rust 工具链（rustup, cargo）
- 安装 pnpm 包管理器
- 配置 Windows GNU 工具链

### 项目脚手架
- `pnpm create tauri-app` 创建 Tauri 2 + React + TypeScript 项目
- 配置 Vite、TailwindCSS、PostCSS
- 创建基础目录结构

### SQLite 数据库
- 创建 `src-tauri/src/db.rs` — 连接池管理（`Mutex<Connection>`）
- 创建 `001_init.sql` 迁移：works, volumes, chapters, writing_sessions, settings
- 创建 Rust CRUD 命令：works.rs, volumes.rs, chapters.rs, stats.rs
- 前端 `db.ts` 封装所有 `invoke` 调用

### 前端基础
- TypeScript 类型定义（Work, Volume, Chapter, TodayStats, Theme）
- Zustand 全局状态管理
- 三套主题 CSS 变量（浅色/暗色/护眼）
- 工具函数（字数统计、时间格式化、Tiptap JSON 纯文本提取）

### 核心布局
- 三面板布局：左侧栏 + 编辑器 + 辅助面板
- Tiptap 富文本编辑器（加粗/斜体/H1-H3/分隔线）
- 章节树：作品 → 卷 → 章节
- 30 秒自动保存 + Ctrl+S 保存
- 写作统计（今日码字、写作时段）

### 遇到的问题
- **Tiptap Schema 错误**: `StarterKit.configure({ document: false })` 导致 "Schema is missing its top node type ('doc')" 错误。修复：移除 `document: false` 配置。
- **Cargo.toml crate-type**: 初始设置 `["rlib"]` 正确，尝试改为 `["staticlib", "cdylib", "rlib"]` 导致 Windows GNU 链接错误。保持 `["rlib"]`。

---

## 第二阶段：章节管理增强（05-28）

### 拖拽排序
- 安装 `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- 实现全文排序：卷排序、卷内章节排序、孤儿章节排序
- 支持拖拽章节到卷内（改变 volume_id）或拖出卷外
- 新增 Rust 命令：`move_chapter`, `update_chapter_status`

### 右键菜单
- 创建通用 `ContextMenu` 组件（定位、自动关闭、视口适配）
- 章节右键：重命名、状态变更（草稿/写作中/已完成）、移动到卷、删除
- 卷右键：重命名、删除
- 作品右键：重命名、删除

### 左侧栏重构
- 用户反馈：下拉选择器 + 独立章节树不够直观
- 重写为统一的 `WorkTree` 组件：所有作品显示在树中，点击展开卷和章节
- 搜索框过滤所有作品/卷/章节
- 移除 `@dnd-kit` 拖拽功能（简化交互，避免嵌套 SortableContext 的 bug）

### 遇到的问题
- **dnd-kit 嵌套 SortableContext**: 卷内章节的 SortableContext 嵌套在顶层 SortableContext 中时，拖拽行为异常
- **`matches!` 宏冲突**: Rust 中 `matches` 既是宏也是合法变量名，导致编译错误。解决：重命名变量为 `markers` / `headings`

---

## 第三阶段：功能模块开发（05-28）

### 角色系统
- 迁移 `002_characters.sql`：characters, character_relations
- Rust 命令：CRUD + 关系管理（create_relation, list_relations, delete_relation）
- 前端组件：CharacterList（列表+表单）、CharacterCard（卡片展示+内联关系添加）、CharacterForm（完整编辑表单）
- 支持字段：姓名、性别、别名、外貌、性格、背景、自定义属性
- 关系类型：朋友、敌人、恋人、师徒、家人、其他

### 大纲系统
- 迁移 `003_outlines.sql`：outlines（parent_id 自引用实现树形）
- Rust 命令：CRUD + move_outline（移动节点）+ reorder_outlines
- 前端：OutlineTree（递归渲染树形节点）
- 节点类型：卷、章、情节、场景
- 支持：完成标记、关联章节、展开/折叠、内联编辑

### 灵感笔记
- 迁移 `004_notes.sql`：notes（标签/颜色/置顶）
- Rust 命令：CRUD + search_notes（全文搜索）
- 前端：NotesList（便签墙/列表双视图）
- 支持：颜色标记、标签分类、置顶、搜索
- **Rust 生命周期问题**：`list_notes` 中 if/else 分支导致 `stmt` 生命周期不匹配。解决：用闭包封装查询逻辑

### 码字统计增强
- Rust 命令：`get_week_stats`, `get_month_stats`, `get_all_time_stats`
- 前端：StatsPanel（热力图 + 柱状图）
- **chrono Datelike 问题**：`Datelike` trait 需显式导入，`year()` / `month()` 方法来自该 trait

### 写作目标与番茄钟
- 迁移 `005_goals.sql`：goals（日字数目标）
- Rust 命令：CRUD + 自动停用旧目标
- 前端：GoalsPomodoro（目标设置 + 进度条 + 番茄钟）
- 番茄钟：25分钟专注 + 5分钟休息，前端定时器

---

## 第四阶段：导入导出（05-28）

### 数据导出
- Rust `export.rs`：Tiptap JSON → 纯文本 / Markdown 转换
- 递归遍历 Tiptap doc 结构：heading → `#`, paragraph → 纯文本, bold → `**`, italic → `*`, code → `` ` ``, horizontalRule → `---`, bulletList → `-`, orderedList → `1.`
- 命令：`export_chapter_txt/md`, `export_work_txt/md`, `export_outlines_md`, `export_characters_json`
- 前端：Tauri dialog 文件保存对话框（`@tauri-apps/plugin-dialog`）
- **Rust 问题**：`String::insert(0, c)` 需要 `char` 而非 `&str`。`insert_str(0, s)` 才接受 `&str`

### 数据导入
- Rust `import.rs`：TXT/Markdown 解析 + 章节创建
- TXT 解析：识别 `第X章`、`第X卷`、`Chapter X` 等章节标记
- Markdown 解析：按 `#` / `##` 标题拆分
- 文件夹批量导入：每个 .txt/.md 文件创建一个章节
- 命令：`preview_import_txt`, `import_txt`, `import_md`, `import_folder`
- 前端：Tauri dialog 文件/文件夹选择对话框
- 权限配置：`capabilities/default.json` 添加 `dialog:default`, `dialog:allow-save`, `dialog:allow-open`

### 遇到的问题
- **regex_lite 不存在**：`regex_lite` crate 不存在。解决：用手动字符串解析替代正则表达式
- **`matches` 宏冲突**：同上，重命名变量

---

## 第五阶段：主页设计（05-28）

### 首页仪表盘
- `HomePage` 组件：卡片式布局，今日码字/当前作品/累计字数快览
- 功能卡片（码字台/统计/角色/大纲/笔记/目标/历史/AI助手/AI配置/导入导出）
- 点击卡片进入对应功能页，每页有 `← 首页` 返回按钮
- 用户反馈：不要顶部导航栏，改为独立首页

### 布局增强
- 安装 `react-resizable-panels`
- 码字台三面板支持拖拽调整大小（侧栏 15%-35%，辅栏 15%-40%）
- 面板间 Separator 拖拽手柄，hover 高亮
- **API 变化**：v4.x 组件名为 `Group`/`Panel`/`Separator`，非 `PanelGroup`/`PanelResizeHandle`

### 历史版本
- 迁移 `006_snapshots.sql`：chapter_snapshots
- Rust 命令：手动/自动快照、恢复、删除
- 自动快照：每次 `update_chapter` 后调用 `auto_snapshot_if_needed`，每 25 次保存触发
- 前端：SnapshotPanel，快照列表 + 恢复按钮

---

## 第六阶段：AI 写作 Agent（05-28）

### AI 配置
- 迁移 `007_ai_config.sql`：ai_configs（API URL/Key/模型/温度/Tokens）
- Rust `crypto.rs`：XOR 混淆加密 API Key（V2 升级 AES-256-GCM）
- Rust `commands/ai.rs`：配置 CRUD + 默认配置管理
- 前端 `AiSettings`：服务商模板（OpenAI/DeepSeek/通义千问/Kimi/Ollama/自定义），表单编辑

### AI 对话
- 前端 `AiChat`：直接 HTTP 调用 AI API（Tauri webview 无 CORS 限制）
- 5 种 AI 能力：续写、润色、扩写、缩写、自由对话
- 每种能力预设 system prompt
- 消息历史上下文，多轮对话
- 一键复制 AI 生成内容

### 网络问题
- **Crates.io 不可达**：SSL revocation 检查失败，无法下载 `aes-gcm`/`reqwest`。改用前端 fetch 直连 API + XOR 加密方案。

---

## 第七阶段：打包发布（05-28）

### Release 构建
- `pnpm tauri build` 编译 Release 版本
- 前端打包 560KB JS + 35KB CSS
- Rust Release 编译 2分22秒
- **WiX 下载超时**：GitHub 不可达，MSI 打包失败
- **NSIS 下载超时**：同样网络问题
- 解决：直接使用 exe（26.8MB）+ WebView2Loader.dll（160KB）
- 输出目录：`release/`

### 存在的问题
- Tauri bundle targets 改为 "nsis"，仍需下载 NSIS 工具
- 网络正常时重新 `pnpm tauri build` 即可生成安装包
- `vite build` 警告：chunk 超过 500KB，可后续代码分割优化

---

## 关键决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 05-24 | Tauri 2.x 而非 Electron | 更轻量（打包 < 30MB），更低内存 |
| 05-25 | `crate-type = ["rlib"]` 而非 cdylib | Windows GNU 工具链不支持 cdylib |
| 05-28 | 移除 dnd-kit 嵌套拖拽 | 树形嵌套 SortableContext 有 bug |
| 05-28 | 前端直连 AI API 而非 Rust 代理 | crates.io 网络不可达 |
| 05-28 | XOR 加密代替 AES-256-GCM | `aes-gcm` crate 无法下载 |
| 05-28 | 直接发布 exe 而非安装包 | WiX/NSIS 下载超时 |

---

## 测试状态

- **编译**: TypeScript 0 错误, Rust 0 错误 (2 warning)
- **功能验证**: 各功能页面可通过首页导航进入
- **已知限制**: 
  - 导入导出需用户手动选择保存路径
  - AI 功能需用户自行配置 API endpoint + Key
  - 无自动测试覆盖
  - 未做跨平台测试（仅 Windows 11）

---

## 后续计划

### V1.1（短期）
- [ ] 编辑器 Markdown 快捷输入（`# ` → 标题, `**` → 加粗）
- [ ] 失焦自动保存
- [ ] 字符/字号/行距可调
- [ ] 修复 WiX/NSIS 下载生成安装包
- [ ] 代码分割优化（动态 import）

### V2（长期）
- [ ] AES-256-GCM API Key 加密
- [ ] 在线同步（账号系统 + 多设备）
- [ ] macOS / Linux 跨平台适配
- [ ] 自动测试 + CI/CD
