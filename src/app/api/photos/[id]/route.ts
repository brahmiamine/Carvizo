import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error} from "@/lib/api";
import {loadPhoto} from "@/lib/photos";
export const runtime="nodejs";
type Ctx={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const photo=await db.photo.findFirst({where:{id:(await params).id,vehicle:{ownerId:user.id}}});
 if(!photo)return error("Image introuvable",404);
 try{
  const image=await loadPhoto(photo.storageKey);
  return new Response(new Uint8Array(image),{headers:{"Content-Type":photo.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",...(photo.mime==="application/pdf"?{"Content-Disposition":'attachment; filename="facture.pdf"'}:{})}});
 }catch{return error("Image indisponible",404)}
}
