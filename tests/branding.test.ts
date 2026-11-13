import {test} from "node:test";
import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
const read=(file:string)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
test("le premier logo retenu utilise le C bleu nuit et la route turquoise",()=>{
 const svg=read("public/logo.svg");
 assert.match(svg,/M455,161/);
 assert.match(svg,/M444,285/);
 assert.match(svg,/#032758/);
 assert.match(svg,/#04baa9/);
});
test("favicon, PWA, splash et notifications utilisent le même symbole",()=>{
 const icon=read("public/brand-icon.svg");
 const badge=read("public/notification.svg");
 const splash=read("public/splash.svg");
 for(const svg of [icon,badge,splash]){assert.match(svg,/M455,161/);assert.match(svg,/M444,285/)}
 for(const path of ["src/app/icon.tsx","src/app/apple-icon.tsx","src/app/icon-192/route.tsx","src/app/badge/route.tsx","src/app/splash/route.tsx"]){assert.match(read(path),/BrandMark/)}
 assert.match(read("src/components/carvizo-app.tsx"),/src="\/brand-icon.svg"/);
});
