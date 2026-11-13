import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
 return {name:"Carvizo · Mon garage",short_name:"Carvizo",description:"Entretiens, carburant, dépenses et rappels pour votre voiture",id:"/",start_url:"/",display:"standalone",background_color:"#0c1b2b",theme_color:"#0c1b2b",lang:"fr",icons:[{src:"/icon",sizes:"512x512",type:"image/png",purpose:"any"},{src:"/icon",sizes:"512x512",type:"image/png",purpose:"maskable"}]};
}
