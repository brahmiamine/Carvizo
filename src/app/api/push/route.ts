import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok} from "@/lib/api";
import {createHash} from "node:crypto";
export const runtime="nodejs";
export async function POST(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const b=await jsonObject(request);
 const endpoint=b?.endpoint,p256dh=(b?.keys as Record<string,unknown>|undefined)?.p256dh,auth=(b?.keys as Record<string,unknown>|undefined)?.auth;
 if(typeof endpoint!=="string"||endpoint.length>2000||!endpoint.startsWith("https://")||typeof p256dh!=="string"||p256dh.length>255||typeof auth!=="string"||auth.length>255)return error("Abonnement push invalide");
 const endpointHash=createHash("sha256").update(endpoint).digest("hex");
 await db.pushSubscription.upsert({where:{endpointHash},create:{endpointHash,endpoint,p256dh,auth,userId:user.id},update:{endpoint,p256dh,auth,userId:user.id}});
 return ok({success:true});
}
