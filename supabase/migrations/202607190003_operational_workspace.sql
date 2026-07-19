-- Durable Imported Workspace snapshots and authenticated-user bootstrap.
-- Apply after 202607190002_customer_assignment_rls.sql.

insert into public.organizations(id, name, slug, synthetic_demo)
values (
  '00000000-0000-4000-8000-000000000001',
  'CustomerPulse Demo Organisation',
  'customerpulse-demo',
  true
)
on conflict (slug) do nothing;

create table if not exists public.operational_workspace_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  workspace text not null check (workspace in ('imported')),
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, workspace)
);

alter table public.operational_workspace_states enable row level security;

create policy operational_workspace_tenant_read
on public.operational_workspace_states
for select
using (
  organization_id = public.current_org_id()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','auditor'
  ]::public.app_role[])
);

create policy operational_workspace_authorized_insert
on public.operational_workspace_states
for insert
with check (
  organization_id = public.current_org_id()
  and updated_by = auth.uid()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive'
  ]::public.app_role[])
);

create policy operational_workspace_authorized_update
on public.operational_workspace_states
for update
using (
  organization_id = public.current_org_id()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive'
  ]::public.app_role[])
)
with check (
  organization_id = public.current_org_id()
  and updated_by = auth.uid()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive'
  ]::public.app_role[])
);

alter table public.audit_logs
  add column if not exists external_event_id text;

create unique index if not exists audit_logs_org_external_event
  on public.audit_logs(organization_id, external_event_id)
  where external_event_id is not null;

create policy audit_authenticated_insert
on public.audit_logs
for insert
with check (
  organization_id = public.current_org_id()
  and actor_id = auth.uid()
  and public.has_role(array[
    'administrator','sales_manager','marketing_manager','account_executive','auditor'
  ]::public.app_role[])
);

-- New sign-ups are safely attached to the demo organisation as account
-- executives. Administrators must explicitly grant elevated roles.
create or replace function public.handle_customerpulse_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_org uuid := '00000000-0000-4000-8000-000000000001';
begin
  insert into public.profiles(id, organization_id, display_name, email)
  values (
    new.id,
    default_org,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now();

  insert into public.user_roles(profile_id, organization_id, role)
  values (new.id, default_org, 'account_executive')
  on conflict (profile_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customerpulse on auth.users;
create trigger on_auth_user_created_customerpulse
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_customerpulse_user();

-- Backfill profiles only for users that do not already have one. Elevated
-- roles are intentionally never inferred from email or user metadata.
insert into public.profiles(id, organization_id, display_name, email)
select
  user_row.id,
  '00000000-0000-4000-8000-000000000001',
  coalesce(user_row.raw_user_meta_data ->> 'display_name', split_part(user_row.email, '@', 1)),
  user_row.email
from auth.users user_row
where user_row.email is not null
on conflict (id) do nothing;

insert into public.user_roles(profile_id, organization_id, role)
select
  profile.id,
  profile.organization_id,
  'account_executive'::public.app_role
from public.profiles profile
where not exists (
  select 1 from public.user_roles existing where existing.profile_id = profile.id
);

-- Customer-scoped JSON records are the application operational store. They
-- preserve the rich deterministic state while allowing RLS to reject an
-- unassigned customer before its JSON reaches the browser.
create table if not exists public.operational_entity_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  workspace text not null check (workspace = 'imported'),
  entity_type text not null,
  entity_key text not null,
  customer_external_id text,
  assigned_profile_id uuid references public.profiles(id),
  data jsonb not null,
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, workspace, entity_type, entity_key)
);

create index if not exists operational_records_customer
  on public.operational_entity_records(organization_id, customer_external_id, entity_type);

alter table public.operational_entity_records enable row level security;

create or replace function public.resolve_operational_record_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_label text;
begin
  if new.customer_external_id is null then
    new.assigned_profile_id := null;
    return new;
  end if;

  if new.entity_type = 'customer' then
    staff_label := new.data ->> 'staff';
  else
    select customer_record.data ->> 'staff'
      into staff_label
    from public.operational_entity_records customer_record
    where customer_record.organization_id = new.organization_id
      and customer_record.workspace = new.workspace
      and customer_record.entity_type = 'customer'
      and customer_record.entity_key = new.customer_external_id;
  end if;

  select profile.id into new.assigned_profile_id
  from public.profiles profile
  where profile.organization_id = new.organization_id
    and (
      lower(profile.email) = lower(staff_label)
      or lower(profile.display_name) = lower(staff_label)
    )
  limit 1;
  return new;
end;
$$;

drop trigger if exists operational_record_assignee on public.operational_entity_records;
create trigger operational_record_assignee
before insert or update of data, customer_external_id
on public.operational_entity_records
for each row execute procedure public.resolve_operational_record_assignee();

create policy operational_records_scoped_read
on public.operational_entity_records
for select
using (
  organization_id = public.current_org_id()
  and (
    public.has_role(array['administrator','sales_manager','auditor']::public.app_role[])
    or (
      public.has_role(array['marketing_manager']::public.app_role[])
      and entity_type in ('customer','churn_calculation','campaign','marketing_opportunity','scheduled_post','campaign_result','event','settings')
    )
    or (
      public.has_role(array['account_executive']::public.app_role[])
      and assigned_profile_id = auth.uid()
    )
  )
);

create policy operational_records_admin_insert
on public.operational_entity_records
for insert
with check (
  organization_id = public.current_org_id()
  and updated_by = auth.uid()
  and public.has_role(array['administrator']::public.app_role[])
);

create policy operational_records_admin_update
on public.operational_entity_records
for update
using (
  organization_id = public.current_org_id()
  and public.has_role(array['administrator']::public.app_role[])
)
with check (
  organization_id = public.current_org_id()
  and updated_by = auth.uid()
  and public.has_role(array['administrator']::public.app_role[])
);

create policy operational_records_role_insert
on public.operational_entity_records
for insert
with check (
  organization_id = public.current_org_id()
  and updated_by = auth.uid()
  and (
    (
      public.has_role(array['sales_manager']::public.app_role[])
      and entity_type in ('tier_calculation','churn_calculation','analysis','signal','alert','response','outcome','action','recommendation','event')
    )
    or (
      public.has_role(array['marketing_manager']::public.app_role[])
      and entity_type in ('campaign','marketing_opportunity','scheduled_post','campaign_result','event')
    )
    or (
      public.has_role(array['account_executive']::public.app_role[])
      and assigned_profile_id = auth.uid()
      and entity_type in ('response','outcome','action','recommendation','event')
    )
  )
);

create policy operational_records_role_update
on public.operational_entity_records
for update
using (
  organization_id = public.current_org_id()
  and (
    (
      public.has_role(array['sales_manager']::public.app_role[])
      and entity_type in ('customer','tier_calculation','churn_calculation','analysis','signal','alert','response','outcome','action','recommendation','event')
    )
    or (
      public.has_role(array['marketing_manager']::public.app_role[])
      and entity_type in ('campaign','marketing_opportunity','scheduled_post','campaign_result','event')
    )
    or (
      public.has_role(array['account_executive']::public.app_role[])
      and assigned_profile_id = auth.uid()
      and entity_type in ('response','outcome','action','recommendation','event')
    )
  )
)
with check (organization_id = public.current_org_id() and updated_by = auth.uid());

-- Audit and operational records intentionally have no DELETE policy.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operational_entity_records'
  ) then
    alter publication supabase_realtime add table public.operational_entity_records;
  end if;
end $$;
