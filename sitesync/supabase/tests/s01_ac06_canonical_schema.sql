-- S-01 / AC-06 — Canonical Schema Verification
-- Execute after the composed PostgreSQL 16 migration chain.
-- sync_metadata is intentionally excluded because it is device-local.

-- AC-06a: Every canonical server entity exists.
WITH expected(entity_name) AS (
  VALUES
    ('organisations'), ('users'), ('organisation_members'), ('project_members'),
    ('projects'), ('sites'), ('blocks'), ('piles'), ('locations'),
    ('workers'), ('crews'), ('crew_members'),
    ('tasks'), ('task_assignments'), ('task_events'),
    ('qa_templates'), ('qa_task_responses'), ('qa_hold_points'),
    ('attendance_events'), ('timesheets'),
    ('prestarts'), ('prestart_responses'),
    ('inductions'), ('induction_completions'), ('licences'),
    ('documents'), ('document_versions'), ('document_signatures'),
    ('reports'), ('report_events'), ('report_distributions'),
    ('tickets'), ('ticket_comments'),
    ('attachments'), ('photos'),
    ('equipment'), ('equipment_inspections'),
    ('notifications'), ('audit_events'),
    ('command_records')
)
SELECT e.entity_name,
       CASE WHEN t.table_name IS NULL THEN 'ABSENT' ELSE 'PRESENT' END AS table_status
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = e.entity_name
 AND t.table_type = 'BASE TABLE'
ORDER BY e.entity_name;

