-- User-created projects inside Imported Workspace.
-- Apply after 202607190003_operational_workspace.sql.

create table if not exists public.operational_projects (
  id uuid primary key,
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  name text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.operational_projects enable row level security;

drop policy if exists operational_projects_tenant_read on public.operational_projects;
create policy operational_projects_tenant_read
on public.operational_projects for select
using (
  organization_id = public.current_org_id()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive','auditor'
  ]::public.app_role[])
);

drop policy if exists operational_projects_authorized_insert on public.operational_projects;
create policy operational_projects_authorized_insert
on public.operational_projects for insert
with check (
  organization_id = public.current_org_id()
  and created_by = auth.uid()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive'
  ]::public.app_role[])
);

drop policy if exists operational_projects_authorized_update on public.operational_projects;
create policy operational_projects_authorized_update
on public.operational_projects for update
using (
  organization_id = public.current_org_id()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive'
  ]::public.app_role[])
)
with check (
  organization_id = public.current_org_id()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive'
  ]::public.app_role[])
);

-- Preserve existing single-workspace data under one migration project.
insert into public.operational_projects(id, organization_id, name, description, created_by)
select
  gen_random_uuid(),
  records.organization_id,
  'Legacy Imported Project',
  'Imported data migrated from the previous single-workspace format.',
  min(records.updated_by::text)::uuid
from public.operational_entity_records records
group by records.organization_id
on conflict (organization_id, name) do nothing;

alter table public.operational_entity_records
  add column if not exists project_id uuid references public.operational_projects(id);

update public.operational_entity_records records
set project_id = project.id
from public.operational_projects project
where records.project_id is null
  and project.organization_id = records.organization_id
  and project.name = 'Legacy Imported Project';

alter table public.operational_entity_records
  alter column project_id set not null;

alter table public.operational_entity_records
  drop constraint if exists operational_entity_records_organization_id_workspace_entity_type_entity_key_key;

create unique index if not exists operational_records_project_entity
  on public.operational_entity_records(
    organization_id, workspace, project_id, entity_type, entity_key
  );

create index if not exists operational_records_project_customer
  on public.operational_entity_records(
    organization_id, project_id, customer_external_id, entity_type
  );

alter table public.audit_logs
  add column if not exists project_id uuid references public.operational_projects(id);

create index if not exists audit_logs_project_created
  on public.audit_logs(organization_id, project_id, created_at desc);

comment on table public.operational_projects is
  'User-created, non-hard-coded data boundaries inside Imported Workspace.';

insert into storage.buckets(id, name, public, file_size_limit)
values ('imported-project-files', 'imported-project-files', false, 10485760)
on conflict (id) do update
set public = false, file_size_limit = 10485760;

drop policy if exists imported_project_files_read on storage.objects;
create policy imported_project_files_read
on storage.objects for select
using (
  bucket_id = 'imported-project-files'
  and exists (
    select 1 from public.operational_projects project
    where project.id::text = (storage.foldername(name))[1]
      and project.organization_id = public.current_org_id()
  )
);

drop policy if exists imported_project_files_write on storage.objects;
create policy imported_project_files_write
on storage.objects for insert
with check (
  bucket_id = 'imported-project-files'
  and exists (
    select 1 from public.operational_projects project
    where project.id::text = (storage.foldername(name))[1]
      and project.organization_id = public.current_org_id()
      and public.has_role(array[
        'administrator','sales_manager','marketing_manager','account_executive'
      ]::public.app_role[])
  )
);
