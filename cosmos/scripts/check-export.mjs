import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
const client = await p.createCDPSession();
await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: "/tmp/cosmos-dl" });
await p.goto("http://localhost:3100", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 4000));
const btns = await p.$$("button");
for (const btn of btns) { const t = await btn.evaluate(el => el.textContent); if (t === "画像で保存") { await btn.click(); break; } }
await new Promise(r => setTimeout(r, 2500));
await b.close();
