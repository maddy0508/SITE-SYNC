import test from 'node:test';
import assert from 'node:assert/strict';
import { userClient } from './helpers.mjs';

const IDS={
 workerA:{person:'00000000-0000-4000-8000-000000000012',membership:'22222222-2222-4222-8222-222222222222',assignment:'33333333-3333-4333-8333-333333333332'},
 workerB:{person:'00000000-0000-4000-8000-000000000013',membership:'22222222-2222-4222-8222-222222222224',assignment:'33333333-3333-4333-8333-333333333334'},
 orgB:{person:'00000000-0000-4000-8000-000000000111',assignment:'33333333-3333-4333-8333-333333333333'},
};
const PROJECT_A='00000000-0000-4000-8000-000000000020';
const PROJECT_B='00000000-0000-4000-8000-000000000120';
async function count(client,table,filters){let q=client.from(table).select('*',{count:'exact',head:true});for(const[k,v]of Object.entries(filters))q=q.eq(k,v);const{count,error}=await q;assert.ifError(error);return count;}

test('Worker A can read own identity and operational records',async()=>{const c=await userClient('worker@sitesync.test');assert.equal(await count(c,'persons',{id:IDS.workerA.person}),1);assert.equal(await count(c,'company_memberships',{id:IDS.workerA.membership}),1);assert.equal(await count(c,'project_assignments',{id:IDS.workerA.assignment}),1);assert.equal(await count(c,'attendance_events',{person_id:IDS.workerA.person}),1);assert.equal(await count(c,'attendance_states',{person_id:IDS.workerA.person}),1);assert.equal(await count(c,'timesheets',{person_id:IDS.workerA.person}),1);});
test('Worker A cannot read another worker in the same project',async()=>{const c=await userClient('worker@sitesync.test');assert.equal(await count(c,'persons',{id:IDS.workerB.person}),0);assert.equal(await count(c,'company_memberships',{id:IDS.workerB.membership}),0);assert.equal(await count(c,'project_assignments',{id:IDS.workerB.assignment}),0);assert.equal(await count(c,'attendance_events',{person_id:IDS.workerB.person}),0);assert.equal(await count(c,'attendance_states',{person_id:IDS.workerB.person}),0);assert.equal(await count(c,'timesheets',{person_id:IDS.workerB.person}),0);});
test('Worker A cannot read Organisation B',async()=>{const c=await userClient('worker@sitesync.test');assert.equal(await count(c,'projects',{id:PROJECT_B}),0);assert.equal(await count(c,'persons',{id:IDS.orgB.person}),0);assert.equal(await count(c,'project_assignments',{id:IDS.orgB.assignment}),0);});
test('Worker A can read assigned Project A only',async()=>{const c=await userClient('worker@sitesync.test');assert.equal(await count(c,'projects',{id:PROJECT_A}),1);assert.equal(await count(c,'projects',{id:PROJECT_B}),0);});
