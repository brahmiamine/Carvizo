import {ImageResponse} from "next/og";
export const size={width:512,height:512};
export const contentType="image/png";
export default function Icon(){
 return new ImageResponse(<div style={{width:512,height:512,display:"flex",alignItems:"center",justifyContent:"center",background:"#0c1b2b",borderRadius:116}}>
  <svg width="388" height="388" viewBox="0 0 240 240">
   <path d="M52 130c10-42 36-64 72-64 29 0 50 12 64 36" fill="none" stroke="#20d8bf" strokeWidth="17" strokeLinecap="round"/>
   <path d="m172 77 20 28-36 8" fill="none" stroke="#20d8bf" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
   <path d="M63 151c38 27 80 27 118 0" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round"/>
   <circle cx="72" cy="153" r="10" fill="#20d8bf"/><circle cx="173" cy="153" r="10" fill="#20d8bf"/>
  </svg></div>,size);
}
