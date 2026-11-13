import {randomBytes,scrypt,timingSafeEqual,createHash} from "node:crypto";
import {promisify} from "node:util";
const derive=promisify(scrypt);
export async function hashPassword(password:string):Promise<string> {
 const salt=randomBytes(16).toString("hex");
 const hash=await derive(password,salt,64) as Buffer;
 return `scrypt$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(password:string,stored:string):Promise<boolean> {
 const parts=stored.split("$");
 if(parts.length!==3||parts[0]!=="scrypt"||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{128}$/.test(parts[2]))return false;
 const actual=await derive(password,parts[1],64) as Buffer,expected=Buffer.from(parts[2],"hex");
 return timingSafeEqual(expected,actual);
}
export function tokenHash(raw:string){return createHash("sha256").update(raw).digest("hex")}
export function newRecoveryCode(){return randomBytes(24).toString("hex").match(/.{8}/g)!.join("-")}
export function recoveryHash(raw:string){return tokenHash(raw.trim().toLowerCase().replace(/-/g,""))}
