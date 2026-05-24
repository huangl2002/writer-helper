# Prototype MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working writing desktop app skeleton with Tauri 2 + React + Tiptap + SQLite — editor, chapter tree, theme switching, auto-save, word count.

**Architecture:** Tauri 2 Rust backend manages SQLite via custom commands exposed to the React frontend through `invoke()`. React handles all UI: 3-panel resizable layout, Tiptap editor, chapter tree. Zustand for client-side state. CSS variables for theming.

**Tech Stack:** Tauri 2.x, React 18, TypeScript 5, Vite 5, TailwindCSS 3, Tiptap 2, Zustand 4, SQLite (tauri-plugin-sql)

---

## File Map

```
ai-writer-helper/
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # Tauri app setup, plugin registration, command registration
│   │   ├── db.rs               # SQLite connection pool init, migration runner
│   │   ├── commands/
│   │   │   ├── mod.rs          # Re-export all command modules
│   │   │   ├── works.rs        # create_work, list_works, update_work, delete_work
│   │   │   ├── volumes.rs      # create_volume, list_volumes, update_volume, delete_volume, reorder_volumes
│   │   │   └── chapters.rs     # create_chapter, get_chapter, update_chapter, delete_chapter, list_chapters, reorder_chapters
│   │   └── stats.rs            # record_writing_session, get_today_word_count
│   ├── migrations/
│   │   └── 001_init.sql        # Initial schema: works, volumes, chapters, writing_sessions, settings
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
│       └── default.json
├── src/
│   ├── types/
│   │   └── index.ts            # Work, Volume, Chapter, WritingSession interfaces
│   ├── lib/
│   │   ├── db.ts               # Typed invoke wrappers for all Tauri commands
│   │   └── utils.ts            # countWords, formatTime, generateId
│   ├── stores/
│   │   └── appStore.ts         # Zustand store: works, volumes, chapters, active chapter, theme, word count
│   ├── hooks/
│   │   ├── useAutoSave.ts      # 30s debounced auto-save via Tauri command
│   │   └── useWordCount.ts     # Extract plain text word count from Tiptap JSON
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx   # 3-panel resizable layout shell
│   │   │   ├── Sidebar.tsx     # Left sidebar: work selector + chapter tree
│   │   │   └── HelperPanel.tsx # Right panel: placeholder for future modules
│   │   ├── chapters/
│   │   │   ├── ChapterTree.tsx # Tree: work -> volumes -> chapters, drag-and-drop sort
│   │   │   └── ChapterActions.tsx # Inline add/rename/delete buttons
│   │   ├── editor/
│   │   │   ├── WritingEditor.tsx # Tiptap editor with formatting extensions
│   │   │   ├── EditorToolbar.tsx # Bold, italic, heading, divider buttons
│   │   │   └── StatusBar.tsx    # Word count display + last saved indicator
│   │   ├── works/
│   │   │   └── WorkSelector.tsx # Dropdown to switch active work
│   │   └── theme/
│   │       └── ThemeToggle.tsx  # Light / Dark / Eye-care cycle button
│   ├── styles/
│   │   └── themes.css          # CSS custom properties for 3 themes via [data-theme]
│   ├── App.tsx                 # Root: theme provider + AppLayout
│   ├── main.tsx                # ReactDOM entry
│   └── vite-env.d.ts
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
└── postcss.config.js
```

---

### Task 1: Environment setup — Install Rust and pnpm

**Files:** None (system installs)

- [ ] **Step 1: Install Rust via winget**

```bash
winget install Rustlang.Rustup
```
Restart shell after install, or refresh PATH:
```bash
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

- [ ] **Step 2: Verify Rust installation**

```bash
rustc --version
cargo --version
```
Expected: both print version numbers (rustc >= 1.77 for Tauri 2).

- [ ] **Step 3: Install pnpm via npm**

```bash
npm install -g pnpm
pnpm --version
```
Expected: prints version number.

- [ ] **Step 4: Commit (bump docs if changed)**

No code changes to commit; environment setup only.

---

### Task 2: Scaffold Tauri 2 + React + Vite + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `tailwind.config.js`, `postcss.config.js`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, `src-tauri/capabilities/default.json`

- [ ] **Step 1: Create React + Vite frontend with package.json**

Create `package.json`:
```json
{
  "name": "ai-writer-helper",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "@tiptap/extension-placeholder": "^2",
    "@tiptap/extension-document": "^2",
    "@tiptap/extension-paragraph": "^2",
    "@tiptap/extension-text": "^2",
    "@tiptap/extension-bold": "^2",
    "@tiptap/extension-italic": "^2",
    "@tiptap/extension-heading": "^2",
    "@tiptap/extension-horizontal-rule": "^2",
    "@tiptap/pm": "^2",
    "@tiptap/react": "^2",
    "@tiptap/starter-kit": "^2",
    "react": "^18",
    "react-dom": "^18",
    "zustand": "^4"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5",
    "vite": "^5"
  }
}
```

- [ ] **Step 2: Create Vite config**

Create `vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: { target: "es2021" },
});
```

- [ ] **Step 3: Create TypeScript config**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create index.html**

Create `index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Writer Helper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create React entry files**

