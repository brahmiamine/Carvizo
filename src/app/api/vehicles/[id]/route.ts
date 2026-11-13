import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok,txt,decimal} from "@/lib/api";
export const runtime="nodejs";
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const vehicle=await db.vehicle.findFirst({where:{id:(await params).id,ownerId:user.id},include:{photos:{where:{eventId:null},orderBy:{createdAt:"desc"},take:1}}});
 return vehicle?ok({vehicle}):error("Véhicule introuvable",404);
}
export async function PATCH(request:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const id=(await params).id;const vehicle=await db.vehicle.findFirst({where:{id,ownerId:user.id}});
 if(!vehicle)return error("Véhicule introuvable",404);
 const b=await jsonObject(request);if(!b)return error("JSON invalide");
 const data:{name?:string|null;registration?:string|null;frontPressureBar?:number|null;rearPressureBar?:number|null}={};
 if("name" in b)data.name=txt(b.name,100)||null;
 if("registration" in b)data.registration=txt(b.registration,32)||null;
 for(const k of ["frontPressureBar","rearPressureBar"] as const){
  if(k in b){const value=b[k]==null?null:decimal(b[k]);if(value!==null&&(value<0.5||value>6))return error("Pression invalide");data[k]=value}
 }
 return ok({vehicle:await db.vehicle.update({where:{id},data})});
}
export async function DELETE(_request:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const id=(await params).id;const found=await db.vehicle.findFirst({where:{id,ownerId:user.id}});
 if(!found)return error("Véhicule introuvable",404);
 // Les fichiers privés sont purgés après la suppression.
 const photos=await db.photo.findMany({where:{vehicleId:id},select:{storageKey:true}});
 await db.vehicle.delete({where:{id}});
 const {removePhoto}=await import("@/lib/photos");
 await Promise.allSettled(photos.map(p=>removePhoto(p.storageKey)));
 return ok({success:true});
}
