import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 800 });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto("http://localhost:3100", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 6000)); // データ取得+シミュレーション安定待ち

// canvas存在チェック
const canvasInfo = await page.evaluate(() => {
  const cs = [...document.querySelectorAll("canvas")];
  return cs.map((c) => ({
    w: c.width,
    h: c.height,
    cssW: c.clientWidth,
    cssH: c.clientHeight,
    pointerEvents: getComputedStyle(c).pointerEvents,
    parentPointerEvents: c.parentElement
      ? getComputedStyle(c.parentElement).pointerEvents
      : null,
  }));
});
console.log("CANVAS:", JSON.stringify(canvasInfo, null, 2));

await page.screenshot({ path: "/tmp/cosmos-before.png" });

// 画面中央付近の非背景ピクセルを探してクリック(ノードを狙う)
const target = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return null;
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  // 背景 #0a0a1a 以外で彩度のあるピクセルを探す
  for (let y = 100; y < c.height - 100; y += 4) {
    for (let x = 100; x < c.width - 100; x += 4) {
      const i = (y * c.width + x) * 4;
      const [r, g, b] = [img[i], img[i + 1], img[i + 2]];
      const isOrange = r > 180 && g > 60 && g < 160 && b < 90;
      if (isOrange) return { x: x / dpr, y: y / dpr };
    }
  }
  return null;
});
console.log("TARGET PIXEL:", JSON.stringify(target));

if (target) {
  await page.mouse.click(target.x, target.y);
  await new Promise((r) => setTimeout(r, 3000));
  const clicked = await page.evaluate(() =>
    document.body.innerText.includes("close")
  );
  console.log("CLICK REGISTERED:", clicked);
  await page.screenshot({ path: "/tmp/cosmos-after.png" });
}

console.log("--- CONSOLE LOGS ---");
console.log(logs.join("\n") || "(none)");
await browser.close();
