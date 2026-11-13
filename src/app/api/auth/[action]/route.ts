import {currentUser,endSession,hashPassword,startSession,verifyPassword} from "@/lib/auth";
import {db} from "@/lib/db";
import {error,jsonObject,ok,txt} from "@/lib/api";
export const runtime="nodejs";
type Ctx={params:Promise<{action:string}>};
export async function GET(_req:Request,{params}:Ctx){
 if((await params).action!=="me")return error("Action inconnue",404);
 const user=await currentUser();return user?ok({user}):error("Non connecté",401);
}
export async function POST(request:Request,{params}:Ctx){
 const action=(await params).action;
 if(action==="logout"){await endSession();return ok({success:true})}
 if(action!=="signup"&&action!=="login")return error("Action inconnue",404);
 const body=await jsonObject(request);if(!body)return error("JSON invalide");
 const email=txt(body.email,255).toLowerCase(),password=typeof body.password==="string"?body.password:"";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128)return error("E-mail invalide ou mot de passe trop court (10 caractères minimum).");
 if(action==="signup"){
  const name=txt(body.name,100);
  if(!name)return error("Renseigne ton nom.");
  if(await db.user.findUnique({where:{email}}))return error("Cette adresse est déjà utilisée.",409);
  try {
   const user=await db.user.create({data:{email,name,passwordHash:hashPassword(password)}});
   await startSession(user.id);return ok({user:{id:user.id,email:user.email,name:user.name}},201);
  }catch{return error("Inscription indisponible. Réessaie.",500)}
 }
 const user=await db.user.findUnique({where:{email}});
 if(!user||!verifyPassword(password,user.passwordHash))return error("Identifiants incorrects.",401);
 await startSession(user.id);return ok({user:{id:user.id,email:user.email,name:user.name}});
}
