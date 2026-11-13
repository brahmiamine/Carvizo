import {defaultOilDue,safeMoneyCents,validateEntry} from "@/lib/metrics";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok,txt,dateValue,positiveInt,decimal} from "@/lib/api";
import {EntryKind,IssueStatus} from "@/generated/prisma/client";
import {ensureBaseline,lockVehicle,closeSupersededPlans,SUPERSEDED_NOTE} from "@/lib/vehicle-events";
import {runReminders} from "@/lib/reminders";
export const runtime="nodejs";
export async function GET(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const url=new URL(request.url),vehicleId=url.searchParams.get("vehicleId");
 if(!vehicleId)return error("Véhicule requis");
 const vehicle=await db.vehicle.findFirst({where:{id:vehicleId,ownerId:user.id}});
 if(!vehicle)return error("Véhicule introuvable",404);
 const cursor=url.searchParams.get("cursor"),limit=Number(url.searchParams.get("limit")??100);
 if(!Number.isInteger(limit)||limit<1||limit>500)return error("Limite invalide");
 if(cursor&&!await db.vehicleEvent.findFirst({where:{id:cursor,vehicleId},select:{id:true}}))return error("Curseur invalide");
 const spendingWhere={vehicleId,OR:[{kind:{notIn:["MAINTENANCE","OIL_CHANGE","REPAIR"] as EntryKind[]}},{status:IssueStatus.RESOLVED}]};
 const monthStart=new Date();monthStart.setUTCDate(1);monthStart.setUTCHours(0,0,0,0);
 const [rows,total,monthly,latestOil,fuelEntries,activePlans]=await Promise.all([
  db.vehicleEvent.findMany({where:{vehicleId},include:{photos:{select:{id:true,mime:true}}},orderBy:[{occurredAt:"desc"},{createdAt:"desc"},{id:"desc"}],take:limit+1,...(cursor?{cursor:{id:cursor},skip:1}:{})}),
  db.vehicleEvent.aggregate({where:spendingWhere,_sum:{amountCents:true}}),
  db.vehicleEvent.aggregate({where:{...spendingWhere,occurredAt:{gte:monthStart,lt:new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,1))}},_sum:{amountCents:true}}),
  db.vehicleEvent.findFirst({where:{vehicleId,kind:"OIL_CHANGE",status:"RESOLVED",OR:[{notes:null},{notes:{not:{startsWith:SUPERSEDED_NOTE}}}]},orderBy:[{occurredAt:"desc"},{createdAt:"desc"},{id:"desc"}]}),
  db.vehicleEvent.findMany({where:{vehicleId,kind:"FUEL"},select:{mileage:true,volumeMl:true,fullTank:true,occurredAt:true},orderBy:[{occurredAt:"asc"},{createdAt:"asc"},{id:"asc"}]}),
  db.vehicleEvent.findMany({where:{vehicleId,kind:{in:["MAINTENANCE","OIL_CHANGE"]},status:{in:["OPEN","IN_PROGRESS"]}},orderBy:{occurredAt:"desc"}})
 ]);
 const hasMore=rows.length>limit,entries=rows.slice(0,limit);
 return ok({entries,hasMore,nextCursor:hasMore?entries.at(-1)!.id:null,totals:{spentCents:total._sum.amountCents??0,monthlyCents:monthly._sum.amountCents??0},latestOil,fuelEntries,activePlans});
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
 if(b.liters!=null&&b.liters!==""&&liters===null)return error("Volume invalide");
 const volumeMl=liters===null?null:Math.round(liters*1000);
 const message=validateEntry({kind,title,mileage,volumeMl,amountCents});if(message)return error(message);
 const occurredAt=b.occurredAt==null?new Date():dateValue(b.occurredAt);if(!occurredAt)return error("Date invalide");
 let nextDueKm=b.nextDueKm==null?null:positiveInt(b.nextDueKm);
 if(b.nextDueKm!=null&&nextDueKm===null)return error("Échéance kilométrique invalide");
 let nextDueAt=b.nextDueAt==null?null:dateValue(b.nextDueAt);
 if(b.nextDueAt!=null&&!nextDueAt)return error("Date d'échéance invalide");
 const s=txt(b.status,20);
 if(s&&!["OPEN","IN_PROGRESS","RESOLVED"].includes(s))return error("Statut invalide");
 const status=(s||"RESOLVED") as IssueStatus;
 const planned=["MAINTENANCE","OIL_CHANGE","REPAIR"].includes(kind)&&status!=="RESOLVED";
 if(txt(b.notes,4000).startsWith("[carvizo:"))return error("Préfixe de note réservé");
 const result=await db.$transaction(async tx=>{
  const locked=await lockVehicle(tx,vehicleId);
  if(kind==="ODOMETER"&&mileage!==null&&mileage<locked.currentKm)return null;
  await ensureBaseline(tx,locked);
  if(kind==="OIL_CHANGE"&&status==="RESOLVED"&&nextDueKm===null&&nextDueAt===null){const d=defaultOilDue(mileage??locked.currentKm,occurredAt);nextDueKm=d.nextDueKm;nextDueAt=d.nextDueAt}
  const created=await tx.vehicleEvent.create({data:{vehicleId,kind:kind as EntryKind,title,notes:txt(b.notes,4000)||null,mileage,amountCents,volumeMl,fullTank:b.fullTank===true,status,occurredAt,nextDueKm,nextDueAt}});
  if(status==="RESOLVED"&&(kind==="MAINTENANCE"||kind==="OIL_CHANGE"))await closeSupersededPlans(tx,{...created,kind});
  // The condition is checked in SQL, so stale clients cannot lower the counter.
  if(mileage!==null&&!planned)await tx.vehicle.updateMany({where:{id:vehicleId,currentKm:{lt:mileage}},data:{currentKm:mileage}});
  if(kind==="ODOMETER")await tx.vehicle.updateMany({where:{id:vehicleId,OR:[{lastOdometerAt:null},{lastOdometerAt:{lt:occurredAt}}]},data:{lastOdometerAt:occurredAt}});
  return created;
 });
 if(!result)return error("Le compteur ne peut pas reculer. Utilise la correction du véhicule.");
 await runReminders({vehicleId}).catch(e=>console.error("Reminders after entry",e));
 return ok({entry:result},201);
}
