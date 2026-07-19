-- Phase 2 customer-assignment enforcement and ERAR-v1 persistence.
-- Apply after 202607180001_initial_schema.sql.

alter table public.churn_scores
  add column if not exists eligible_revenue_base numeric(14,2) not null default 0,
  add column if not exists revenue_period text not null default 'Next 90 days',
  add column if not exists churn_probability numeric(6,5) not null default 0 check (churn_probability between 0 and 1),
  add column if not exists revenue_calculation_version text not null default 'ERAR-v1',
  add column if not exists revenue_data_source text,
  add column if not exists estimate_disclaimer text not null default 'Estimate, not a guaranteed loss.',
  add column if not exists revenue_override jsonb;

alter table public.audit_logs
  add column if not exists customer_id uuid references public.customers(id);

create or replace function public.can_access_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id
      and c.organization_id = public.current_org_id()
      and (
        public.has_role(array['administrator','sales_manager','auditor']::public.app_role[])
        or (
          public.has_role(array['account_executive']::public.app_role[])
          and c.assigned_profile_id = auth.uid()
        )
      )
  )
$$;

-- Remove the Phase 1 tenant-wide read policies from customer-domain records.
do $$
declare t text;
begin
  foreach t in array array[
    'customers','customer_consents','transactions','customer_products',
    'conversations','messages','conversation_analyses','customer_tiers',
    'tier_components','churn_scores','churn_score_components','alerts',
    'recommendations','recommendation_feedback','outreach_messages','tasks',
    'audit_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_read', t);
  end loop;
end $$;

drop policy if exists customer_ops on public.customers;
drop policy if exists recommendations_ops on public.recommendations;

create policy customers_assignment_read on public.customers
for select using (public.can_access_customer(id));
create policy customers_assignment_write on public.customers
for all using (public.can_access_customer(id))
with check (
  organization_id=public.current_org_id()
  and (
    public.has_role(array['administrator','sales_manager']::public.app_role[])
    or assigned_profile_id=auth.uid()
  )
);

do $$
declare t text;
begin
  foreach t in array array[
    'customer_consents','transactions','customer_products','conversations',
    'customer_tiers','churn_scores','alerts','recommendations',
    'outreach_messages','tasks'
  ] loop
    execute format(
      'create policy %I on public.%I for select using (organization_id=public.current_org_id() and public.can_access_customer(customer_id))',
      t || '_assignment_read', t
    );
  end loop;
end $$;

create policy messages_assignment_read on public.messages
for select using (
  organization_id=public.current_org_id()
  and exists (
    select 1 from public.conversations c
    where c.id=messages.conversation_id
      and public.can_access_customer(c.customer_id)
  )
);

create policy conversation_analyses_assignment_read on public.conversation_analyses
for select using (
  organization_id=public.current_org_id()
  and exists (
    select 1 from public.conversations c
    where c.id=conversation_analyses.conversation_id
      and public.can_access_customer(c.customer_id)
  )
);

create policy tier_components_assignment_read on public.tier_components
for select using (
  organization_id=public.current_org_id()
  and exists (
    select 1 from public.customer_tiers ct
    where ct.id=tier_components.customer_tier_id
      and public.can_access_customer(ct.customer_id)
  )
);

create policy churn_components_assignment_read on public.churn_score_components
for select using (
  organization_id=public.current_org_id()
  and exists (
    select 1 from public.churn_scores cs
    where cs.id=churn_score_components.churn_score_id
      and public.can_access_customer(cs.customer_id)
  )
);

create policy recommendation_feedback_assignment_read on public.recommendation_feedback
for select using (
  organization_id=public.current_org_id()
  and exists (
    select 1 from public.recommendations r
    where r.id=recommendation_feedback.recommendation_id
      and r.customer_id is not null
      and public.can_access_customer(r.customer_id)
  )
);

create policy recommendations_assignment_write on public.recommendations
for all using (
  organization_id=public.current_org_id()
  and customer_id is not null
  and public.can_access_customer(customer_id)
  and public.has_role(array['administrator','sales_manager','account_executive']::public.app_role[])
)
with check (
  organization_id=public.current_org_id()
  and customer_id is not null
  and public.can_access_customer(customer_id)
  and public.has_role(array['administrator','sales_manager','account_executive']::public.app_role[])
);

create policy audit_customer_scope_read on public.audit_logs
for select using (
  organization_id=public.current_org_id()
  and (
    public.has_role(array['administrator','sales_manager','auditor']::public.app_role[])
    or actor_id=auth.uid()
    or (customer_id is not null and public.can_access_customer(customer_id))
  )
);
-- audit_logs intentionally remains without UPDATE or DELETE policies.