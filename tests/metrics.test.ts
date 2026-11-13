import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fuelConsumption, reminderWindow, safeMoneyCents, validateEntry, shouldAskOdometer } from '../src/lib/metrics.ts';
test('pas de consommation sans deux pleins complets',()=>assert.equal(fuelConsumption([{mileage:1000,volumeMl:45000,fullTank:true}]),null));
test('consommation depuis deux pleins complets et un plein partiel',()=>assert.equal(fuelConsumption([{mileage:1000,volumeMl:42000,fullTank:true},{mileage:1200,volumeMl:10000,fullTank:false},{mileage:1500,volumeMl:25000,fullTank:true}]),7));
test('refuse une séquence kilométrique décroissante',()=>assert.equal(fuelConsumption([{mileage:2000,volumeMl:30000,fullTank:true},{mileage:1500,volumeMl:30000,fullTank:true}]),null));
test('argent arrondi correctement',()=>assert.equal(safeMoneyCents(12.345),1235));
test('rappel proche du seuil',()=>assert.equal(reminderWindow(9900,10000,500),true));
test('pas de rappel trop tôt',()=>assert.equal(reminderWindow(9000,10000,500),false));
test('rappel compteur après 30 jours',()=>assert.equal(shouldAskOdometer(new Date('2026-10-01'),new Date('2026-11-13')),true));
test('refuse plein volume nul',()=>assert.equal(validateEntry({kind:'FUEL',title:'Plein',volumeMl:0}),'Renseigne un volume positif.'));

test('rappel mensuel des pneus si aucun contrôle récent',async()=>{const m=await import('../src/lib/metrics.ts');assert.equal(m.shouldAskTireCheck(new Date('2026-10-01'),new Date('2026-11-13')),true);assert.equal(m.shouldAskTireCheck(new Date('2026-11-05'),new Date('2026-11-13')),false)});
