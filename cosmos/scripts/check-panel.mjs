import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
await p.goto("http://localhost:3100", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 4000));

// 橙ピクセルを複数探す(離れた場所から3つ)
const targets = await p.evaluate(() => {
  const c = document.querySelector("canvas");
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  const found = [];
  for (let y = 60; y < c.height - 60; y += 4) {
    for (let x = 60; x < c.width - 60; x += 4) {
      const i = (y * c.width + x) * 4;
      const [r, g, bl] = [img[i], img[i + 1], img[i + 2]];
      if (r > 180 && g > 60 && g < 160 && bl < 90) {
        if (found.every(f => Math.hypot(f.x - x, f.y - y) > 120)) {
          found.push({ x: x / dpr, y: y / dpr });
          if (found.length >= 3) return found;
        }
      }
    }
  }
  return found;
});
console.log("TARGETS:", JSON.stringify(targets));

for (const t of targets) {
  await p.mouse.click(t.x, t.y);
  await new Promise(r => setTimeout(r, 1500));
  const word = await p.evaluate(() => document.querySelector("strong")?.textContent ?? "(no panel)");
  console.log(`click(${Math.round(t.x)},${Math.round(t.y)}) -> panel: ${word}`);
}
await b.close();
