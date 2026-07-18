-- Resettable synthetic demo seed. Auth users are created via scripts/reset-demo.mjs.
insert into public.organizations(id,name,slug,synthetic_demo) values ('00000000-0000-4000-8000-000000000001','CustomerPulse Demo Organisation','customerpulse-demo',true) on conflict(slug) do update set synthetic_demo=true;
insert into public.system_settings(organization_id,key,value) values
('00000000-0000-4000-8000-000000000001','churn_boundaries','{"low":29,"medium":59,"high":79}'),
('00000000-0000-4000-8000-000000000001','marketing_triggers','{"risk_percentage":20,"revenue_decline":15,"frequency_decline":20,"engagement_decline":25}'),
('00000000-0000-4000-8000-000000000001','demo_disclosure','{"synthetic":true,"avo":"AVO Demo Analysis"}')
on conflict(organization_id,key) do update set value=excluded.value;
insert into public.data_retention_rules(organization_id,category,retention_days) values
('00000000-0000-4000-8000-000000000001','customer_operational',2555),
('00000000-0000-4000-8000-000000000001','conversation',1095),
('00000000-0000-4000-8000-000000000001','audit',2555)
on conflict(organization_id,category) do update set retention_days=excluded.retention_days;
