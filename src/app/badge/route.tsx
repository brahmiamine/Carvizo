import {ImageResponse} from "next/og";
import {BrandMark} from "@/components/brand-mark";
export const runtime="nodejs";
export async function GET(){return new ImageResponse(<div style={{width:96,height:96,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent"}}><BrandMark width={92} height={92} monochrome/></div>,{width:96,height:96});}
