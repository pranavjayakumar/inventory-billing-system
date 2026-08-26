-- Kirana Billing: grant table/sequence/function access to the anon role.
-- RLS is intentionally off in v1 (no auth yet, see build plan section 9),
-- so these grants are the only access gate. Run after 0001_init.sql.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;