Create `src/main.tsx`:
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/themes.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:
```typescript
import { useAppStore } from "./stores/appStore";
import { AppLayout } from "./components/layout/AppLayout";

function App() {
  const theme = useAppStore((s) => s.theme);

  return (
    <div data-theme={theme} className="h-screen w-screen overflow-hidden">
      <AppLayout />
    </div>
  );
}

export default App;
```

Create `src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 6: Create TailwindCSS configs**

Create `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
      },
    },
  },
  plugins: [],
};
```

Create `postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create Tauri Rust backend**

Create `src-tauri/Cargo.toml`:
```toml
[package]
name = "ai-writer-helper"
version = "0.1.0"
edition = "2021"

[lib]
name = "ai_writer_helper_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1", features = ["v4"] }
chrono = "0.4"
```

Create `src-tauri/build.rs`:
```rust
fn main() {
    tauri_build::build()
}
```

Create `src-tauri/tauri.conf.json`:
```json
{
  "$schema": "https://raw.githubusercontent.com/nicknisi/tauri-config-schema/main/schema.json",
  "productName": "AI Writer Helper",
  "version": "0.1.0",
  "identifier": "com.aiwriter.helper",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [
      {
        "title": "AI Writer Helper",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

Create `src-tauri/capabilities/default.json`:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close"
  ]
}
```

Create `src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ai_writer_helper_lib::run()
}
```

Create `src-tauri/src/lib.rs`:
```rust
mod commands;
mod db;
mod stats;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let db_path = app
                .path()
                .app_local_data_dir()
                .expect("failed to get app data dir")
                .join("writer.db");
            std::fs::create_dir_all(db_path.parent().unwrap())?;
            let pool = db::init_db(&db_path)?;
            app_handle.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::works::create_work,
            commands::works::list_works,
            commands::works::update_work,
            commands::works::delete_work,
            commands::volumes::create_volume,
            commands::volumes::list_volumes,
            commands::volumes::update_volume,
            commands::volumes::delete_volume,
            commands::volumes::reorder_volumes,
            commands::chapters::create_chapter,
            commands::chapters::get_chapter,
            commands::chapters::update_chapter,
            commands::chapters::delete_chapter,
            commands::chapters::list_chapters,
            commands::chapters::reorder_chapters,
            stats::record_writing_session,
            stats::get_today_word_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 8: Install dependencies**

```bash
pnpm install
```

Expected: installs all npm packages.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri 2 + React + Vite + TypeScript project"
```

---

### Task 3: SQLite database and Rust backend commands

**Files:**
- Create: `src-tauri/migrations/001_init.sql`
- Create: `src-tauri/src/db.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/works.rs`
- Create: `src-tauri/src/commands/volumes.rs`
- Create: `src-tauri/src/commands/chapters.rs`
- Create: `src-tauri/src/stats.rs`

- [ ] **Step 1: Create SQL migration**

Create `src-tauri/migrations/001_init.sql`:
```sql
CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    pen_name TEXT DEFAULT '',
    genre_tags TEXT DEFAULT '[]',
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'local',
    owner_id TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS volumes (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    volume_id TEXT REFERENCES volumes(id) ON DELETE SET NULL,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_json TEXT DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
    word_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    sort_order INTEGER NOT NULL DEFAULT 0,
    source TEXT DEFAULT 'manual',
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS writing_sessions (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    word_delta INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '"light"');
```

- [ ] **Step 2: Create db.rs — SQLite connection pool**

Create `src-tauri/src/db.rs`:
```rust
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbPool {
    pub conn: Mutex<Connection>,
}

pub fn init_db(path: &PathBuf) -> Result<DbPool, Box<dyn std::error::Error>> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    let migration = include_str!("../migrations/001_init.sql");
    conn.execute_batch(migration)?;

    Ok(DbPool {
        conn: Mutex::new(conn),
    })
}
```

- [ ] **Step 3: Create commands/mod.rs**

Create `src-tauri/src/commands/mod.rs`:
```rust
pub mod chapters;
pub mod volumes;
pub mod works;
```

- [ ] **Step 4: Create commands/works.rs — Work CRUD**

