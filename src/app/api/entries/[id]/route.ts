import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok,txt,positiveInt,decimal,dateValue} from "@/lib/api";
import {safeMoneyCents,validateEntry} from "@/lib/metrics";
import {IssueStatus,Prisma} from "@/generated/prisma/client";
import {BASELINE_NOTE,CORRECTION_NOTE,ensureBaseline,lockVehicle,recalculateMileage,closeSupersededPlans,SUPERSEDED_NOTE} from "@/lib/vehicle-events";
import {runReminders} from "@/lib/reminders";
export const runtime="nodejs";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const id=(await params).id;
 const found=await db.vehicleEvent.findFirst({where:{id,vehicle:{ownerId:user.id}}});
 if(!found)return error("Opération introuvable",404);
 if(found.notes?.startsWith(BASELINE_NOTE)||found.notes?.startsWith(CORRECTION_NOTE))return error("Corrige ce kilométrage depuis les paramètres du véhicule.");
 const b=await jsonObject(request);if(!b)return error("JSON invalide");
 const data:Prisma.VehicleEventUpdateInput={};
 if("status" in b){
  if(!["OPEN","IN_PROGRESS","RESOLVED"].includes(String(b.status))||(!["ISSUE","MAINTENANCE","OIL_CHANGE","REPAIR"].includes(found.kind)&&b.status!=="RESOLVED"))return error("Statut invalide");
  data.status=b.status as IssueStatus;
 }
 if("notes" in b){data.notes=txt(b.notes,4000)||null;if(data.notes?.startsWith("[carvizo:"))return error("Préfixe de note réservé")}
 if("title" in b){data.title=txt(b.title,180);if(!data.title)return error("Titre obligatoire")}
 for(const key of ["mileage","nextDueKm"] as const){
  if(key in b){const value=b[key]==null||b[key]===""?null:positiveInt(b[key]);if(b[key]!=null&&b[key]!==""&&value===null)return error("Kilométrage invalide");data[key]=value}
 }
 for(const key of ["occurredAt","nextDueAt"] as const){
  if(key in b){const value=dateValue(b[key]);if((key==="occurredAt"||b[key]!=null&&b[key]!=="")&&!value)return error("Date invalide");if(key==="occurredAt")data.occurredAt=value!;else data.nextDueAt=value}
 }
 if("amount" in b){const amount=b.amount==null||b.amount===""?null:decimal(b.amount);if(b.amount!=null&&b.amount!==""&&amount===null)return error("Montant invalide");data.amountCents=amount===null?null:safeMoneyCents(amount);if(amount!==null&&data.amountCents===null)return error("Montant hors limites")}
 if("liters" in b){const liters=b.liters==null||b.liters===""?null:decimal(b.liters);if(b.liters!=null&&b.liters!==""&&liters===null)return error("Volume invalide");data.volumeMl=liters===null?null:Math.round(liters*1000)}
 if("fullTank" in b){if(typeof b.fullTank!=="boolean")return error("Plein invalide");data.fullTank=b.fullTank}
 const message=validateEntry({kind:found.kind,title:typeof data.title==="string"?data.title:found.title,mileage:"mileage" in data?data.mileage as number|null:found.mileage,volumeMl:"volumeMl" in data?data.volumeMl as number|null:found.volumeMl,amountCents:"amountCents" in data?data.amountCents as number|null:found.amountCents});if(message)return error(message);
 const entry=await db.$transaction(async tx=>{
  const vehicle=await lockVehicle(tx,found.vehicleId);await ensureBaseline(tx,vehicle);
  const updated=await tx.vehicleEvent.update({where:{id},data});
  if(updated.status==="RESOLVED"&&(updated.kind==="MAINTENANCE"||updated.kind==="OIL_CHANGE"))await closeSupersededPlans(tx,{...updated,kind:updated.kind});
  await recalculateMileage(tx,found.vehicleId);return updated;
 });
 await runReminders({vehicleId:found.vehicleId}).catch(e=>console.error("Reminders after entry correction",e));
 return ok({entry});
}
export async function DELETE(_req:Request,{params}:Ctx){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const id=(await params).id;
 const found=await db.vehicleEvent.findFirst({where:{id,vehicle:{ownerId:user.id}},include:{photos:{select:{storageKey:true}}}});
 if(!found)return error("Opération introuvable",404);
 if(found.notes?.startsWith(BASELINE_NOTE)||found.notes?.startsWith(CORRECTION_NOTE))return error("Le relevé initial et les corrections sont conservés. Corrige le compteur depuis le véhicule.");
 await db.$transaction(async tx=>{const vehicle=await lockVehicle(tx,found.vehicleId);await ensureBaseline(tx,vehicle);await tx.vehicleEvent.delete({where:{id}});await recalculateMileage(tx,found.vehicleId)});
 const {removePhoto}=await import("@/lib/photos");
 await Promise.allSettled(found.photos.map(p=>removePhoto(p.storageKey)));
 return ok({success:true});
}
