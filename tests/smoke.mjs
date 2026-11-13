import {test} from "node:test";
import {strict as assert} from "node:assert";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";

const origin="http://127.0.0.1:3456";
async function request(path,{method="GET",cookie="",body,form,headers={}}={}){
 const options={method,headers:{...headers},redirect:"manual"};
 if(cookie)options.headers.Cookie=cookie;
 if(body!==undefined){options.headers["Content-Type"]="application/json";options.body=JSON.stringify(body)}
 if(form)options.body=form;
 const response=await fetch(origin+path,options);
 let data;try{data=await response.clone().json()}catch{data={text:await response.text()}}
 return {response,data};
}
test("Parcours public : compte, véhicules, incidents, photos privées, rappels",async()=>{
 let logs="";
 const server=spawn(process.execPath,[".next/standalone/server.js"],{
  env:{...process.env,PORT:"3456",HOSTNAME:"127.0.0.1",NODE_ENV:"production"},
  stdio:["ignore","pipe","pipe"]
 });
 server.stdout.on("data",d=>logs+=d.toString().slice(0,2000));
 server.stderr.on("data",d=>logs+=d.toString().slice(0,2000));
 try{
  let ready=false;
  for(let i=0;i<75;i++){
   try{const r=await fetch(origin+"/");if(r.status===200){ready=true;break}}catch{}
   if(server.exitCode!==null)break;
   await new Promise(r=>setTimeout(r,300));
  }
  assert.ok(ready,"Next.js ne démarre pas : "+logs.slice(-1500));
  const emailA="a-"+randomUUID()+"@example.test";
  const a=await request("/api/auth/signup",{method:"POST",body:{name:"Alice",email:emailA,password:"MotDePasseLong!2026"}});
  assert.equal(a.response.status,201,JSON.stringify(a.data));
  const cookieA=a.response.headers.get("set-cookie")?.split(";")[0]||"";
  assert.ok(cookieA.startsWith("carvizo_session="),"cookie de session absent");
  const missing=await request("/api/vehicles");
  assert.equal(missing.response.status,401);
  const vehicle=await request("/api/vehicles",{method:"POST",cookie:cookieA,body:{make:"Skoda",model:"Fabia",year:2018,currentKm:25000,frontPressureBar:2.2,rearPressureBar:2.1}});
  assert.equal(vehicle.response.status,201,JSON.stringify(vehicle.data));
  const vehicleId=vehicle.data.vehicle.id;
  const negative=await request("/api/entries",{method:"POST",cookie:cookieA,body:{vehicleId,kind:"ODOMETER",title:"Compteur",mileage:24999}});
  assert.equal(negative.response.status,400);
  const issue=await request("/api/entries",{method:"POST",cookie:cookieA,body:{vehicleId,kind:"ISSUE",title:"Rayure sur portière",status:"OPEN",notes:"À réparer",mileage:25000}});
  assert.equal(issue.response.status,201,JSON.stringify(issue.data));
  const issueId=issue.data.entry.id;
  const form=new FormData();
  form.set("vehicleId",vehicleId);
  form.set("eventId",issueId);
  form.set("file",new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+J5sVRAAAAABJRU5ErkJggg==","base64")],{type:"image/png"}),"rayure.png");
  const photo=await request("/api/photos",{method:"POST",cookie:cookieA,form});
  assert.equal(photo.response.status,201,JSON.stringify(photo.data));
  const photoId=photo.data.photo.id;
  const vehicleImage=new FormData();
  vehicleImage.set("vehicleId",vehicleId);
  vehicleImage.set("file",new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+J5sVRAAAAABJRU5ErkJggg==","base64")],{type:"image/png"}),"voiture.png");
  const garagePhoto=await request("/api/photos",{method:"POST",cookie:cookieA,form:vehicleImage});
  assert.equal(garagePhoto.response.status,201,JSON.stringify(garagePhoto.data));
  const garage=await request("/api/vehicles",{cookie:cookieA});
  assert.equal(garage.data.vehicles.find(v=>v.id===vehicleId).photos?.[0]?.id,garagePhoto.data.photo.id,"photo principale perdue après rechargement du garage");
  const ownPhoto=await request("/api/photos/"+photoId,{cookie:cookieA});
  assert.equal(ownPhoto.response.status,200);
  const emailB="b-"+randomUUID()+"@example.test";
  const b=await request("/api/auth/signup",{method:"POST",body:{name:"Bob",email:emailB,password:"MotDePasseLong!2026"}});
  assert.equal(b.response.status,201,JSON.stringify(b.data));
  const cookieB=b.response.headers.get("set-cookie")?.split(";")[0]||"";
  assert.equal((await request("/api/vehicles/"+vehicleId,{cookie:cookieB})).response.status,404);
  assert.equal((await request("/api/photos/"+photoId,{cookie:cookieB})).response.status,404);
  const patched=await request("/api/entries/"+issueId,{method:"PATCH",cookie:cookieA,body:{status:"IN_PROGRESS"}});
  assert.equal(patched.response.status,200,JSON.stringify(patched.data));
  assert.equal(patched.data.entry.status,"IN_PROGRESS");
  const service=await request("/api/entries",{method:"POST",cookie:cookieA,body:{vehicleId,kind:"MAINTENANCE",title:"Vidange",mileage:25000,nextDueKm:25200}});
  assert.equal(service.response.status,201,JSON.stringify(service.data));
  const cron=await request("/api/jobs/reminders",{method:"POST",headers:{Authorization:"Bearer "+process.env.CRON_SECRET}});
  assert.equal(cron.response.status,200,JSON.stringify(cron.data));
  const alerts=await request("/api/notifications",{cookie:cookieA});
  assert.equal(alerts.response.status,200,JSON.stringify(alerts.data));
  assert.ok(alerts.data.notifications.some(n=>n.title.includes("Vidange")),"rappel de vidange manquant");
  const entries=await request("/api/entries?vehicleId="+vehicleId,{cookie:cookieA});
  assert.equal(entries.response.status,200);
  assert.ok(entries.data.entries.length>=2);
 }finally{
  server.kill("SIGTERM");
 }
});
