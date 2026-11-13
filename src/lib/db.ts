import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const globalDb=globalThis as unknown as {db?:PrismaClient};
function initDb(){
  const raw=process.env.DATABASE_URL;
  if(!raw)throw new Error("DATABASE_URL manquante");
  const url=new URL(raw);
  const adapter=new PrismaMariaDb({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),connectionLimit:5});
  return new PrismaClient({adapter});
}
export const db=globalDb.db??initDb();
if(process.env.NODE_ENV!=="production")globalDb.db=db;
