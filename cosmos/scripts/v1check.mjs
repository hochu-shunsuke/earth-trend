import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://localhost:3191/mirror",{waitUntil:"domcontentloaded",timeout:60000});
await new Promise(r=>setTimeout(r,3000));
const empty = await p.evaluate(()=>[...document.querySelectorAll("p")].some(e=>e.textContent.includes("自分の地図を作って")));
console.log("empty-state hint shown:", empty);
// 2つ問いを入れて近さ確認
await p.type(".dock input","なぜ私は"); await p.keyboard.press("Enter"); await new Promise(r=>setTimeout(r,1800));
await p.type(".dock input","どうすれば幸せ"); await p.keyboard.press("Enter"); await new Promise(r=>setTimeout(r,2200));
await p.screenshot({path:"/tmp/v1-mirror.png"});
console.log("ERRORS:", errs.length?errs.join("; "):"(none)");
await b.close();
