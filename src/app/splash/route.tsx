import {ImageResponse} from "next/og";
export const runtime="edge";
export async function GET(){
 return new ImageResponse(<div style={{width:"100%",height:"100%",background:"#0b1424",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#ffffff"}}>
  <div style={{height:240,width:240,borderRadius:62,background:"#183b48",display:"flex",alignItems:"center",justifyContent:"center",fontSize:168,color:"#22dbc2",fontWeight:900}}>C</div>
  <div style={{fontSize:97,fontWeight:800,marginTop:50,letterSpacing:-5}}>carvizo</div>
  <div style={{fontSize:30,color:"#a6c1c8",marginTop:25,letterSpacing:4}}>MA VOITURE, SANS OUBLI</div>
 </div>,{width:1170,height:2532});
}