-- AC-06b: Every canonical column exists.
WITH expected(entity_name, columns) AS (
  VALUES
    ('organisations', ARRAY['id','name','slug','status','settings','created_at','created_by']),
    ('users', ARRAY['id','email','display_name','last_seen_at','created_at']),
    ('organisation_members', ARRAY['id','organisation_id','user_id','permission_role','status','joined_at','created_at','created_by']),
    ('project_members', ARRAY['id','project_id','user_id','function_roles','assigned_site_id','status','created_at','created_by']),
    ('projects', ARRAY['id','organisation_id','name','code','status','start_date','end_date','metadata','created_at','created_by','updated_at','updated_by']),
    ('sites', ARRAY['id','project_id','name','geometry','crs_srid','status','created_at','created_by','updated_at','updated_by']),
    ('blocks', ARRAY['id','site_id','name','code','geometry','status','created_at','created_by','updated_at','updated_by']),
    ('piles', ARRAY['id','block_id','name','code','geometry','status','created_at','created_by','updated_at','updated_by']),
    ('locations', ARRAY['id','site_id','location_type','name','geometry','metadata','created_at','created_by','updated_at','updated_by']),
    ('workers', ARRAY['id','organisation_id','user_id','name','photo_attachment_id','phone','email','employment_status','metadata','created_at','created_by','updated_at','updated_by']),
    ('crews', ARRAY['id','project_id','name','supervisor_worker_id','status','created_at','created_by','updated_at','updated_by']),
    ('crew_members', ARRAY['id','crew_id','worker_id','joined_at','created_at','created_by']),
    ('tasks', ARRAY['id','project_id','task_type','title','description','status','priority','block_id','pile_id','geometry','due_at','completed_at','template_id','created_at','created_by','updated_at','updated_by']),
    ('task_assignments', ARRAY['id','task_id','worker_id','crew_id','assigned_at','assigned_by','created_at']),
    ('task_events', ARRAY['id','task_id','event_type','actor_user_id','occurred_at','payload','source_command_id','created_at']),
    ('qa_templates', ARRAY['id','organisation_id','name','version','schema','status','created_at','created_by','updated_at','updated_by']),
    ('qa_task_responses', ARRAY['id','task_id','responder_user_id','question_key','response_value','responded_at','created_at','created_by','updated_at','updated_by','source_command_id']),
    ('qa_hold_points', ARRAY['id','project_id','task_id','block_id','pile_id','title','description','state','geometry','evidence_required','created_at','created_by','updated_at','updated_by']),
    ('attendance_events', ARRAY['id','project_id','site_id','worker_id','event_type','method','occurred_at','location','corrects_event_id','source_command_id','device_id','created_at']),
    ('timesheets', ARRAY['id','project_id','worker_id','work_date','derived_minutes','exception_state','approval_status','approved_by','approved_at','created_at','created_by','updated_at','updated_by']),
    ('prestarts', ARRAY['id','project_id','site_id','created_by','prestart_date','completed_at','created_at','updated_at','updated_by']),
    ('prestart_responses', ARRAY['id','prestart_id','question_key','response_value','responded_at','created_at','created_by']),
    ('inductions', ARRAY['id','organisation_id','name','version','content_schema','status','created_at','created_by','updated_at','updated_by']),
    ('induction_completions', ARRAY['id','induction_id','worker_id','completed_at','signed_attachment_id','created_at','created_by','updated_at','updated_by']),
    ('licences', ARRAY['id','organisation_id','worker_id','licence_type','identifier','issued_at','expires_at','attachment_id','verification_state','created_at','created_by','updated_at','updated_by']),
    ('documents', ARRAY['id','organisation_id','project_id','context_type','context_id','title','status','created_at','created_by','updated_at','updated_by']),
    ('document_versions', ARRAY['id','document_id','version','attachment_id','uploaded_by','uploaded_at','created_at']),
    ('document_signatures', ARRAY['id','document_version_id','document_version_hash','signer_user_id','signed_at','signature_attachment_id','context','source_command_id','created_at']),
    ('reports', ARRAY['id','project_id','site_id','block_id','pile_id','reporter_user_id','category','severity','title','description','geometry','gps_position','gps_accuracy_m','status','assigned_to','created_at','created_by','updated_at','updated_by']),
    ('report_events', ARRAY['id','report_id','event_type','actor_user_id','occurred_at','payload','source_command_id','created_at']),
    ('report_distributions', ARRAY['id','organisation_id','recipient_name','recipient_email','format','included_report_ids','published_at','published_by','created_at','created_by']),
    ('tickets', ARRAY['id','project_id','reporter_user_id','assignee_user_id','block_id','pile_id','geometry','title','description','priority','status','related_report_id','related_task_id','related_qa_hold_point_id','created_at','created_by','updated_at','updated_by']),
    ('ticket_comments', ARRAY['id','ticket_id','author_user_id','body','created_at','created_by']),
    ('attachments', ARRAY['id','organisation_id','storage_path','mime_type','size_bytes','checksum','uploaded_by','uploaded_at','deleted_at','created_at']),
    ('photos', ARRAY['id','project_id','attachment_id','captured_at','location','exif','context_type','context_id','deleted_at','created_at','created_by']),
    ('equipment', ARRAY['id','project_id','name','serial_number','category','status','location','created_at','created_by','updated_at','updated_by']),
    ('equipment_inspections', ARRAY['id','equipment_id','inspector_user_id','inspected_at','result','notes','created_at','created_by']),
    ('notifications', ARRAY['id','organisation_id','recipient_user_id','notification_type','payload','read_at','created_at']),
    ('audit_events', ARRAY['id','organisation_id','project_id','actor_user_id','action','entity_type','entity_id','payload','occurred_at','source_command_id','created_at']),
    ('command_records', ARRAY['id','organisation_id','project_id','submitted_by_user_id','device_id','command_type','payload','submitted_at','received_at','status','processed_at','result_event_id','result_event_type','rejection_reason','created_at'])
)
SELECT e.entity_name, col.column_name, 'MISSING' AS column_status
FROM expected e
CROSS JOIN LATERAL unnest(e.columns) AS col(column_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = e.entity_name
    AND c.column_name = col.column_name
)
ORDER BY e.entity_name, col.column_name;

-- AC-06c: Required Schema v2.1 amendment columns.
WITH required(table_name, column_name) AS (
  VALUES
    ('documents','project_id'),
    ('command_records','project_id'),
    ('audit_events','project_id'),
    ('attachments','deleted_at'),
    ('photos','deleted_at'),
    ('project_members','function_roles')
)
SELECT r.table_name, r.column_name, 'PRESENT' AS status
FROM required r
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = r.table_name
    AND c.column_name = r.column_name
)
ORDER BY r.table_name, r.column_name;

-- AC-06d: function_roles exact array type.
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_members'
  AND column_name = 'function_roles';
-- Expected: data_type = 'ARRAY', udt_name = '_function_role'

-- AC-06e: policy inventory for interpretation against Schema v2.1 RLS scope.
SELECT c.relname AS table_name,
       COUNT(p.polname) AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'r'
  AND c.relname NOT IN ('sync_metadata')
GROUP BY c.relname
ORDER BY policy_count ASC, c.relname ASC;
