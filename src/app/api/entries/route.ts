import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok,txt,dateValue,positiveInt,decimal} from "@/lib/api";
import {safeMoneyCents,validateEntry} from "@/lib/metrics";
import {EntryKind,IssueStatus} from "@/generated/prisma/client";
export const runtime="nodejs";
export async function GET(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const url=new URL(request.url),vehicleId=url.searchParams.get("vehicleId");
 if(!vehicleId)return error("Véhicule requis");
 const vehicle=await db.vehicle.findFirst({where:{id:vehicleId,ownerId:user.id}});
 if(!vehicle)return error("Véhicule introuvable",404);
 const entries=await db.vehicleEvent.findMany({where:{vehicleId},include:{photos:{select:{id:true,mime:true}}},orderBy:[{occurredAt:"desc"},{createdAt:"desc"}],take:500});
 return ok({entries});
}
export async function POST(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const b=await jsonObject(request);if(!b)return error("JSON invalide");
 const vehicleId=txt(b.vehicleId,36);
 const vehicle=await db.vehicle.findFirst({where:{id:vehicleId,ownerId:user.id}});
 if(!vehicle)return error("Véhicule introuvable",404);
 const kind=txt(b.kind,30),title=txt(b.title,180);
 const mileage=b.mileage==null?null:positiveInt(b.mileage);
 if(b.mileage!=null&&mileage===null)return error("Kilométrage invalide");
 const amount=b.amount==null||b.amount===""?null:decimal(b.amount);
 if(b.amount!=null&&b.amount!==""&&amount===null)return error("Montant invalide");
 const amountCents=amount===null?null:safeMoneyCents(amount);
 if(amount!==null&&amountCents===null)return error("Montant hors limites");
 const liters=b.liters==null||b.liters===""?null:decimal(b.liters);
 const volumeMl=liters===null?null:Math.round(liters*1000);
 const message=validateEntry({kind,title,mileage,volumeMl,amountCents});
 if(message)return error(message);
 if(mileage!==null&&mileage<vehicle.currentKm&&kind==="ODOMETER")return error("Le compteur ne peut pas reculer.");
 const occurredAt=b.occurredAt==null?new Date():dateValue(b.occurredAt);
 if(!occurredAt)return error("Date invalide");
 const nextDueKm=b.nextDueKm==null?null:positiveInt(b.nextDueKm);
 if(b.nextDueKm!=null&&nextDueKm===null)return error("Échéance kilométrique invalide");
 const nextDueAt=b.nextDueAt==null?null:dateValue(b.nextDueAt);
 if(b.nextDueAt!=null&&!nextDueAt)return error("Date d'échéance invalide");
 const s=txt(b.status,20);
 const status=(["OPEN","IN_PROGRESS","RESOLVED"].includes(s)?s:"RESOLVED") as IssueStatus;
 const entry=await db.$transaction(async tx=>{
  const created=await tx.vehicleEvent.create({data:{vehicleId,kind:kind as EntryKind,title,notes:txt(b.notes,4000)||null,mileage,amountCents,volumeMl,fullTank:b.fullTank===true,status,occurredAt,nextDueKm,nextDueAt}});
  if(mileage!==null&&mileage>vehicle.currentKm)await tx.vehicle.update({where:{id:vehicleId},data:{currentKm:mileage,lastOdometerAt:kind==="ODOMETER"?occurredAt:vehicle.lastOdometerAt}});
  else if(kind==="ODOMETER")await tx.vehicle.update({where:{id:vehicleId},data:{lastOdometerAt:occurredAt}});
  return created;
 });
 return ok({entry},201);
}
