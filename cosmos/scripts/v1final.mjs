import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage(); await p.setViewport({ width: 1300, height: 850 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
// theme options present + default system
await p.evaluateOnNewDocument(()=>{try{localStorage.removeItem("theme");}catch(e){}});
await p.goto("http://localhost:3193/mirror",{waitUntil:"domcontentloaded",timeout:60000});
await new Promise(r=>setTimeout(r,2500));
const themeOpts = await p.evaluate(()=>{const s=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>o.value==="system"));return s?{value:s.value,opts:[...s.options].map(o=>o.value)}:null;});
console.log("theme select:", JSON.stringify(themeOpts));
const dataTheme = await p.evaluate(()=>document.documentElement.dataset.theme);
console.log("default data-theme (OS-resolved):", dataTheme);
// label has NO bg box: add a question and screenshot
await p.type(".dock input","なぜ私は"); await p.keyboard.press("Enter"); await new Promise(r=>setTimeout(r,2000));
await p.screenshot({path:"/tmp/labels-nobg.png"});
console.log("ERRORS:", errs.length?errs.join("; "):"(none)");
await b.close();
