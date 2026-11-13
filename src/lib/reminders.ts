import {db} from "@/lib/db";
import {projectOilDues,reminderWindow,shouldAskOdometer,shouldAskTireCheck} from "@/lib/metrics";
import webpush from "web-push";
import {validPushEndpoint} from "@/lib/push-validation";
function configured(){
 const publicKey=process.env.VAPID_PUBLIC_KEY||process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
 if(!publicKey||!privateKey||!subject)return false;
 webpush.setVapidDetails(subject,publicKey,privateKey);return true;
}
async function notify(userId:string,dedupeKey:string,title:string,body:string,push:boolean){
 // Pending delivery stays durable in the dedupe key; the next run retries it.
 const pendingKey=`pending:${dedupeKey}`;
 const delivered=await db.notification.findUnique({where:{userId_dedupeKey:{userId,dedupeKey}}});
 if(delivered)return false;
 let created=false;
 let notification=await db.notification.findUnique({where:{userId_dedupeKey:{userId,dedupeKey:pendingKey}}});
 if(!notification){
  try{notification=await db.notification.create({data:{userId,dedupeKey:pendingKey,title,body}});created=true}
  catch(e){if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return false;throw e}
 }
 let failed=false;
 if(push){
  const subs=await db.pushSubscription.findMany({where:{userId}});
  for(const s of subs){
   if(!validPushEndpoint(s.endpoint)){await db.pushSubscription.deleteMany({where:{id:s.id}});continue}
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body,url:"/?tab=rappels"}),{timeout:10_000,TTL:86400})}
   catch(e){
    if(e&&typeof e==="object"&&"statusCode" in e&&[404,410].includes(Number(e.statusCode)))await db.pushSubscription.deleteMany({where:{id:s.id}});
    else failed=true;
   }
  }
 }
 if(!failed){
  try{await db.notification.update({where:{id:notification.id},data:{dedupeKey}})}
  catch(e){
   // Another evaluation can finish between our lookup and pending creation.
   // Keep its finalized notification and remove our redundant pending row.
   if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")await db.notification.deleteMany({where:{id:notification.id,dedupeKey:pendingKey}});
   else if(!(e&&typeof e==="object"&&"code" in e&&e.code==="P2025"))throw e;
  }
 }
 return created;
}
export async function runReminders(options:{vehicleId?:string;now?:Date}={}){
 const now=options.now??new Date(),month=now.toISOString().slice(0,7),push=configured();
 let created=0,processed=0,cursor:string|undefined;
 // Batch the job without silently omitting vehicles after a fixed global limit.
 for(;;){
  const vehicles=await db.vehicle.findMany({where:options.vehicleId?{id:options.vehicleId}:{},take:100,orderBy:{id:"asc"},...(cursor?{cursor:{id:cursor},skip:1}:{}),include:{events:{where:{OR:[{kind:"MAINTENANCE",OR:[{nextDueAt:{not:null}},{nextDueKm:{not:null}}]},{kind:{in:["TIRE","OIL_CHANGE"]}}]},select:{id:true,kind:true,title:true,status:true,mileage:true,occurredAt:true,createdAt:true,notes:true,nextDueAt:true,nextDueKm:true}}}});
  if(!vehicles.length)break;
  for(const vehicle of vehicles){
   processed++;
   if(shouldAskOdometer(vehicle.lastOdometerAt,now)&&await notify(vehicle.ownerId,`odometer:${vehicle.id}:${month}`,"Mets à jour ton compteur",`Combien de kilomètres affiche ta ${vehicle.make} ${vehicle.model} ?`,push))created++;
   const lastTire=vehicle.events.filter(e=>e.kind==="TIRE"&&e.status==="RESOLVED").sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime())[0];
   if(shouldAskTireCheck(lastTire?.occurredAt??null,now)&&await notify(vehicle.ownerId,`tire:${vehicle.id}:${month}`,"Contrôle de la pression des pneus",`Pense à vérifier la pression des pneus de ta ${vehicle.make} ${vehicle.model} à froid.`,push))created++;
   const lastOil=vehicle.events.filter(e=>e.kind==="OIL_CHANGE"&&e.status==="RESOLVED"&&!e.notes?.startsWith("[carvizo:superseded]")).sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime()||b.createdAt.getTime()-a.createdAt.getTime())[0];
   if(lastOil){
    const byDate=lastOil.nextDueAt!==null&&lastOil.nextDueAt.getTime()<=now.getTime()+30*86400000;
    const remaining=lastOil.nextDueKm===null?null:lastOil.nextDueKm-vehicle.currentKm;
    const version=`${lastOil.id}:${lastOil.nextDueKm??"none"}:${lastOil.nextDueAt?.getTime()??"none"}`;
    if(remaining!==null){
     const stage=remaining<=0?"late":remaining<=500?"500":remaining<=2000?"2000":null;
     if(stage){
      const next3=projectOilDues(lastOil.mileage,lastOil.nextDueKm,vehicle.currentKm).map(k=>k.toLocaleString("fr-FR")).join(" · ");
      const msg=remaining<=0?`Vidange dépassée de ${-remaining} km (échéance ${lastOil.nextDueKm} km).`:`Vidange dans ${remaining} km (à ${lastOil.nextDueKm} km).`;
      if(await notify(vehicle.ownerId,`oil:${version}:${stage}`,remaining<=0?"Vidange en retard":"Vidange bientôt",`${vehicle.make} ${vehicle.model} · ${msg} Prochaines : ${next3} km`,push))created++;
     }
    }
    if(byDate&&await notify(vehicle.ownerId,`oil:${version}:date`,"Vidange à prévoir",`${vehicle.make} ${vehicle.model} · Échéance le ${lastOil.nextDueAt!.toLocaleDateString("fr-FR")}`,push))created++;
   }
   for(const e of vehicle.events){
    if(!["MAINTENANCE","OIL_CHANGE"].includes(e.kind)||e.status==="RESOLVED")continue;
    const byDate=e.nextDueAt!==null&&e.nextDueAt.getTime()<=now.getTime()+30*86400000;
    const byKm=e.nextDueKm!==null&&reminderWindow(vehicle.currentKm,e.nextDueKm);
    if(byDate||byKm){
     const hint=byKm?`Échéance à ${e.nextDueKm} km`:`Échéance le ${e.nextDueAt!.toLocaleDateString("fr-FR")}`;
     // A postponed plan receives a fresh reminder when its new due date arrives.
     if(await notify(vehicle.ownerId,`service:${e.id}:${e.nextDueKm??"none"}:${e.nextDueAt?.getTime()??"none"}`,`Entretien à prévoir : ${e.title}`,`${vehicle.make} ${vehicle.model} · ${hint}`,push))created++;
    }
   }
  }
  if(vehicles.length<100)break;cursor=vehicles.at(-1)!.id;
 }
 return {processed,created,notificationsPushConfigured:push};
}
