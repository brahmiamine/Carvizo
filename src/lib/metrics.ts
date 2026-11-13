export type FuelReading = { mileage:number|null; volumeMl:number|null; fullTank:boolean };
export function fuelConsumption(readings:FuelReading[]):number|null {
  if(readings.some(r=>r.mileage===null||!Number.isFinite(r.mileage)||r.mileage<0))return null;
  const rows=[...readings];
  if(rows.some((r,i)=>i>0&&r.mileage!<rows[i-1].mileage!))return null;
  const full=rows.filter(r=>r.fullTank&&r.mileage!==null);
  if(full.length<2)return null;
  const start=full[full.length-2].mileage!, end=full[full.length-1].mileage!, distance=end-start;
  if(distance<=0)return null;
  const consumed=rows.filter(r=>r.mileage!>start&&r.mileage!<=end).reduce((s,r)=>s+(r.volumeMl||0),0);
  return consumed>0?Math.round(consumed/1000/distance*10000)/100:null;
}
export function safeMoneyCents(amount:number):number|null { return Number.isFinite(amount)&&amount>=0&&amount<=100000000?Math.round((amount+Number.EPSILON)*100):null }
export function reminderWindow(current:number,due:number,threshold=500):boolean {return Number.isFinite(current)&&Number.isFinite(due)&&due>=0&&current>=due-threshold}
export function shouldAskOdometer(last:Date|null,now=new Date()):boolean {return !last||now.getTime()-last.getTime()>=30*86400000}
export function validateEntry(entry:{kind?:string;title?:string;volumeMl?:number|null;mileage?:number|null;amountCents?:number|null}):string|null{
 if(!['MAINTENANCE','OIL_CHANGE','FUEL','ODOMETER','TIRE','REPAIR','ISSUE','EXPENSE'].includes(entry.kind||''))return 'Type inconnu.';
 if(!entry.title?.trim()||entry.title.length>180)return 'Renseigne un titre (180 caractères max).';
 if(entry.mileage!==undefined&&entry.mileage!==null&&(!Number.isSafeInteger(entry.mileage)||entry.mileage<0))return 'Kilométrage incorrect.';
 if(entry.kind==='FUEL'&&(!entry.volumeMl||!Number.isSafeInteger(entry.volumeMl)||entry.volumeMl<=0))return 'Renseigne un volume positif.';
 if(['ODOMETER','FUEL'].includes(entry.kind||'')&&entry.mileage==null)return 'Renseigne le kilométrage.';
 if(entry.amountCents!=null&&(!Number.isSafeInteger(entry.amountCents)||entry.amountCents<0))return 'Montant incorrect.';
 return null;
}

/** Rappelle de contrôler la pression tous les 30 jours en l'absence de relevé. */
export function shouldAskTireCheck(last:Date|null,now=new Date()):boolean {return shouldAskOdometer(last,now)}

export const OIL_INTERVAL_KM=10000;
export const OIL_INTERVAL_MONTHS=12;
/** Prochaine vidange par défaut : +10 000 km ou +12 mois, au premier des deux. */
export function defaultOilDue(mileage:number|null,occurredAt:Date):{nextDueKm:number|null;nextDueAt:Date}{
 const at=new Date(occurredAt);at.setMonth(at.getMonth()+OIL_INTERVAL_MONTHS);
 return {nextDueKm:mileage===null?null:mileage+OIL_INTERVAL_KM,nextDueAt:at};
}

/** Future projections stay anchored to actual service history; overdue service remains separate. */
export function projectOilDues(lastMileage:number|null,nextDueKm:number|null,currentKm=0,count=3,intervalKm=OIL_INTERVAL_KM):number[]{
 const interval=lastMileage!==null&&nextDueKm!==null&&nextDueKm>lastMileage?nextDueKm-lastMileage:intervalKm;
 if(!Number.isSafeInteger(currentKm)||currentKm<0||!Number.isSafeInteger(interval)||interval<=0||!Number.isSafeInteger(count)||count<1||count>100)return [];
 const anchor=nextDueKm??(lastMileage??currentKm)+interval;
 const first=anchor>currentKm?anchor:anchor+(Math.floor((currentKm-anchor)/interval)+1)*interval;
 return Array.from({length:count},(_,i)=>first+i*interval);
}
