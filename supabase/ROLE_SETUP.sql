-- Run only after each person has created an account through /login.
-- Replace the example email and role before running each block.
-- Valid roles: administrator, sales_manager, marketing_manager,
-- account_executive, auditor.

begin;

delete from public.user_roles
where profile_id = (
  select id from public.profiles where lower(email) = lower('admin@example.com')
);

insert into public.user_roles (profile_id, organization_id, role)
select id, organization_id, 'administrator'::public.app_role
from public.profiles
where lower(email) = lower('admin@example.com');

commit;

-- Verify the result. This query contains no credentials.
select profile.email, profile.display_name, role.role
from public.profiles profile
join public.user_roles role on role.profile_id = profile.id
order by profile.email, role.role;
