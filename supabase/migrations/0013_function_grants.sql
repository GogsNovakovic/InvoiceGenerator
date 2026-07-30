-- 0013_function_grants.sql
-- Close the RPC surface on our functions.
--
-- DB.md §6.2 revokes next_invoice_number from PUBLIC, but Supabase's default
-- privileges grant EXECUTE on public-schema functions to anon, authenticated
-- and service_role *explicitly*, and an explicit grant is not removed by a
-- revoke from PUBLIC. Without this, every function below is reachable as
-- POST /rest/v1/rpc/<name> — including by anonymous callers.
--
-- Trigger functions need no EXECUTE grant to fire: Postgres checks EXECUTE on
-- the trigger function when the trigger is created, not when it fires.

revoke all on function public.handle_new_user()               from public, anon, authenticated;
revoke all on function public.recompute_invoice_totals()      from public, anon, authenticated;
revoke all on function public.guard_locked_invoice()          from public, anon, authenticated;
revoke all on function public.guard_locked_invoice_lines()    from public, anon, authenticated;
revoke all on function public.mark_invoice_edited_after_send() from public, anon, authenticated;
revoke all on function public.set_updated_at()                from public, anon, authenticated;

-- The one function the application does call, restricted to signed-in users.
revoke all     on function public.next_invoice_number(date) from public, anon;
grant  execute on function public.next_invoice_number(date) to authenticated;
