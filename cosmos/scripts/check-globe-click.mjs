import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1400, height: 900 });
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://localhost:3100/globe", { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 9000));
const pos = await p.evaluate(() => {
  const divs = [...document.querySelectorAll("div")].filter(d => d.style.textShadow && d.style.visibility !== "hidden");
  if (!divs.length) return null;
  const r = divs[Math.floor(divs.length / 2)].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, count: divs.length };
});
console.log("LABEL POS:", JSON.stringify(pos));
if (pos) {
  await p.mouse.click(pos.x, pos.y);
  await new Promise(r => setTimeout(r, 1500));
  const panel = await p.evaluate(() => document.querySelector("strong")?.textContent ?? "(no panel)");
  console.log("PANEL:", panel);
}
console.log("ERRORS:", errs.length ? errs.join("; ") : "(none)");
await b.close();
