import {navyPath,tealPath} from "@/lib/brand-shapes";
/** Symbole Carvizo pour les icônes, les notifications et les écrans de lancement. */
export function BrandMark({width=320,height=320,monochrome=false}:{width?:number;height?:number;monochrome?:boolean}){
 return <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="143 96 356 355" aria-hidden="true">
  <path fill={monochrome?"#ffffff":"#032758"} fillRule="evenodd" d={navyPath}/>
  <path fill={monochrome?"#ffffff":"#04baa9"} fillRule="evenodd" d={tealPath}/>
 </svg>;
}
