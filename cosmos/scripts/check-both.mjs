import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1400, height: 900 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://localhost:3100", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 3000));
const btns = await p.$$("button");
for (const btn of btns) { const t = await btn.evaluate(el => el.textContent); if (t === "JP×US") { await btn.click(); break; } }
await new Promise(r => setTimeout(r, 8000));
await p.screenshot({ path: "/tmp/cosmos-both.png" });
console.log("ERRORS:", errs.length ? errs.join("; ") : "(none)");
await b.close();
