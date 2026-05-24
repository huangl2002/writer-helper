# AI Writer Helper — 雏形 MVP 实现规约

## 范围

在完整设计文档 V1 基础上，首轮实现以下 7 个核心模块，构成可用的写作骨架。

## 1. 项目脚手架

- Tauri 2.x (Rust) + React 18 + TypeScript
- Vite 构建，TailwindCSS 样式
- 项目结构遵循设计文档第 8 节 V1 结构规划
- 包管理：pnpm（前端）+ Cargo（Rust）

## 2. 核心布局

- 三面板可拖拽布局：左侧边栏 | 中间编辑器 | 右侧辅助面板
- 面板支持折叠/展开
- 预设：默认布局 / 专注模式（仅编辑器）/ 大纲模式（大纲+编辑器）
- 使用 `react-resizable-panels` 或类似库

## 3. 写作编辑器

- Tiptap (ProseMirror) 富文本编辑器
- 基础格式化：加粗、斜体、H1-H3 标题、分隔线
- 工具栏浮动或固定在顶部
- 底部状态栏：当前章节字数 + 今日总字数 + 当前时间
- 30 秒无操作自动保存

## 4. 章节管理

- 左侧边栏展示作品树：作品 → 卷 → 章节
- 支持新建/重命名/删除（右键菜单或图标按钮）
- 支持拖拽排序
- 点击章节标题切换编辑内容

## 5. 本地存储

- SQLite 数据库（via `tauri-plugin-sql`）
- 首轮建表：`works`、`volumes`、`chapters`、`writing_sessions`、`settings`
- Rust 端通过 Tauri Command 暴露 CRUD 接口
- 前端通过 `invoke` 调用

## 6. 主题切换

- 三种预设主题：浅色（白底黑字）、暗色（深灰底浅灰字）、护眼（米黄底褐字）
- 使用 TailwindCSS CSS 变量 + data-theme 属性切换
- 主题选择持久化到 settings 表

## 7. 基础统计

- 编辑器底部状态栏实时更新：
  - 当前章节字数（从 Tiptap JSON 计算纯文本字数）
  - 今日总码字数（查询 writing_sessions）
- 切换章节时更新字数，自动保存时写入 writing_sessions

## 不做

- 角色系统、大纲、灵感笔记、AI Agent
- 导入/导出、历史版本、番茄钟
- 图表统计（热力图、趋势图等）
- 布局自由拖拽保存（仅预设布局）
