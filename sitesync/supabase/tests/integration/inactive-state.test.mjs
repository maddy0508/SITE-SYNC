import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceClient, userClient } from './helpers.mjs';

const IDS={
 organisationA:'00000000-0000-4000-8000-000000000001',
 projectA:'00000000-0000-4000-8000-000000000020',
 companyA:'00000000-0000-4000-8000-000000000010',
 workerAPerson:'00000000-0000-4000-8000-000000000012',
 workerAMembership:'22222222-2222-4222-8222-222222222222',
 workerAAssignment:'33333333-3333-4333-8333-333333333332',
 workerADevice:'55555555-5555-4555-8555-555555555551',
};
const DATES={membership:'2099-02-10',assignment:'2099-02-11',participation:'2099-02-12'};
function command(id,date,time){const t=`${date} ${time}+00`;return{command_id:id,command_type:'ATTENDANCE_CHECK_IN',base_revision:0,organisation_id:IDS.organisationA,project_id:IDS.projectA,company_id:IDS.companyA,person_id:IDS.workerAPerson,device_installation_id:IDS.workerADevice,occurred_at_utc:t,device_time_utc:t,work_date:date};}
async function rpc(client,p){const {data,error}=await client.rpc('process_command',{p_command:p});assert.ifError(error);assert.ok(data);return data;}
async function set(table,filters,changes){let q=serviceClient.from(table).update(changes);for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const {error}=await q;assert.ifError(error);}
function denied(result,label){assert.equal(result.status,'PERMISSION_DENIED',`${label}: expected PERMISSION_DENIED, got ${JSON.stringify(result)}`);}

test('inactive company membership is denied by process_command',async()=>{const c=await userClient('worker@sitesync.test');try{await set('company_memberships',{id:IDS.workerAMembership},{status:'INACTIVE'});denied(await rpc(c,command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',DATES.membership,'09:00:00')),'inactive company membership');}finally{await set('company_memberships',{id:IDS.workerAMembership},{status:'ACTIVE'});}});
test('inactive project assignment is denied by process_command',async()=>{const c=await userClient('worker@sitesync.test');try{await set('project_assignments',{id:IDS.workerAAssignment},{status:'INACTIVE'});denied(await rpc(c,command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',DATES.assignment,'10:00:00')),'inactive project assignment');}finally{await set('project_assignments',{id:IDS.workerAAssignment},{status:'ACTIVE'});}});
test('inactive project-company participation is denied by process_command',async()=>{const c=await userClient('worker@sitesync.test');try{await set('project_company_participation',{project_id:IDS.projectA,company_id:IDS.companyA},{status:'INACTIVE'});denied(await rpc(c,command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',DATES.participation,'11:00:00')),'inactive project-company participation');}finally{await set('project_company_participation',{project_id:IDS.projectA,company_id:IDS.companyA},{status:'ACTIVE'});}});
