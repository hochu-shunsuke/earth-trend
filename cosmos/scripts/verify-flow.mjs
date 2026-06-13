import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
// 1) home = pulse
await p.goto("http://localhost:3105/", { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise(r=>setTimeout(r,800));
const h1 = await p.$eval("h1", e=>e.textContent);
const firstWord = await p.$eval("ol li a[href^='/explore']", e=>({text:e.textContent, href:e.getAttribute("href")}));
console.log("HOME h1:", h1);
console.log("first trend link:", JSON.stringify(firstWord));
// 2) click dive
await p.goto(`http://localhost:3105${firstWord.href}`, { waitUntil:"networkidle2" });
await new Promise(r=>setTimeout(r,3500));
// did seed auto-expand? count nodes via the panel showing the seed word + suggestion nodes drawn
const panel = await p.evaluate(()=>document.querySelector("strong")?.textContent ?? "(none)");
console.log("explore panel (should be seed word):", panel);
await p.screenshot({path:"/tmp/flow-explore.png"});
console.log("ERRORS:", errs.length?errs.join("; "):"(none)");
await b.close();
