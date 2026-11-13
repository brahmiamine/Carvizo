import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
test('vehicle isolation, notification navigation and three live oil projections',async()=>{
 const server=spawn(process.execPath,['.next/standalone/server.js'],{env:{...process.env,PORT:'3458',HOSTNAME:'127.0.0.1'},stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3458')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
  const page=await browser.newPage({serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base={make:'Test',model:'Voiture',year:2020,registration:null,fuelType:'ESSENCE',currentKm:25000,lastOdometerAt:null,frontPressureBar:null,rearPressureBar:null,photos:[]};
  const event={notes:null,occurredAt:'2026-11-12T12:00:00.000Z',mileage:20000,amountCents:10000,volumeMl:null,fullTank:false,status:'RESOLVED',nextDueKm:30000,nextDueAt:null,photos:[]};
  let delayed=false,km=25000;
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url());let data={};
   if(url.pathname==='/api/auth/me')data={user:{id:'review',name:'Revue',email:'review@example.test'}};
   else if(url.pathname==='/api/vehicles')data={vehicles:[{...base,currentKm:km,id:'A',name:'Voiture A'},{...base,id:'B',name:'Voiture B'}]};
   else if(url.pathname==='/api/notifications')data={notifications:[]};
   else if(url.pathname==='/api/entries'&&route.request().method()==='POST'){km=route.request().postDataJSON().mileage;data={entry:{...event,id:'reading',kind:'ODOMETER',vehicleId:'A',mileage:km}}}
   else if(url.pathname==='/api/entries'){
    const id=url.searchParams.get('vehicleId');if(delayed)await new Promise(r=>setTimeout(r,id==='B'?800:50));
    const oil={...event,id:'oil-A',vehicleId:'A',kind:'OIL_CHANGE',title:'VIDANGE_A'};
    const plan={...event,id:'date-A',vehicleId:'A',kind:'MAINTENANCE',status:'OPEN',title:'DATE_DEPASSEE',nextDueKm:null,nextDueAt:'2020-01-01T12:00:00.000Z'};
    data={entries:id==='A'?[oil,plan]:[{...event,id:'expense-B',vehicleId:'B',kind:'EXPENSE',title:'FRAIS_B'}],nextCursor:null,totals:{spentCents:10000,monthlyCents:10000},latestOil:id==='A'?oil:null,activePlans:id==='A'?[oil,plan]:[],fuelEntries:[]};
   }
   await route.fulfill({json:data});
  });
  await page.goto('http://127.0.0.1:3458/?tab=rappels');
  await page.getByRole('heading',{name:'Mes rappels',exact:true}).waitFor();
  await page.locator('.sidebar .nav-link').filter({hasText:'Vidange'}).click();
  await page.getByText(/Vidange n°1/).waitFor();
  const projections=async()=>page.locator('.timeline-main b').allTextContents();
  assert.ok((await projections()).some(t=>t.includes('30')&&t.includes('000')));
  await page.locator('.sidebar .nav-link').filter({hasText:'Accueil'}).click();
  assert.match(await page.locator('.timeline-row').filter({hasText:'DATE_DEPASSEE'}).first().innerText(),/Échu/);
  await page.getByRole('button',{name:/Actualiser/}).click();
  await page.locator('input[name=mileage]').fill('55000');
  await page.locator('button').filter({hasText:/^Enregistrer/}).last().click();
  await page.locator('[role=dialog]').waitFor({state:'hidden'});
  await page.locator('.sidebar .nav-link').filter({hasText:'Vidange'}).click();
  const rows=(await projections()).filter(t=>t.includes('Vidange n°'));
  assert.equal(rows.length,3);assert.match(rows[0],/60/);assert.match(rows[1],/70/);assert.match(rows[2],/80/);
  await page.locator('.sidebar .nav-link').filter({hasText:'Mon garage'}).click();delayed=true;
  const requested=page.waitForRequest(r=>r.url().includes('vehicleId=B'));
  await page.locator('.garage-tile').nth(1).click();await requested;await page.locator('.garage-tile').nth(0).click();
  await page.waitForTimeout(1000);
  await page.locator('.sidebar .nav-link').filter({hasText:'Historique'}).click();
  assert.doesNotMatch(await page.locator('.entries-panel').innerText(),/FRAIS_B/);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.kill('SIGTERM')}
});
