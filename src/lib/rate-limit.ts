// Application-local protection. A shared ingress limiter is also needed for multiple replicas.
const buckets=new Map<string,{count:number;until:number}>();
export function allowAttempt(key:string,limit=10,windowMs=15*60_000,now=Date.now()):boolean {
 for(const [name,bucket] of buckets)if(bucket.until<=now)buckets.delete(name);
 const bucket=buckets.get(key);
 if(bucket){if(bucket.count>=limit)return false;bucket.count++;return true}
 // Bound memory even if a client continually sends different account names.
 if(buckets.size>=10_000)return false;
 buckets.set(key,{count:1,until:now+windowMs});return true;
}
export function requestAddress(request:Request){
 // Only trust this header when a reverse proxy overwrites it.
 return process.env.TRUST_PROXY==="true"?(request.headers.get("x-forwarded-for")?.split(",")[0].trim()||"unknown"):"local";
}