Create `src-tauri/src/commands/works.rs`:
```rust
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Work {
    pub id: String,
    pub title: String,
    pub pen_name: String,
    pub genre_tags: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub owner_id: String,
}

#[tauri::command]
pub fn create_work(pool: State<'_, DbPool>, title: String) -> Result<Work, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO works (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, title, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Work {
        id,
        title,
        pen_name: String::new(),
        genre_tags: "[]".into(),
        description: String::new(),
        created_at: now.clone(),
        updated_at: now,
        sync_status: "local".into(),
        owner_id: String::new(),
    })
}

#[tauri::command]
pub fn list_works(pool: State<'_, DbPool>) -> Result<Vec<Work>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, pen_name, genre_tags, description, created_at, updated_at, sync_status, owner_id FROM works ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let works = stmt
        .query_map([], |row| {
            Ok(Work {
                id: row.get(0)?,
                title: row.get(1)?,
                pen_name: row.get(2)?,
                genre_tags: row.get(3)?,
                description: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                sync_status: row.get(7)?,
                owner_id: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(works)
}

#[tauri::command]
pub fn update_work(pool: State<'_, DbPool>, id: String, title: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE works SET title = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![title, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_work(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM works WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 5: Create commands/volumes.rs — Volume CRUD**

Create `src-tauri/src/commands/volumes.rs`:
```rust
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Volume {
    pub id: String,
    pub work_id: String,
    pub title: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[tauri::command]
pub fn create_volume(pool: State<'_, DbPool>, work_id: String, title: String) -> Result<Volume, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM volumes WHERE work_id = ?1",
            rusqlite::params![work_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO volumes (id, work_id, title, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, work_id, title, max_order + 1, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Volume { id, work_id, title, sort_order: max_order + 1, created_at: now })
}

#[tauri::command]
pub fn list_volumes(pool: State<'_, DbPool>, work_id: String) -> Result<Vec<Volume>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, work_id, title, sort_order, created_at FROM volumes WHERE work_id = ?1 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let volumes = stmt
        .query_map(rusqlite::params![work_id], |row| {
            Ok(Volume {
                id: row.get(0)?,
                work_id: row.get(1)?,
                title: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(volumes)
}

#[tauri::command]
pub fn update_volume(pool: State<'_, DbPool>, id: String, title: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE volumes SET title = ?1 WHERE id = ?2", rusqlite::params![title, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_volume(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE chapters SET volume_id = NULL WHERE volume_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM volumes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_volumes(pool: State<'_, DbPool>, ids: Vec<String>) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE volumes SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

- [ ] **Step 6: Create commands/chapters.rs — Chapter CRUD**

Create `src-tauri/src/commands/chapters.rs`:
```rust
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub id: String,
    pub volume_id: Option<String>,
    pub work_id: String,
    pub title: String,
    pub content_json: String,
    pub word_count: i32,
    pub status: String,
    pub sort_order: i32,
    pub source: String,
    pub version: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn create_chapter(
    pool: State<'_, DbPool>,
    work_id: String,
    volume_id: Option<String>,
    title: String,
) -> Result<Chapter, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM chapters WHERE work_id = ?1",
            rusqlite::params![work_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    let default_content = r#"{"type":"doc","content":[{"type":"paragraph"}]}"#;

    conn.execute(
        "INSERT INTO chapters (id, volume_id, work_id, title, content_json, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, volume_id, work_id, title, default_content, max_order + 1, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Chapter {
        id,
        volume_id,
        work_id,
        title,
        content_json: default_content.into(),
        word_count: 0,
        status: "draft".into(),
        sort_order: max_order + 1,
        source: "manual".into(),
        version: 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_chapter(pool: State<'_, DbPool>, id: String) -> Result<Chapter, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, volume_id, work_id, title, content_json, word_count, status, sort_order, source, version, created_at, updated_at FROM chapters WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Chapter {
                id: row.get(0)?,
                volume_id: row.get(1)?,
                work_id: row.get(2)?,
                title: row.get(3)?,
                content_json: row.get(4)?,
                word_count: row.get(5)?,
                status: row.get(6)?,
                sort_order: row.get(7)?,
                source: row.get(8)?,
                version: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_chapter(
    pool: State<'_, DbPool>,
    id: String,
    title: String,
    content_json: String,
    word_count: i32,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE chapters SET title = ?1, content_json = ?2, word_count = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![title, content_json, word_count, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_chapter(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chapters WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_chapters(pool: State<'_, DbPool>, work_id: String, volume_id: Option<String>) -> Result<Vec<Chapter>, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let (sql, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>);

    if let Some(vid) = volume_id {
        sql = "SELECT id, volume_id, work_id, title, content_json, word_count, status, sort_order, source, version, created_at, updated_at FROM chapters WHERE work_id = ?1 AND volume_id = ?2 ORDER BY sort_order".into();
        params = vec![Box::new(work_id), Box::new(vid)];
    } else {
        sql = "SELECT id, volume_id, work_id, title, content_json, word_count, status, sort_order, source, version, created_at, updated_at FROM chapters WHERE work_id = ?1 ORDER BY sort_order".into();
        params = vec![Box::new(work_id)];
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let chapters = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Chapter {
                id: row.get(0)?,
                volume_id: row.get(1)?,
                work_id: row.get(2)?,
                title: row.get(3)?,
                content_json: row.get(4)?,
                word_count: row.get(5)?,
                status: row.get(6)?,
                sort_order: row.get(7)?,
                source: row.get(8)?,
                version: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(chapters)
}

#[tauri::command]
pub fn reorder_chapters(pool: State<'_, DbPool>, ids: Vec<String>) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE chapters SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

- [ ] **Step 7: Create stats.rs — Writing session tracking**

Create `src-tauri/src/stats.rs`:
```rust
use crate::db::DbPool;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct TodayStats {
    pub total_words: i32,
    pub session_count: i32,
}

#[tauri::command]
pub fn record_writing_session(
    pool: State<'_, DbPool>,
    work_id: String,
    chapter_id: Option<String>,
    word_delta: i32,
) -> Result<(), String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();
    let date = now.format("%Y-%m-%d").to_string();
    let now_str = now.to_rfc3339();

    conn.execute(
        "INSERT INTO writing_sessions (id, work_id, chapter_id, date, start_time, end_time, word_delta, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, work_id, chapter_id, date, now_str, now_str, word_delta, now_str],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_today_word_count(pool: State<'_, DbPool>) -> Result<TodayStats, String> {
    let conn = pool.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let total_words: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(word_delta), 0) FROM writing_sessions WHERE date = ?1",
            rusqlite::params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let session_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM writing_sessions WHERE date = ?1",
            rusqlite::params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(TodayStats { total_words, session_count })
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add SQLite database, migrations, and Rust CRUD commands"
```

---

### Task 4: Frontend foundation — Types, theme CSS, db wrappers, store

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/utils.ts`
- Create: `src/styles/themes.css`
- Create: `src/stores/appStore.ts`

- [ ] **Step 1: Create TypeScript types**

Create `src/types/index.ts`:
```typescript
export interface Work {
  id: string;
  title: string;
  pen_name: string;
  genre_tags: string;
  description: string;
  created_at: string;
  updated_at: string;
  sync_status: string;
  owner_id: string;
}

export interface Volume {
  id: string;
  work_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  volume_id: string | null;
  work_id: string;
  title: string;
  content_json: string;
  word_count: number;
  status: string;
  sort_order: number;
  source: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TodayStats {
  total_words: number;
  session_count: number;
}

export type Theme = "light" | "dark" | "eye-care";
```

- [ ] **Step 2: Create Tauri invoke wrappers**

Create `src/lib/db.ts`:
```typescript
import { invoke } from "@tauri-apps/api/core";
import type { Chapter, TodayStats, Volume, Work } from "../types";

// Works
export async function createWork(title: string): Promise<Work> {
  return invoke("create_work", { title });
}
export async function listWorks(): Promise<Work[]> {
  return invoke("list_works");
}
export async function updateWork(id: string, title: string): Promise<void> {
  return invoke("update_work", { id, title });
}
export async function deleteWork(id: string): Promise<void> {
  return invoke("delete_work", { id });
}

// Volumes
export async function createVolume(workId: string, title: string): Promise<Volume> {
  return invoke("create_volume", { workId, title });
}
export async function listVolumes(workId: string): Promise<Volume[]> {
  return invoke("list_volumes", { workId });
}
export async function updateVolume(id: string, title: string): Promise<void> {
  return invoke("update_volume", { id, title });
}
export async function deleteVolume(id: string): Promise<void> {
  return invoke("delete_volume", { id });
}
export async function reorderVolumes(ids: string[]): Promise<void> {
  return invoke("reorder_volumes", { ids });
}

// Chapters
export async function createChapter(
  workId: string,
  volumeId: string | null,
  title: string,
): Promise<Chapter> {
  return invoke("create_chapter", { workId, volumeId, title });
}
export async function getChapter(id: string): Promise<Chapter> {
  return invoke("get_chapter", { id });
}
export async function updateChapter(
  id: string,
  title: string,
  contentJson: string,
  wordCount: number,
): Promise<void> {
  return invoke("update_chapter", { id, title, contentJson, wordCount });
}
export async function deleteChapter(id: string): Promise<void> {
  return invoke("delete_chapter", { id });
}
export async function listChapters(
  workId: string,
  volumeId: string | null,
): Promise<Chapter[]> {
  return invoke("list_chapters", { workId, volumeId });
}
export async function reorderChapters(ids: string[]): Promise<void> {
  return invoke("reorder_chapters", { ids });
}

// Stats
export async function recordWritingSession(
  workId: string,
  chapterId: string | null,
  wordDelta: number,
): Promise<void> {
  return invoke("record_writing_session", { workId, chapterId, wordDelta });
}
export async function getTodayWordCount(): Promise<TodayStats> {
  return invoke("get_today_word_count");
}
```

- [ ] **Step 3: Create utility functions**

Create `src/lib/utils.ts`:
```typescript
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  // Count Chinese characters + word groups
  const cjk = text.match(/[一-鿿㐀-䶿]/g);
  const cjkCount = cjk ? cjk.length : 0;
  // Count non-CJK word groups
  const nonCjk = text.replace(/[一-鿿㐀-䶿]/g, " ");
  const words = nonCjk.match(/\b\w+\b/g);
  const wordCount = words ? words.length : 0;
  return cjkCount + wordCount;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function extractPlainText(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson);
    const texts: string[] = [];
    function walk(node: Record<string, unknown>) {
      if (node.text) texts.push(node.text as string);
      if (Array.isArray(node.content)) {
        (node.content as Record<string, unknown>[]).forEach(walk);
      }
    }
    walk(doc);
    return texts.join("");
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Create theme CSS**

Create `src/styles/themes.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

[data-theme="light"] {
  --color-surface: #ffffff;
  --color-surface-alt: #f5f5f4;
  --color-text-primary: #1c1917;
  --color-text-secondary: #78716c;
  --color-border: #d6d3d1;
  --color-accent: #2563eb;
}

[data-theme="dark"] {
  --color-surface: #1c1917;
  --color-surface-alt: #292524;
  --color-text-primary: #e7e5e4;
  --color-text-secondary: #a8a29e;
  --color-border: #44403c;
  --color-accent: #60a5fa;
}

[data-theme="eye-care"] {
  --color-surface: #fefce8;
  --color-surface-alt: #fef9c3;
  --color-text-primary: #78350f;
  --color-text-secondary: #92400e;
  --color-border: #d9f99d;
  --color-accent: #65a30d;
}

body {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}
```

- [ ] **Step 5: Create Zustand store**

Create `src/stores/appStore.ts`:
```typescript
import { create } from "zustand";
import type { Chapter, Theme, Volume, Work, TodayStats } from "../types";

interface AppState {
  // Data
  works: Work[];
  volumes: Volume[];
  chapters: Chapter[];
  activeWorkId: string | null;
  activeChapterId: string | null;

  // UI
  theme: Theme;
  sidebarOpen: boolean;
  helperPanelOpen: boolean;
  layoutMode: "default" | "focus" | "outline";
  todayStats: TodayStats;

  // Actions
  setWorks: (works: Work[]) => void;
  setVolumes: (volumes: Volume[]) => void;
  setChapters: (chapters: Chapter[]) => void;
  setActiveWork: (id: string) => void;
  setActiveChapter: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleHelperPanel: () => void;
  setLayoutMode: (mode: "default" | "focus" | "outline") => void;
  setTodayStats: (stats: TodayStats) => void;
}

export const useAppStore = create<AppState>((set) => ({
  works: [],
  volumes: [],
  chapters: [],
  activeWorkId: null,
  activeChapterId: null,
  theme: "light",
  sidebarOpen: true,
  helperPanelOpen: false,
  layoutMode: "default",
  todayStats: { total_words: 0, session_count: 0 },

  setWorks: (works) => set({ works }),
  setVolumes: (volumes) => set({ volumes }),
  setChapters: (chapters) => set({ chapters }),
  setActiveWork: (id) => set({ activeWorkId: id, activeChapterId: null }),
  setActiveChapter: (id) => set({ activeChapterId: id }),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleHelperPanel: () => set((s) => ({ helperPanelOpen: !s.helperPanelOpen })),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setTodayStats: (stats) => set({ todayStats: stats }),
}));
```

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors (may show warnings about unused vars, which is OK for scaffold).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add types, theme CSS, db wrappers, and Zustand store"
```

---

### Task 5: Core layout — 3-panel resizable shell

**Files:**
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/HelperPanel.tsx`
- Create: `src/components/theme/ThemeToggle.tsx`
- Create: `src/components/works/WorkSelector.tsx`

- [ ] **Step 1: Create AppLayout with resizable panels**

Create `src/components/layout/AppLayout.tsx`:
```typescript
import { useAppStore } from "../../stores/appStore";
import { Sidebar } from "./Sidebar";
import { HelperPanel } from "./HelperPanel";
import { WritingEditor } from "../editor/WritingEditor";

export function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const helperPanelOpen = useAppStore((s) => s.helperPanelOpen);
  const layoutMode = useAppStore((s) => s.layoutMode);

  if (layoutMode === "focus") {
    return <WritingEditor />;
  }

  return (
    <div className="flex h-full w-full">
      {sidebarOpen && (
        <aside className="w-64 min-w-[200px] border-r border-border bg-surface-alt">
          <Sidebar />
        </aside>
      )}
      <main className="flex-1 min-w-0">
        <WritingEditor />
      </main>
      {helperPanelOpen && (
        <aside className="w-72 min-w-[200px] border-l border-border bg-surface-alt">
          <HelperPanel />
        </aside>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create Sidebar**

Create `src/components/layout/Sidebar.tsx`:
```typescript
import { WorkSelector } from "../works/WorkSelector";
import { ChapterTree } from "../chapters/ChapterTree";

export function Sidebar() {
  return (
    <div className="flex flex-col h-full p-2 gap-2 overflow-hidden">
      <WorkSelector />
      <div className="flex-1 overflow-y-auto">
        <ChapterTree />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create HelperPanel placeholder**

Create `src/components/layout/HelperPanel.tsx`:
```typescript
export function HelperPanel() {
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        辅助面板
      </h2>
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        后续功能将在此显示（大纲、角色、AI 对话等）
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ThemeToggle**

Create `src/components/theme/ThemeToggle.tsx`:
```typescript
import { useAppStore } from "../../stores/appStore";
import type { Theme } from "../../types";

const themes: { key: Theme; label: string; icon: string }[] = [
  { key: "light", label: "浅色", icon: "☀" },
  { key: "dark", label: "暗色", icon: "🌙" },
  { key: "eye-care", label: "护眼", icon: "👁" },
];

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const cycle = () => {
    const idx = themes.findIndex((t) => t.key === theme);
    setTheme(themes[(idx + 1) % themes.length].key);
  };

  const current = themes.find((t) => t.key === theme)!;

  return (
    <button
      onClick={cycle}
      className="px-2 py-1 text-xs rounded border border-border hover:bg-surface-alt transition-colors"
      title={`当前: ${current.label}`}
    >
      {current.icon} {current.label}
    </button>
  );
}
```

- [ ] **Step 5: Create WorkSelector**

Create `src/components/works/WorkSelector.tsx`:
```typescript
import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import * as db from "../../lib/db";

export function WorkSelector() {
  const works = useAppStore((s) => s.works);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const setWorks = useAppStore((s) => s.setWorks);
  const setActiveWork = useAppStore((s) => s.setActiveWork);

  useEffect(() => {
    db.listWorks().then(setWorks);
  }, []);

  const handleCreate = async () => {
    const title = prompt("输入作品名称：");
    if (!title?.trim()) return;
    const work = await db.createWork(title.trim());
    const updated = await db.listWorks();
    setWorks(updated);
    setActiveWork(work.id);
  };

  if (works.length === 0) {
    return (
      <button
        onClick={handleCreate}
        className="w-full py-2 text-sm border-2 border-dashed border-border rounded text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
      >
        + 创建第一部作品
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={activeWorkId ?? ""}
        onChange={(e) => setActiveWork(e.target.value)}
        className="flex-1 text-sm bg-surface border border-border rounded px-2 py-1 text-text-primary min-w-0"
      >
        {works.map((w) => (
          <option key={w.id} value={w.id}>
            {w.title}
          </option>
        ))}
      </select>
      <button
        onClick={handleCreate}
        className="shrink-0 px-2 py-1 text-sm border border-border rounded hover:bg-surface-alt"
        title="新建作品"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add core layout shell, theme toggle, and work selector"
```

---

### Task 6: Chapter tree component

**Files:**
- Create: `src/components/chapters/ChapterTree.tsx`
- Create: `src/components/chapters/ChapterActions.tsx`

- [ ] **Step 1: Create ChapterActions inline buttons**

Create `src/components/chapters/ChapterActions.tsx`:
```typescript
interface Props {
  onAddVolume: () => void;
  onAddChapter: () => void;
  onRename: () => void;
  onDelete: () => void;
  isWork?: boolean;
}

export function ChapterActions({ onAddVolume, onAddChapter, onRename, onDelete, isWork }: Props) {
  return (
    <span className="inline-flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {isWork && (
        <button onClick={onAddVolume} title="新建卷" className="text-xs px-1 hover:text-accent">
          +卷
        </button>
      )}
      <button onClick={onAddChapter} title="新建章节" className="text-xs px-1 hover:text-accent">
        +章
      </button>
      <button onClick={onRename} title="重命名" className="text-xs px-1 hover:text-accent">
        ✎
      </button>
      <button onClick={onDelete} title="删除" className="text-xs px-1 hover:text-red-500">
        ✕
      </button>
    </span>
  );
}
```

- [ ] **Step 2: Create ChapterTree**

Create `src/components/chapters/ChapterTree.tsx`:
```typescript
import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { ChapterActions } from "./ChapterActions";
import * as db from "../../lib/db";

export function ChapterTree() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const volumes = useAppStore((s) => s.volumes);
  const chapters = useAppStore((s) => s.chapters);
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const setVolumes = useAppStore((s) => s.setVolumes);
  const setChapters = useAppStore((s) => s.setChapters);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  useEffect(() => {
    if (!activeWorkId) return;
    db.listVolumes(activeWorkId).then(setVolumes);
    db.listChapters(activeWorkId, null).then(setChapters);
  }, [activeWorkId]);

  const handleAddVolume = async () => {
    if (!activeWorkId) return;
    const title = prompt("卷名：");
    if (!title?.trim()) return;
    await db.createVolume(activeWorkId, title.trim());
    setVolumes(await db.listVolumes(activeWorkId));
  };

  const handleAddChapter = async (volumeId: string | null) => {
    if (!activeWorkId) return;
    const title = prompt("章节标题：");
    if (!title?.trim()) return;
    await db.createChapter(activeWorkId, volumeId, title.trim());
    setChapters(await db.listChapters(activeWorkId, null));
  };

  const handleRenameChapter = async (id: string, currentTitle: string) => {
    const title = prompt("新标题：", currentTitle);
    if (!title?.trim()) return;
    await db.updateChapter(id, title.trim(), "{}", 0);
    if (activeWorkId) setChapters(await db.listChapters(activeWorkId, null));
  };

  const handleRenameVolume = async (id: string, currentTitle: string) => {
    const title = prompt("新卷名：", currentTitle);
    if (!title?.trim()) return;
    await db.updateVolume(id, title.trim());
    if (activeWorkId) setVolumes(await db.listVolumes(activeWorkId));
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("确定删除此章节？")) return;
    await db.deleteChapter(id);
    if (activeChapterId === id) setActiveChapter(null);
    if (activeWorkId) setChapters(await db.listChapters(activeWorkId, null));
  };

  const handleDeleteVolume = async (id: string) => {
    if (!confirm("确定删除此卷？卷内章节将移为未分类。")) return;
    await db.deleteVolume(id);
    if (activeWorkId) {
      setVolumes(await db.listVolumes(activeWorkId));
      setChapters(await db.listChapters(activeWorkId, null));
    }
  };

  if (!activeWorkId) {
    return <p className="text-sm text-text-secondary p-2">请先创建或选择作品</p>;
  }

  const orphanChapters = chapters.filter((c) => !c.volume_id);

  return (
    <div className="text-sm">
      {/* Orphan chapters (no volume) */}
      {orphanChapters.map((ch) => (
        <div
          key={ch.id}
          onClick={() => setActiveChapter(ch.id)}
          className={`group flex items-center py-1 px-2 cursor-pointer rounded ${
            activeChapterId === ch.id
              ? "bg-accent text-white"
              : "hover:bg-surface text-text-primary"
          }`}
        >
          <span className="truncate flex-1">📄 {ch.title}</span>
          <ChapterActions
            onAddVolume={() => handleAddVolume()}
            onAddChapter={() => handleAddChapter(null)}
            onRename={() => handleRenameChapter(ch.id, ch.title)}
            onDelete={() => handleDeleteChapter(ch.id)}
          />
        </div>
      ))}

      {/* Volumes and their chapters */}
      {volumes.map((vol) => {
        const volChapters = chapters.filter((c) => c.volume_id === vol.id);
        return (
          <div key={vol.id} className="mt-1">
            <div className="group flex items-center py-1 px-2 font-semibold text-text-secondary">
              <span className="truncate flex-1">📁 {vol.title}</span>
              <ChapterActions
                onAddVolume={() => handleAddVolume()}
                onAddChapter={() => handleAddChapter(vol.id)}
                onRename={() => handleRenameVolume(vol.id, vol.title)}
                onDelete={() => handleDeleteVolume(vol.id)}
              />
            </div>
            {volChapters.map((ch) => (
              <div
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`group flex items-center py-1 pl-6 pr-2 cursor-pointer rounded ${
                  activeChapterId === ch.id
                    ? "bg-accent text-white"
                    : "hover:bg-surface text-text-primary"
                }`}
              >
                <span className="truncate flex-1">📄 {ch.title}</span>
                <ChapterActions
                  onAddVolume={() => handleAddVolume()}
                  onAddChapter={() => handleAddChapter(vol.id)}
                  onRename={() => handleRenameChapter(ch.id, ch.title)}
                  onDelete={() => handleDeleteChapter(ch.id)}
                />
              </div>
            ))}
          </div>
        );
      })}

      {/* Quick add buttons when no orphan chapters */}
      <div className="mt-2 px-2 flex gap-1">
        <button
          onClick={() => handleAddChapter(null)}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-surface"
        >
          + 章节
        </button>
        <button
          onClick={() => handleAddVolume()}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-surface"
        >
          + 卷
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add chapter tree with CRUD and inline actions"
```

---

### Task 7: Writing editor — Tiptap + toolbar + status bar

**Files:**
- Create: `src/components/editor/WritingEditor.tsx`
- Create: `src/components/editor/EditorToolbar.tsx`
- Create: `src/components/editor/StatusBar.tsx`

- [ ] **Step 1: Create EditorToolbar**

Create `src/components/editor/EditorToolbar.tsx`:
```typescript
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-sm rounded border ${
      active
        ? "bg-accent text-white border-accent"
        : "border-border hover:bg-surface-alt text-text-primary"
    }`;

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border bg-surface-alt">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive("bold"))}
        title="加粗 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive("italic"))}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <span className="w-px bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive("heading", { level: 1 }))}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <span className="w-px bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-2 py-1 text-sm rounded border border-border hover:bg-surface-alt text-text-primary"
        title="分隔线"
      >
        ―
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBar**

Create `src/components/editor/StatusBar.tsx`:
```typescript
import { useAppStore } from "../../stores/appStore";
import { formatTime } from "../../lib/utils";
import { useState, useEffect } from "react";

interface Props {
  wordCount: number;
  isSaving: boolean;
}

export function StatusBar({ wordCount, isSaving }: Props) {
  const todayStats = useAppStore((s) => s.todayStats);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-surface-alt text-xs text-text-secondary">
      <div className="flex items-center gap-4">
        <span>当前章节: {wordCount.toLocaleString()} 字</span>
        <span>今日: {todayStats.total_words.toLocaleString()} 字</span>
      </div>
      <div className="flex items-center gap-4">
        <span>{isSaving ? "保存中..." : "已保存"}</span>
        <span>{formatTime(now)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create WritingEditor with Tiptap**

Create `src/components/editor/WritingEditor.tsx`:
```typescript
import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useAppStore } from "../../stores/appStore";
import { EditorToolbar } from "./EditorToolbar";
import { StatusBar } from "./StatusBar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { extractPlainText, countWords } from "../../lib/utils";
import * as db from "../../lib/db";

const SAVE_INTERVAL = 30000; // 30 seconds

export function WritingEditor() {
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleHelperPanel = useAppStore((s) => s.toggleHelperPanel);
  const setLayoutMode = useAppStore((s) => s.setLayoutMode);
  const layoutMode = useAppStore((s) => s.layoutMode);
  const setTodayStats = useAppStore((s) => s.setTodayStats);

  const [chapterTitle, setChapterTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lastSavedWordCount, setLastSavedWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false,
      }),
      Placeholder.configure({ placeholder: "开始写作..." }),
    ],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      const text = extractPlainText(JSON.stringify(editor.getJSON()));
      setWordCount(countWords(text));
    },
  });

  // Load chapter content
  useEffect(() => {
    if (!activeChapterId) {
      editor?.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
      setChapterTitle("");
      return;
    }
    db.getChapter(activeChapterId).then((ch) => {
      setChapterTitle(ch.title);
      try {
        editor?.commands.setContent(JSON.parse(ch.content_json));
      } catch {
        editor?.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
      }
      setWordCount(ch.word_count);
      setLastSavedWordCount(ch.word_count);
    });
  }, [activeChapterId, editor]);

  // Load today stats
  useEffect(() => {
    db.getTodayWordCount().then(setTodayStats);
  }, []);

  // Auto-save
  const save = useCallback(async () => {
    if (!activeChapterId || !editor) return;
    setIsSaving(true);
    const json = JSON.stringify(editor.getJSON());
    const delta = wordCount - lastSavedWordCount;
    try {
      await db.updateChapter(activeChapterId, chapterTitle, json, wordCount);
      if (delta !== 0 && activeWorkId) {
        await db.recordWritingSession(activeWorkId, activeChapterId, delta);
        const stats = await db.getTodayWordCount();
        setTodayStats(stats);
      }
      setLastSavedWordCount(wordCount);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setIsSaving(false);
    }
  }, [activeChapterId, chapterTitle, wordCount, lastSavedWordCount, activeWorkId, editor]);

  // Auto-save interval
  useEffect(() => {
    const timer = setInterval(save, SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [save]);

  // Save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  if (!activeChapterId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-alt">
          <div className="flex items-center gap-2">
            <button onClick={toggleSidebar} className="text-sm px-2 py-1 border border-border rounded hover:bg-surface">
              侧栏
            </button>
            <button onClick={toggleHelperPanel} className="text-sm px-2 py-1 border border-border rounded hover:bg-surface">
              辅栏
            </button>
            <button
              onClick={() => setLayoutMode(layoutMode === "focus" ? "default" : "focus")}
              className="text-sm px-2 py-1 border border-border rounded hover:bg-surface"
            >
              {layoutMode === "focus" ? "退出专注" : "专注"}
            </button>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          <p>选择或创建一个章节开始写作</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-alt gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={toggleSidebar} className="text-sm px-2 py-1 border border-border rounded hover:bg-surface shrink-0">
            侧栏
          </button>
          <button onClick={toggleHelperPanel} className="text-sm px-2 py-1 border border-border rounded hover:bg-surface shrink-0">
            辅栏
          </button>
          <button
            onClick={() => setLayoutMode(layoutMode === "focus" ? "default" : "focus")}
            className="text-sm px-2 py-1 border border-border rounded hover:bg-surface shrink-0"
          >
            {layoutMode === "focus" ? "退出专注" : "专注"}
          </button>
          <input
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            className="flex-1 text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-accent focus:outline-none px-2 py-0.5 text-text-primary min-w-0"
            placeholder="章节标题"
          />
        </div>
        <ThemeToggle />
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <EditorContent
            editor={editor}
            className="prose prose-stone max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-text-secondary [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
          />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar wordCount={wordCount} isSaving={isSaving} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Tiptap editor with toolbar, status bar, and auto-save"
```

---

### Task 8: Build Cargo dependencies and fix Rust compilation

**Files:** None (build verification)

- [ ] **Step 1: Build Rust backend**

```bash
cd src-tauri && cargo build
```
Expected: successful compilation of all Rust dependencies and source. May take 5-10 minutes on first build (downloading crates).

If compilation errors occur, fix them:
- Check that `use` imports match actual module structure
- Verify `Cargo.toml` dependencies resolve correctly
- Ensure `tauri::Builder` method chain matches Tauri 2.x API

- [ ] **Step 2: Run full frontend TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no type errors.

- [ ] **Step 3: Run Vite dev build (dry-run)**

```bash
npx vite build
```
Expected: successful frontend build.

- [ ] **Step 4: Commit any fixes**

```bash
# Only if changes were needed
git add -A && git commit -m "fix: resolve Rust and TypeScript compilation issues"
```

---

### Task 9: Launch and verify the app

**Files:** None

- [ ] **Step 1: Launch in dev mode**

```bash
pnpm tauri dev
```
Expected: Tauri window opens with the AI Writer Helper app.

- [ ] **Step 2: Smoke test — Verify the golden path**

Manual verification checklist:
1. Click "+ 创建第一部作品" → enter name → works list populates
2. Click "+ 卷" → enter volume name → volume appears in tree
3. Click "+ 章" on a volume → enter chapter title → chapter appears
4. Click a chapter → editor loads with placeholder text
5. Type in editor → word count updates in status bar
6. Bold/Italic/H1/H2/H3 toolbar buttons work
7. Wait 30 seconds → status bar shows "已保存" (auto-save worked)
8. Click theme toggle → cycles light → dark → eye-care
9. Click "专注" → sidebar hides, editor fills window
10. Click "退出专注" → sidebar returns
11. Close and reopen app → data persists (SQLite)

- [ ] **Step 3: Commit if any hotfixes applied**

```bash
git add -A && git commit -m "fix: hotfixes from smoke test"
```

- [ ] **Step 4: Push to remote**

```bash
git push
```

---

### Task 10: Final integration polish

**Files:**
- Modify: `src/components/editor/StatusBar.tsx`
- Modify: `src/components/editor/WritingEditor.tsx`

- [ ] **Step 1: Save on chapter switch**

In `WritingEditor.tsx`, update the `activeChapterId` effect to save current chapter before loading new one. Add to the `useEffect` that loads chapters:

Modify the chapter-loading `useEffect` in `WritingEditor.tsx` to save before switching:

```typescript
// Replace the activeChapterId useEffect with:
useEffect(() => {
  if (!activeChapterId) {
    editor?.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
    setChapterTitle("");
    return;
  }
  // Save current before loading new
  const loadChapter = async () => {
    // Fire-and-forget save of current state
    save();
    const ch = await db.getChapter(activeChapterId);
    setChapterTitle(ch.title);
    try {
      editor?.commands.setContent(JSON.parse(ch.content_json));
    } catch {
      editor?.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
    }
    setWordCount(ch.word_count);
    setLastSavedWordCount(ch.word_count);
  };
  loadChapter();
}, [activeChapterId]);
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: save current chapter on switch, final polish"
```

- [ ] **Step 3: Final push**

```bash
git push
```
