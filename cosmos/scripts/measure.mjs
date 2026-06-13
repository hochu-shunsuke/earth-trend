import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.authenticate({ username: "hochu", password: "Hemu2525" });
await p.setViewport({ width: 1200, height: 800 });
for (const geo of ["JP","DE","KR","BR"]) {
  await p.goto(`https://earth-trend.vercel.app/list?geo=${geo}`, { waitUntil: "networkidle2" });
  await new Promise(r=>setTimeout(r,800));
  const m = await p.evaluate(() => {
    const main = document.querySelector("main");
    const r = main.getBoundingClientRect();
    return { left: Math.round(r.left), width: Math.round(r.width), winW: window.innerWidth, clientW: document.documentElement.clientWidth, hasVScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight };
  });
  console.log(geo, JSON.stringify(m));
}
await b.close();
