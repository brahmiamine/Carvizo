export type FuelReading = { mileage:number|null; volumeMl:number|null; fullTank:boolean };
export function fuelConsumption(readings:FuelReading[]):number|null {
  const rows=[...readings].filter(r=>Number.isFinite(r.mileage)&&r.mileage!>=0);
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
 if(!['MAINTENANCE','FUEL','ODOMETER','TIRE','REPAIR','ISSUE','EXPENSE'].includes(entry.kind||''))return 'Type inconnu.';
 if(!entry.title?.trim()||entry.title.length>180)return 'Renseigne un titre (180 caractères max).';
 if(entry.mileage!==undefined&&entry.mileage!==null&&(!Number.isSafeInteger(entry.mileage)||entry.mileage<0))return 'Kilométrage incorrect.';
 if(entry.kind==='ODOMETER'&&entry.mileage==null)return 'Renseigne le kilométrage.';
 if(entry.kind==='FUEL'&&(!entry.volumeMl||!Number.isSafeInteger(entry.volumeMl)||entry.volumeMl<=0))return 'Renseigne un volume positif.';
 if(entry.amountCents!=null&&(!Number.isSafeInteger(entry.amountCents)||entry.amountCents<0))return 'Montant incorrect.';
 return null;
}
