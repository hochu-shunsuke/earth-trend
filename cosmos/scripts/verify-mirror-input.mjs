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
await new Promise((r) => setTimeout(r, 4000));

// 1) 自由入力で自分の問いを潜る
await p.type('input[aria-label="問いを入力"]', "なぜ私は緊張する");
await p.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 3000));
const panel = await p.evaluate(() => document.querySelector(".panel strong")?.textContent ?? "(none)");
console.log("free-input panel:", panel);

// 2) 危機入力 → 配慮カードが出るか
await p.evaluate(() => {
  const i = document.querySelector('input[aria-label="問いを入力"]');
  i.value = "";
});
await p.type('input[aria-label="問いを入力"]', "死にたい");
await p.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 1500));
const crisis = await p.evaluate(() =>
  [...document.querySelectorAll("p")].some((el) => el.textContent.includes("ひとりで抱えなくていい")),
);
console.log("crisis care card shown:", crisis);

await p.screenshot({ path: "/tmp/mirror-input.png" });
console.log("ERRORS:", errs.length ? errs.join("; ") : "(none)");
await b.close();
