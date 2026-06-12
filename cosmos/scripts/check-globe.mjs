import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const p = await b.newPage();
await p.setViewport({ width: 1400, height: 900 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://localhost:3100/globe", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 9000));
const status = await p.evaluate(() => document.body.innerText.split("\n").find(l => l.includes("trends")) ?? "(no status)");
console.log("STATUS:", status);
await p.screenshot({ path: "/tmp/cosmos-globe.png" });
console.log("ERRORS:", errs.length ? errs.join("; ") : "(none)");
await b.close();
