import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceClient, userClient } from './helpers.mjs';

const IDS={
 workerBPerson:'00000000-0000-4000-8000-000000000013',
 workerBMembership:'22222222-2222-4222-8222-222222222224',
 workerBAssignment:'33333333-3333-4333-8333-333333333334',
 workerCAssignment:'33333333-3333-4333-8333-333333333337',
 workerC:'00000000-0000-4000-8000-000000000015',
 orgBPerson:'00000000-0000-4000-8000-000000000111',
 orgBAssignment:'33333333-3333-4333-8333-333333333333',
 supervisorAAssignment:'33333333-3333-4333-8333-333333333331',
};
const PROJECT_A='00000000-0000-4000-8000-000000000020';
const PROJECT_B='00000000-0000-4000-8000-000000000120';
const PROJECT_C='00000000-0000-4000-8000-000000000030';
async function count(c,table,filters){let q=c.from(table).select('*',{count:'exact',head:true});for(const[k,v]of Object.entries(filters))q=q.eq(k,v);const{count,error}=await q;assert.ifError(error);return count;}
async function setStatus(id,status){const{error}=await serviceClient.from('project_assignments').update({status}).eq('id',id);assert.ifError(error);}

test('Supervisor A sees supervised Project A records',async()=>{const c=await userClient('supervisor@sitesync.test');assert.equal(await count(c,'persons',{id:IDS.workerBPerson}),1);assert.equal(await count(c,'company_memberships',{id:IDS.workerBMembership}),1);assert.equal(await count(c,'project_assignments',{id:IDS.workerBAssignment}),1);assert.equal(await count(c,'attendance_events',{person_id:IDS.workerBPerson}),1);assert.equal(await count(c,'attendance_states',{person_id:IDS.workerBPerson}),1);assert.equal(await count(c,'timesheets',{person_id:IDS.workerBPerson}),1);});
test('Supervisor A cannot read same-org Project C',async()=>{const c=await userClient('supervisor@sitesync.test');assert.equal(await count(c,'projects',{id:PROJECT_C}),0);assert.equal(await count(c,'persons',{id:IDS.workerC}),0);assert.equal(await count(c,'project_assignments',{id:IDS.workerCAssignment}),0);assert.equal(await count(c,'attendance_events',{person_id:IDS.workerC}),0);assert.equal(await count(c,'attendance_states',{person_id:IDS.workerC}),0);assert.equal(await count(c,'timesheets',{person_id:IDS.workerC}),0);});
test('Supervisor A cannot read Organisation B',async()=>{const c=await userClient('supervisor@sitesync.test');assert.equal(await count(c,'projects',{id:PROJECT_B}),0);assert.equal(await count(c,'persons',{id:IDS.orgBPerson}),0);assert.equal(await count(c,'project_assignments',{id:IDS.orgBAssignment}),0);});
test('inactive Supervisor A assignment removes supervised visibility',async()=>{const c=await userClient('supervisor@sitesync.test');try{await setStatus(IDS.supervisorAAssignment,'INACTIVE');assert.equal(await count(c,'persons',{id:IDS.workerBPerson}),0);assert.equal(await count(c,'attendance_events',{person_id:IDS.workerBPerson}),0);}finally{await setStatus(IDS.supervisorAAssignment,'ACTIVE');}});
