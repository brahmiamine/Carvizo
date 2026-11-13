import {ImageResponse} from "next/og";
import {BrandMark} from "@/components/brand-mark";
export const runtime="nodejs";
export async function GET(){return new ImageResponse(<div style={{width:192,height:192,display:"flex",alignItems:"center",justifyContent:"center",background:"#ffffff"}}><BrandMark width={156} height={156}/></div>,{width:192,height:192});}
