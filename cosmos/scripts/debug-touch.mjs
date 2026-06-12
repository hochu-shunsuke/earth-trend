import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
// iPhone相当: タッチ有効ビューポート
await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://localhost:3100", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 6000));

const target = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return null;
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let y = 80 * dpr; y < c.height - 80 * dpr; y += 4) {
    for (let x = 40 * dpr; x < c.width - 40 * dpr; x += 4) {
      const i = (y * c.width + x) * 4;
      const [r, g, b] = [img[i], img[i + 1], img[i + 2]];
      if (r > 180 && g > 60 && g < 160 && b < 90)
        return { x: x / dpr, y: y / dpr };
    }
  }
  return null;
});
console.log("TARGET:", JSON.stringify(target));

if (target) {
  await page.touchscreen.tap(target.x, target.y);
  await new Promise((r) => setTimeout(r, 3000));
  const clicked = await page.evaluate(() =>
    document.body.innerText.includes("clicked:")
  );
  console.log("TAP REGISTERED:", clicked);
  await page.screenshot({ path: "/tmp/cosmos-mobile.png" });
}
console.log("PAGE ERRORS:", errors.length ? errors.join("; ") : "(none)");
await browser.close();
