import {mkdir,readFile,unlink,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {randomUUID} from "node:crypto";
const directory=resolve(process.env.STORAGE_DIR??"./data/uploads");
export function pathFor(key:string){if(!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(key))throw Error("Clé invalide");return join(directory,key)}
export async function savePhoto(bytes:Uint8Array,mime:string){
 const extension=mime==="application/pdf"?"pdf":mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
 const key=randomUUID()+"."+extension;
 await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(pathFor(key),bytes,{flag:"wx",mode:0o600});
 return key;
}
export async function loadPhoto(key:string){return readFile(pathFor(key))}
export async function removePhoto(key:string){try{await unlink(pathFor(key))}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}}
export function detectedMime(data:Uint8Array){
 if(data.length>=5&&String.fromCharCode(...data.slice(0,5))==="%PDF-")return "application/pdf";
 if(data.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>data[i]===b))return "image/png";
 if(data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255)return "image/jpeg";
 if(data.length>=12&&String.fromCharCode(...data.slice(0,4))==="RIFF"&&String.fromCharCode(...data.slice(8,12))==="WEBP")return "image/webp";
 return null;
}
