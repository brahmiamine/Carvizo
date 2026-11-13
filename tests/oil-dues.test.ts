import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {projectOilDues,fuelConsumption,validateEntry} from '../src/lib/metrics.ts';
test('three future oil changes follow odometer without moving the service anchor',()=>{
 assert.deepEqual(projectOilDues(20000,30000,25000),[30000,40000,50000]);
 assert.deepEqual(projectOilDues(20000,30000,29000),[30000,40000,50000]);
 assert.deepEqual(projectOilDues(20000,30000,30000),[40000,50000,60000]);
 assert.deepEqual(projectOilDues(20000,30000,55000),[60000,70000,80000]);
});
test('estimates without history and honors custom interval',()=>{
 assert.deepEqual(projectOilDues(null,null,25000),[35000,45000,55000]);
 assert.deepEqual(projectOilDues(20000,35000,51000),[65000,80000,95000]);
 assert.deepEqual(projectOilDues(null,30000,35000),[40000,50000,60000]);
});
test('incomplete fuel history cannot produce a misleading consumption',()=>{
 assert.equal(fuelConsumption([{mileage:1000,volumeMl:42000,fullTank:true},{mileage:null,volumeMl:10000,fullTank:false},{mileage:1500,volumeMl:25000,fullTank:true}]),null);
 assert.ok(validateEntry({kind:'FUEL',title:'Plein',volumeMl:10000,mileage:null}));
});
