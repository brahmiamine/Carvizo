import {db} from "@/lib/db";
import {error,ok} from "@/lib/api";
import {reminderWindow,shouldAskOdometer,shouldAskTireCheck} from "@/lib/metrics";
import webpush from "web-push";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function configured(){
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
 if(!publicKey||!privateKey||!subject)return false;
 webpush.setVapidDetails(subject,publicKey,privateKey);return true;
}
async function notify(userId:string,dedupeKey:string,title:string,body:string,push:boolean){
 try{
  await db.notification.create({data:{userId,dedupeKey,title,body}});
 }catch(e){
  // Unique constraint: l'alerte a déjà été créée. Les autres erreurs remontent.
  if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return false;
  throw e;
 }
 if(push){
  const subs=await db.pushSubscription.findMany({where:{userId}});
  for(const s of subs){
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body,url:"/?tab=rappels"}))}
   catch(e){if(e&&typeof e==="object"&&"statusCode" in e&&[404,410].includes(Number(e.statusCode)))await db.pushSubscription.delete({where:{id:s.id}})}
  }
 }
 return true;
}
export async function POST(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<24)return error("Cron non configuré",503);
 if(request.headers.get("authorization")!==`Bearer ${secret}`)return error("Non autorisé",401);
 const now=new Date(),month=now.toISOString().slice(0,7),push=configured();
 const vehicles=await db.vehicle.findMany({take:1000,include:{events:{where:{OR:[{kind:{in:["MAINTENANCE","OIL_CHANGE"]},OR:[{nextDueAt:{not:null}},{nextDueKm:{not:null}}]},{kind:"TIRE"}]},select:{id:true,kind:true,title:true,occurredAt:true,nextDueAt:true,nextDueKm:true}}}});
 let created=0;
 for(const vehicle of vehicles){
  if(shouldAskOdometer(vehicle.lastOdometerAt,now)){
   if(await notify(vehicle.ownerId,`odometer:${vehicle.id}:${month}`,"Mets à jour ton compteur",`Combien de kilomètres affiche ta ${vehicle.make} ${vehicle.model} ?`,push))created++;
  }
  const lastTire=vehicle.events.filter(e=>e.kind==="TIRE").sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime())[0];
  if(shouldAskTireCheck(lastTire?.occurredAt??null,now)){
   if(await notify(vehicle.ownerId,`tire:${vehicle.id}:${month}`,"Contrôle de la pression des pneus",`Pense à vérifier la pression des pneus de ta ${vehicle.make} ${vehicle.model} à froid.`,push))created++;
  }
  const lastOil=vehicle.events.filter(e=>e.kind==="OIL_CHANGE").sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime())[0];
  if(lastOil){
   const byDate=lastOil.nextDueAt!==null&&lastOil.nextDueAt.getTime()<=now.getTime()+30*86400000;
   const byKm=lastOil.nextDueKm!==null&&reminderWindow(vehicle.currentKm,lastOil.nextDueKm,1000);
   if(byDate||byKm){
    const hint=byKm?`Échéance à ${lastOil.nextDueKm} km (actuel : ${vehicle.currentKm} km)`:`Échéance le ${lastOil.nextDueAt!.toLocaleDateString("fr-FR")}`;
    if(await notify(vehicle.ownerId,`oil:${lastOil.id}`,"Vidange à prévoir",`${vehicle.make} ${vehicle.model} · ${hint}`,push))created++;
   }
  }
  for(const e of vehicle.events){
   if(e.kind!=="MAINTENANCE")continue;
   const byDate=e.nextDueAt!==null&&e.nextDueAt.getTime()<=now.getTime()+30*86400000;
   const byKm=e.nextDueKm!==null&&reminderWindow(vehicle.currentKm,e.nextDueKm);
   if(byDate||byKm){
    const hint=byKm?`Échéance à ${e.nextDueKm} km`:`Échéance le ${e.nextDueAt!.toLocaleDateString("fr-FR")}`;
    if(await notify(vehicle.ownerId,`service:${e.id}`,`Entretien à prévoir : ${e.title}`,`${vehicle.make} ${vehicle.model} · ${hint}`,push))created++;
   }
  }
 }
 return ok({processed:vehicles.length,created,notificationsPushConfigured:push});
}
