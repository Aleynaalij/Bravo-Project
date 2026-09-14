-- Auto-create an account + users row when a new Supabase Auth user signs up
-- (Sprint 1 / Epic A5 — docs/sprint-1-plan.md).

create function handle_new_auth_user() returns trigger as $$
declare
  new_account_id uuid;
begin
  insert into public.accounts (email, plan)
  values (new.email, 'trial')
  returning id into new_account_id;

  insert into public.users (id, account_id, email, role)
  values (new.id, new_account_id, new.email, 'owner');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
