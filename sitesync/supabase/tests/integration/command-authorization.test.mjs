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
 workerBPerson:'00000000-0000-4000-8000-000000000013',
 supervisorADevice:'55555555-5555-4555-8555-555555555552',
 unassignedPersonA:'00000000-0000-4000-8000-000000000016',
};
const COMMAND_IDS={
 workerForOther:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
 supervisorUnassignedTarget:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
 revokedDevice:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
 inactiveMembership:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
 inactiveAssignment:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
 inactiveParticipation:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
};
function payload({commandId,personId,deviceInstallationId,workDate}){
 const occurredAt=`${workDate} 08:00:00+00`;
 return {command_id:commandId,command_type:'ATTENDANCE_CHECK_IN',base_revision:0,organisation_id:IDS.organisationA,project_id:IDS.projectA,company_id:IDS.companyA,person_id:personId,device_installation_id:deviceInstallationId,occurred_at_utc:occurredAt,device_time_utc:occurredAt,work_date:workDate};
}
async function rpc(client,p){const {data,error}=await client.rpc('process_command',{p_command:p});assert.ifError(error);assert.ok(data);return data;}
async function update(table,filters,changes){let q=serviceClient.from(table).update(changes);for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const {error}=await q;assert.ifError(error);}
function denied(result,status='PERMISSION_DENIED',reason){assert.equal(result.status,status);if(reason!==undefined)assert.equal(result.error_reason,reason);}

test('worker cannot act for another worker',async()=>{
 const client=await userClient('worker@sitesync.test');
 denied(await rpc(client,payload({commandId:COMMAND_IDS.workerForOther,personId:IDS.workerBPerson,deviceInstallationId:IDS.workerADevice,workDate:'2099-02-01'})),'PERMISSION_DENIED','WORKER_CANNOT_ACT_FOR_OTHER');
});

test('supervisor cannot act for an unassigned target',async()=>{
 const client=await userClient('supervisor@sitesync.test');
 denied(await rpc(client,payload({commandId:COMMAND_IDS.supervisorUnassignedTarget,personId:IDS.unassignedPersonA,deviceInstallationId:IDS.supervisorADevice,workDate:'2099-02-02'})));
});

test('revoked device is denied',async()=>{
 const client=await userClient('worker@sitesync.test');
 try{await update('device_installations',{id:IDS.workerADevice},{status:'REVOKED',revoked_at:'2099-02-03 08:00:00+00'});denied(await rpc(client,payload({commandId:COMMAND_IDS.revokedDevice,personId:IDS.workerAPerson,deviceInstallationId:IDS.workerADevice,workDate:'2099-02-03'})),'PERMISSION_DENIED','DEVICE_REVOKED');}
 finally{await update('device_installations',{id:IDS.workerADevice},{status:'ACTIVE',revoked_at:null});}
});

test('inactive membership is denied',async()=>{
 const client=await userClient('worker@sitesync.test');
 try{await update('company_memberships',{id:IDS.workerAMembership},{status:'INACTIVE'});denied(await rpc(client,payload({commandId:COMMAND_IDS.inactiveMembership,personId:IDS.workerAPerson,deviceInstallationId:IDS.workerADevice,workDate:'2099-02-04'})));}
 finally{await update('company_memberships',{id:IDS.workerAMembership},{status:'ACTIVE'});}
});

test('inactive assignment is denied',async()=>{
 const client=await userClient('worker@sitesync.test');
 try{await update('project_assignments',{id:IDS.workerAAssignment},{status:'INACTIVE'});denied(await rpc(client,payload({commandId:COMMAND_IDS.inactiveAssignment,personId:IDS.workerAPerson,deviceInstallationId:IDS.workerADevice,workDate:'2099-02-05'})));}
 finally{await update('project_assignments',{id:IDS.workerAAssignment},{status:'ACTIVE'});}
});

test('inactive project-company participation is denied',async()=>{
 const client=await userClient('worker@sitesync.test');
 try{await update('project_company_participation',{project_id:IDS.projectA,company_id:IDS.companyA},{status:'INACTIVE'});denied(await rpc(client,payload({commandId:COMMAND_IDS.inactiveParticipation,personId:IDS.workerAPerson,deviceInstallationId:IDS.workerADevice,workDate:'2099-02-06'})));}
 finally{await update('project_company_participation',{project_id:IDS.projectA,company_id:IDS.companyA},{status:'ACTIVE'});}
});
