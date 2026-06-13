import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3105/mirror", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 5000)); // 初期stem + 自動展開待ち
const target = await p.evaluate(() => {
  const c = document.querySelector("canvas");
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let y = 120; y < c.height - 120; y += 3)
    for (let x = 120; x < c.width - 380 * dpr; x += 3) {
      const i = (y * c.width + x) * 4;
      const [r, g, bl] = [img[i], img[i + 1], img[i + 2]];
      if (r > 180 && g > 60 && g < 170 && bl < 100) return { x: x / dpr, y: y / dpr };
    }
  return null;
});
console.log("seed pixel found:", JSON.stringify(target));
if (target) {
  await p.mouse.click(target.x, target.y);
  await new Promise((r) => setTimeout(r, 2500));
}
const panel = await p.evaluate(() => document.querySelector(".panel strong")?.textContent ?? "(none)");
const help = await p.evaluate(() =>
  [...document.querySelectorAll("a")].some((a) => a.textContent.includes("ひとりで抱えないで")),
);
console.log("panel word:", panel);
console.log("helpline present:", help);
await p.screenshot({ path: "/tmp/mirror.png" });
console.log("ERRORS:", errs.length ? errs.join("; ") : "(none)");
await b.close();
