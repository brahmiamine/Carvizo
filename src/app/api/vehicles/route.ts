import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {error,jsonObject,ok,txt,positiveInt,decimal} from "@/lib/api";
export const runtime="nodejs";
export async function GET(){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const vehicles=await db.vehicle.findMany({where:{ownerId:user.id},orderBy:{createdAt:"desc"},include:{photos:{where:{eventId:null},orderBy:{createdAt:"desc"},take:1,select:{id:true,mime:true}},_count:{select:{events:true,photos:true}}}});
 return ok({vehicles});
}
export async function POST(request:Request){
 const user=await currentUser();if(!user)return error("Connexion requise",401);
 const b=await jsonObject(request);if(!b)return error("JSON invalide");
 const make=txt(b.make,80),model=txt(b.model,80);
 if(!make||!model)return error("Marque et modèle sont obligatoires");
 const km=b.currentKm===undefined?0:positiveInt(b.currentKm);
 if(km===null)return error("Kilométrage invalide");
 const year=b.year==null?null:positiveInt(b.year);
 if(year!==null&&(year<1886||year>new Date().getFullYear()+1))return error("Année invalide");
 const front=b.frontPressureBar==null?null:decimal(b.frontPressureBar),rear=b.rearPressureBar==null?null:decimal(b.rearPressureBar);
 if((front!==null&&(front<0.5||front>6))||(rear!==null&&(rear<0.5||rear>6)))return error("Pression non valide");
 const vehicle=await db.vehicle.create({data:{ownerId:user.id,make,model,name:txt(b.name,100)||null,registration:txt(b.registration,32)||null,year,currentKm:km,lastOdometerAt:km>0?new Date():null,fuelType:txt(b.fuelType,32)||"ESSENCE",frontPressureBar:front,rearPressureBar:rear}});
 return ok({vehicle},201);
}
