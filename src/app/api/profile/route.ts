import {db} from "@/lib/db";
import {currentUser,verifyPassword,endSession} from "@/lib/auth";
import {error,jsonObject,ok} from "@/lib/api";
import {removePhoto} from "@/lib/photos";
export const runtime="nodejs";
export async function GET(){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const vehicles=await db.vehicle.findMany({where:{ownerId:user.id},include:{events:true,photos:{select:{id:true,eventId:true,mime:true,createdAt:true}}}});
 return new Response(JSON.stringify({exportedAt:new Date().toISOString(),user,vehicles}),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="carvizo-export.json"',"Cache-Control":"no-store"}});
}
export async function DELETE(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const b=await jsonObject(request);if(typeof b?.password!=="string")return error("Mot de passe requis");
 const record=await db.user.findUnique({where:{id:user.id}});
 if(!record||!verifyPassword(b.password,record.passwordHash))return error("Mot de passe incorrect",403);
 const photos=await db.photo.findMany({where:{vehicle:{ownerId:user.id}},select:{storageKey:true}});
 await db.user.delete({where:{id:user.id}});
 await Promise.allSettled(photos.map(p=>removePhoto(p.storageKey)));
 await endSession();
 return ok({success:true});
}
