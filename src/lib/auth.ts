import {cookies} from "next/headers";
import {randomBytes} from "node:crypto";
import {db} from "@/lib/db";
import {tokenHash} from "@/lib/password";
export {hashPassword,verifyPassword,tokenHash} from "@/lib/password";
const cookieName="carvizo_session";
const DAYS=30;
export async function currentUser(){
 const token=(await cookies()).get(cookieName)?.value;
 if(!token)return null;
 const session=await db.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:{select:{id:true,name:true,email:true,createdAt:true}}}});
 return session&&session.expiresAt>new Date()?session.user:null;
}
export async function startSession(userId:string){
 const token=randomBytes(32).toString("hex");
 const expiresAt=new Date(Date.now()+DAYS*86400000);
 await db.session.create({data:{userId,tokenHash:tokenHash(token),expiresAt}});
 (await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production"||process.env.SESSION_COOKIE_SECURE==="true",sameSite:"lax",path:"/",expires:expiresAt});
}
export async function endSession(){
 const jar=await cookies(),token=jar.get(cookieName)?.value;
 if(token)await db.session.deleteMany({where:{tokenHash:tokenHash(token)}});
 jar.delete(cookieName);
}
