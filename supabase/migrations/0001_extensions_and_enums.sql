-- 0001_extensions_and_enums.sql
-- Extensions and enum types. See docs/DB.md §3.

create extension if not exists pg_trgm with schema extensions;

create type public.invoice_status as enum ('not_paid', 'paid');
create type public.line_unit_type as enum ('hours', 'flat');
create type public.paid_source    as enum ('stripe', 'manual');
create type public.send_status    as enum ('sent', 'failed');
