import {ImageResponse} from "next/og";
export const runtime="edge";
export async function GET(){
 return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",justifyContent:"center",alignItems:"center",background:"#ffffff",color:"#101a28",fontSize:72,fontWeight:900,borderRadius:100}}>C</div>,{width:96,height:96});
}
