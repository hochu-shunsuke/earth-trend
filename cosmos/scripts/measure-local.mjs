import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
for (const geo of ["JP","KR","BR","DE"]) {
  await p.goto(`http://localhost:3103/list?geo=${geo}`, { waitUntil: "networkidle2" });
  await new Promise(r=>setTimeout(r,500));
  const m = await p.evaluate(() => { const r=document.querySelector("main").getBoundingClientRect(); return {left:Math.round(r.left),width:Math.round(r.width)}; });
  console.log(geo, JSON.stringify(m));
}
await b.close();
