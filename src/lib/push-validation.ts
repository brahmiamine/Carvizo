export function validPushEndpoint(value:unknown):value is string {
 if(typeof value!=="string"||value.length>2000)return false;
 try {
  const url=new URL(value);
  return url.protocol==="https:"&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==="443")&&
   (url.hostname==="fcm.googleapis.com"||url.hostname==="updates.push.services.mozilla.com"||url.hostname.endsWith(".push.services.mozilla.com")||url.hostname==="web.push.apple.com"||url.hostname.endsWith(".notify.windows.com"));
 }catch{return false}
}
export function validPushKey(value:unknown,bytes:number):value is string {
 return typeof value==="string"&&/^[A-Za-z0-9_-]+$/.test(value)&&Buffer.from(value,"base64url").length===bytes;
}
