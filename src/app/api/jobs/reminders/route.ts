import {error,ok} from "@/lib/api";
import {runReminders} from "@/lib/reminders";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<24)return error("Cron non configuré",503);
 if(request.headers.get("authorization")!==`Bearer ${secret}`)return error("Non autorisé",401);
 return ok(await runReminders());
}
