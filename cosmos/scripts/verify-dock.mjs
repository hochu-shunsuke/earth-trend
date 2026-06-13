import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 800 });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));

// mirror: bottom dock input
await p.goto("http://localhost:3105/mirror",{waitUntil:"domcontentloaded",timeout:60000});
await new Promise(r=>setTimeout(r,4000));
const dockInput = await p.evaluate(()=>{const d=document.querySelector(".dock input");if(!d)return null;const r=d.getBoundingClientRect();return {y:Math.round(r.y),cx:Math.round(r.x+r.width/2),ph:d.placeholder};});
console.log("mirror dock input:", JSON.stringify(dockInput));
await p.type(".dock input","本当の幸せ"); await p.keyboard.press("Enter");
await new Promise(r=>setTimeout(r,2500));
const expanded = await p.evaluate(()=>document.querySelector(".panel strong")?.textContent ?? "(none)");
console.log("after submit, selected:", expanded);
await p.screenshot({path:"/tmp/dock-mirror.png"});

// globe: select word -> bottom dock with buttons
await p.goto("http://localhost:3105/globe",{waitUntil:"domcontentloaded",timeout:60000});
await new Promise(r=>setTimeout(r,7000));
const tgt = await p.evaluate(()=>{const divs=[...document.querySelectorAll("div")].filter(d=>d.style.textShadow&&d.style.visibility!=="hidden");if(!divs.length)return null;const r=divs[Math.floor(divs.length/2)].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
if(tgt){await p.mouse.click(tgt.x,tgt.y);await new Promise(r=>setTimeout(r,1500));}
const globeDock = await p.evaluate(()=>{const d=document.querySelector(".dock");if(!d)return null;return [...d.querySelectorAll("a, .word")].map(e=>e.textContent);});
console.log("globe dock buttons:", JSON.stringify(globeDock));
await p.screenshot({path:"/tmp/dock-globe.png"});
console.log("ERRORS:", errs.length?errs.join("; "):"(none)");
await b.close();
