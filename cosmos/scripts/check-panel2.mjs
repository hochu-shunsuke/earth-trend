import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
await p.goto("http://localhost:3100", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 5000));

const findOrange = (excludeX) => p.evaluate((ex) => {
  const c = document.querySelector("canvas");
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let y = 60; y < c.height - 60; y += 3) {
    for (let x = 60; x < c.width - 360 * dpr; x += 3) {
      const i = (y * c.width + x) * 4;
      const [r, g, bl] = [img[i], img[i + 1], img[i + 2]];
      if (r > 180 && g > 60 && g < 160 && bl < 90) {
        if (ex == null || Math.abs(x / dpr - ex) > 150) return { x: x / dpr, y: y / dpr };
      }
    }
  }
  return null;
}, excludeX);

// 1回目: 安定待ちしてからクリック
await new Promise(r => setTimeout(r, 3000));
let t1 = await findOrange(null);
await p.mouse.click(t1.x, t1.y);
await new Promise(r => setTimeout(r, 2000));
const w1 = await p.evaluate(() => document.querySelector("strong")?.textContent ?? "(none)");
console.log("click1:", JSON.stringify(t1), "->", w1);

// 2回目: 位置を取り直して、1回目から離れた星を狙う
await new Promise(r => setTimeout(r, 3000)); // シミュレーション沈静化待ち
const t2 = await findOrange(t1.x);
await p.mouse.click(t2.x, t2.y);
await new Promise(r => setTimeout(r, 2000));
const w2 = await p.evaluate(() => document.querySelector("strong")?.textContent ?? "(none)");
console.log("click2:", JSON.stringify(t2), "->", w2);
console.log("PANEL SWITCHED:", w1 !== w2);
await b.close();
