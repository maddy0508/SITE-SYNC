import test from 'node:test';
import assert from 'node:assert/strict';
import { userClient } from './helpers.mjs';

const IDS={
  workerBPerson:'00000000-0000-4000-8000-000000000013',
  workerBAssignment:'33333333-3333-4333-8333-333333333334',
  workerBMembership:'22222222-2222-4222-8222-222222222224',
  workerBAttendanceEvent:'66666666-6666-4666-8666-666666666602',
  workerBAttendanceState:'77777777-7777-4777-8777-777777777702',
  workerBTimesheet:'88888888-8888-4888-8888-888888888802',
  projectA:'00000000-0000-4000-8000-000000000020',
  projectB:'00000000-0000-4000-8000-000000000120',
  projectC:'00000000-0000-4000-8000-000000000021',
  orgBPerson:'00000000-0000-4000-8000-000000000111',
  orgBAssignment:'33333333-3333-4333-8333-333333333333',
};

async function assertVisible(client,table,column,value,label){
 const {data,error}=await client.from(table).select('*').eq(column,value);
 assert.ifError(error);
 assert.equal(data.length,1,`${label}: expected exactly one visible row`);
}
async function assertHidden(client,table,column,value,label){
 const {data,error}=await client.from(table).select('*').eq(column,value);
 assert.ifError(error);
 assert.equal(data.length,0,`${label}: expected row to be hidden by RLS`);
}

test('Admin A has full operational visibility on Project A',async()=>{
 const client=await userClient('admin-a@sitesync.test');
 await assertVisible(client,'projects','id',IDS.projectA,'Project A');
 await assertVisible(client,'persons','id',IDS.workerBPerson,'Worker B person');
 await assertVisible(client,'company_memberships','id',IDS.workerBMembership,'Worker B membership');
 await assertVisible(client,'project_assignments','id',IDS.workerBAssignment,'Worker B assignment');
 await assertVisible(client,'attendance_events','id',IDS.workerBAttendanceEvent,'Worker B attendance');
 await assertVisible(client,'attendance_states','id',IDS.workerBAttendanceState,'Worker B state');
 await assertVisible(client,'timesheets','id',IDS.workerBTimesheet,'Worker B timesheet');
});

test('Admin A cannot read same-org Project C',async()=>{
 const client=await userClient('admin-a@sitesync.test');
 await assertHidden(client,'projects','id',IDS.projectC,'Project C');
});

test('Admin A cannot read Organisation B',async()=>{
 const client=await userClient('admin-a@sitesync.test');
 await assertHidden(client,'projects','id',IDS.projectB,'Organisation B project');
 await assertHidden(client,'persons','id',IDS.orgBPerson,'Organisation B person');
 await assertHidden(client,'project_assignments','id',IDS.orgBAssignment,'Organisation B assignment');
});

test('Admin A cannot enumerate Worker B records outside Project A',async()=>{
 const client=await userClient('admin-a@sitesync.test');
 const {data,error}=await client.from('attendance_events').select('id,project_id,person_id').eq('person_id',IDS.workerBPerson).neq('project_id',IDS.projectA);
 assert.ifError(error);
 assert.equal(data.length,0,'Admin A must not see Worker B records outside authorised project');
});
