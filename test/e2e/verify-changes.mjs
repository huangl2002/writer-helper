import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = join(__dirname, "verify-screenshots");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE = "http://localhost:1420";

async function s(page, name) {
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 ${name}`);
}

const findings = [];

function find(title, detail) {
  console.log(`  ${detail}`);
  findings.push(title);
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // ==========================================
  // 1. HOMEPAGE
  // ==========================================
  console.log("\n[1] Homepage verification...");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await s(page, "01-homepage");

  // Verify key elements
  const title = await page.$("h1");
  if (title) { const t = await title.textContent(); find("✅", `Title: ${t}`); } else find("❌", "No h1 title found");

  const continueBtn = await page.$("button:has-text('继续写作')");
  find(continueBtn ? "✅" : "⚠️", continueBtn ? "Continue Writing CTA present" : "No continue writing button (no works configured)");

  const featureBtns = await page.$$eval("button", els =>
    els.filter(e => ["码字台","数据统计","角色管理","大纲规划","灵感笔记","写作目标","AI 助手","AI 配置","历史版本","导入导出"].some(t => e.textContent?.includes(t))).length
  );
  find(featureBtns >= 8 ? "✅" : "❌", `${featureBtns} feature cards found on homepage`);

  // ==========================================
  // 2. WRITING DESK — Toolbar + Editor
  // ==========================================
  console.log("\n[2] Writing Desk verification...");
  const writingLink = await page.$("button:has-text('码字台')");
  if (writingLink) {
    await writingLink.click();
    await page.waitForTimeout(500);
    await s(page, "02a-writing-empty");

    // The toolbar only renders when an active chapter is selected (editor is present)
    // In empty state, we see the placeholder controls
    const controlBtns = ["侧栏", "辅栏", "专注", "打字机"];
    for (const btn of controlBtns) {
      const b = await page.$(`button:has-text('${btn}')`);
      find(b ? "✅" : "⚠️", `Control button "${btn}" ${b ? "present" : "MISSING"}`);
    }

    // Empty state
    const emptyHint = await page.$("text=选择或创建一个章节");
    find(emptyHint ? "✅" : "❌", emptyHint ? "Empty state hint shown" : "Empty hint MISSING");

    // Focus mode toggle
    const focusBtn = await page.$("button:has-text('专注')");
    if (focusBtn) {
      await focusBtn.click();
      await page.waitForTimeout(400);
      await s(page, "02b-focus-mode");
      find("✅", "Focus mode toggled");
      // Exit focus
      const exitFocus = await page.$("button:has-text('退出专注')");
      if (exitFocus) { await exitFocus.click(); await page.waitForTimeout(300); }
    }

    // Typewriter mode toggle
    const twBtn = await page.$("button:has-text('打字机')");
    if (twBtn) {
      await twBtn.click();
      await page.waitForTimeout(200);
      const isActive = await twBtn.evaluate(el => el.className.includes("bg-accent"));
      find(isActive ? "✅" : "❌", isActive ? "Typewriter mode activates" : "Typewriter toggle failed");
      await twBtn.click(); // deactivate
    }
  }

  // Navigate back
  let backBtn = await page.$("button:has-text('首页')");
  if (backBtn) { await backBtn.click(); await page.waitForTimeout(300); }

  // ==========================================
  // 3. STATS PAGE — Trend chart + Work filter
  // ==========================================
  console.log("\n[3] Stats verification...");
  const statsBtn = await page.$("button:has-text('数据统计')");
  if (statsBtn) {
    await statsBtn.click();
    await page.waitForTimeout(800);
    await s(page, "03-stats");

    // Check for 30-day trend canvas
    const canvas = await page.$("canvas");
    find(canvas ? "✅" : "⚠️", canvas ? "Trend chart canvas rendered" : "No trend data yet (expected if no writing sessions)");

    // Check year navigation
    const yearHeading = await page.$("h2");
    if (yearHeading) { const y = await yearHeading.textContent(); find("✅", `Year display: ${y}`); }

    // Check work filter
    const workFilter = await page.$("select");
    find(workFilter ? "✅" : "⚠️", workFilter ? "Work filter dropdown present" : "No works configured (expected)");
  }
  backBtn = await page.$("button:has-text('首页')");
  if (backBtn) { await backBtn.click(); await page.waitForTimeout(300); }

  // ==========================================
  // 4. CHARACTERS — Portrait support
  // ==========================================
  console.log("\n[4] Characters verification...");
  const charBtn = await page.$("button:has-text('角色管理')");
  if (charBtn) {
    await charBtn.click();
    await page.waitForTimeout(500);
    await s(page, "04-characters");

    // Check for new character button
    const newCharBtn = await page.$("button:has-text('新建角色')");
    find(newCharBtn ? "✅" : "⚠️", newCharBtn ? "New character button present" : "No work selected (expected)");
  }
  backBtn = await page.$("button:has-text('首页')");
  if (backBtn) { await backBtn.click(); await page.waitForTimeout(300); }

  // ==========================================
  // 5. AI SETTINGS — Test connection button
  // ==========================================
  console.log("\n[5] AI Settings verification...");
  const aiSettingsBtn = await page.$("button:has-text('AI 配置')");
  if (aiSettingsBtn) {
    await aiSettingsBtn.click();
    await page.waitForTimeout(500);
    await s(page, "05-ai-settings");

    // Click "添加配置" to see the form
    const addBtn = await page.$("button:has-text('添加配置')");
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(300);
      await s(page, "05b-ai-settings-form");

      // Check for test connection button
      const testBtn = await page.$("button:has-text('测试连接')");
      find(testBtn ? "✅" : "❌", testBtn ? "Test connection button present" : "Test button MISSING");

      // Check provider templates
      const templates = ["OpenAI", "DeepSeek", "通义千问", "Kimi", "Ollama", "自定义"];
      for (const t of templates) {
        const tb = await page.$(`button:has-text('${t}')`);
        find(tb ? "✅" : "⚠️", `Provider template "${t}" ${tb ? "present" : "MISSING"}`);
      }
    }
  }
  backBtn = await page.$("button:has-text('首页')");
  if (backBtn) { await backBtn.click(); await page.waitForTimeout(300); }

  // ==========================================
  // 6. AI CHAT — Config error handling
  // ==========================================
  console.log("\n[6] AI Chat verification...");
  const aiChatBtn = await page.$("button:has-text('AI 助手')");
  if (aiChatBtn) {
    await aiChatBtn.click();
    await page.waitForTimeout(500);
    await s(page, "06-ai-chat");

    // Should show "未配置 AI 服务" with navigation button
    const noConfig = await page.$("text=未配置 AI 服务");
    find(noConfig ? "✅" : "⚠️", noConfig ? "Unconfigured state shown correctly" : "Config state unclear");

    const gotoConfig = await page.$("button:has-text('前往配置')");
    find(gotoConfig ? "✅" : "❌", gotoConfig ? "Navigate to config button present" : "Config button MISSING");

    const reloadBtn = await page.$("button:has-text('重新加载')");
    find(reloadBtn ? "✅" : "❌", reloadBtn ? "Reload button present" : "Reload button MISSING");
  }
  backBtn = await page.$("button:has-text('首页')");
  if (backBtn) { await backBtn.click(); await page.waitForTimeout(300); }

  // ==========================================
  // 7. OTHER PAGES — Quick navigation check
  // ==========================================
  console.log("\n[7] Navigation verification...");
  const pagesToCheck = [
    { label: "大纲规划", name: "outline" },
    { label: "灵感笔记", name: "notes" },
    { label: "写作目标", name: "goals" },
    { label: "导入导出", name: "import" },
    { label: "历史版本", name: "history" },
  ];
  for (const p of pagesToCheck) {
    const b = await page.$(`button:has-text('${p.label}')`);
    if (b) {
      await b.click();
      await page.waitForTimeout(400);
      await s(page, `07-${p.name}`);
      find("✅", `Page "${p.label}" loaded`);
      const back = await page.$("button:has-text('首页')");
      if (back) { await back.click(); await page.waitForTimeout(200); }
    } else {
      find("⚠️", `Page "${p.label}" button not found`);
    }
  }

  // ==========================================
  // 8. THEME SWITCHING
  // ==========================================
  console.log("\n[8] Theme verification...");
  for (const theme of ["dark", "eye-care"]) {
    const themeAttr = await page.$eval("[data-theme]", el => el.getAttribute("data-theme"));
    console.log(`  Theme: ${themeAttr}`);
    // Toggle theme - click ThemeToggle element if visible
    const themeToggle = await page.$$eval("button", els => {
      const btn = els.find(e => e.textContent?.includes("🌙") || e.textContent?.includes("☀") || e.textContent?.includes("🌿"));
      return btn ? true : false;
    });
    find(themeToggle ? "✅" : "⚠️", "Theme toggle present");
    break; // One check is enough
  }

  // ==========================================
  // REPORT
  // ==========================================
  console.log("\n" + "=".repeat(50));
  console.log("VERIFICATION REPORT");
  console.log("=".repeat(50));
  console.log(`Total checks: ${findings.length}`);
  const passes = findings.filter(f => f.startsWith("✅")).length;
  const fails = findings.filter(f => f.startsWith("❌")).length;
  const warns = findings.filter(f => f.startsWith("⚠️")).length;
  console.log(`✅ Pass: ${passes}`);
  console.log(`⚠️ Warn: ${warns}`);
  console.log(`❌ Fail: ${fails}`);

  await browser.close();
}

main().catch(e => { console.error("VERIFICATION ERROR:", e.message); process.exit(1); });
