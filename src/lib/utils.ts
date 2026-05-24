export function countWords(text: string): number {
  if (!text.trim()) return 0;
  const cjk = text.match(/[一-鿿㐀-䶿]/g);
  const cjkCount = cjk ? cjk.length : 0;
  const nonCjk = text.replace(/[一-鿿㐀-䶿]/g, " ");
  const words = nonCjk.match(/\b\w+\b/g);
  const wordCount = words ? words.length : 0;
  return cjkCount + wordCount;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
