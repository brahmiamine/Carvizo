import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok,txt} from "@/lib/api";
import {IssueStatus} from "@/generated/prisma/client";
export const runtime="nodejs";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const id=(await params).id;
 const found=await db.vehicleEvent.findFirst({where:{id,vehicle:{ownerId:user.id}}});
 if(!found)return error("Opération introuvable",404);
 const b=await jsonObject(request);if(!b)return error("JSON invalide");
 const data:{status?:IssueStatus;notes?:string|null;title?:string}={};
 if("status" in b){
  if(found.kind!=="ISSUE"||!["OPEN","IN_PROGRESS","RESOLVED"].includes(String(b.status)))return error("Statut invalide");
  data.status=b.status as IssueStatus;
 }
 if("notes" in b)data.notes=txt(b.notes,4000)||null;
 if("title" in b){data.title=txt(b.title,180);if(!data.title)return error("Titre obligatoire")}
 return ok({entry:await db.vehicleEvent.update({where:{id},data})});
}
export async function DELETE(_req:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const id=(await params).id;
 const found=await db.vehicleEvent.findFirst({where:{id,vehicle:{ownerId:user.id}},include:{photos:{select:{storageKey:true}}}});
 if(!found)return error("Opération introuvable",404);
 await db.vehicleEvent.delete({where:{id}});
 const {removePhoto}=await import("@/lib/photos");
 await Promise.allSettled(found.photos.map(p=>removePhoto(p.storageKey)));
 return ok({success:true});
}
