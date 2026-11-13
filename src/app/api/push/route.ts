import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok} from "@/lib/api";
import {validPushEndpoint,validPushKey} from "@/lib/push-validation";
import {createHash} from "node:crypto";
export const runtime="nodejs";
export async function GET(){
 const publicKey=process.env.VAPID_PUBLIC_KEY||process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||"";
 const enabled=!!publicKey&&!!process.env.VAPID_PRIVATE_KEY&&!!process.env.VAPID_SUBJECT;
 return ok({publicKey:enabled?publicKey:null,enabled});
}
export async function POST(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const b=await jsonObject(request);
 const endpoint=b?.endpoint,p256dh=(b?.keys as Record<string,unknown>|undefined)?.p256dh,auth=(b?.keys as Record<string,unknown>|undefined)?.auth;
 if(!validPushEndpoint(endpoint)||!validPushKey(p256dh,65)||!validPushKey(auth,16))return error("Abonnement push invalide");
 const endpointHash=createHash("sha256").update(endpoint).digest("hex");
 await db.pushSubscription.upsert({where:{endpointHash},create:{endpointHash,endpoint,p256dh,auth,userId:user.id},update:{endpoint,p256dh,auth,userId:user.id}});
 return ok({success:true});
}
export async function DELETE(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const b=await jsonObject(request);
 if(typeof b?.endpoint!=="string")return error("Abonnement requis");
 const endpointHash=createHash("sha256").update(b.endpoint).digest("hex");
 await db.pushSubscription.deleteMany({where:{endpointHash,userId:user.id}});
 return ok({success:true});
}
