-- Create a custom schema to test schema-aware replication
create schema if not exists "private";

create table "private"."humans" (
    "passportId" text primary key,
    "firstName" text not null,
    "lastName" text not null,
    "age" integer,

    "_deleted" boolean DEFAULT false NOT NULL,
    "_modified" timestamp with time zone DEFAULT now() NOT NULL
);

-- auto-update the _modified timestamp
CREATE TRIGGER update_modified_datetime BEFORE UPDATE ON private.humans FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('_modified');

-- add a table to the publication so we can subscribe to changes
alter publication supabase_realtime add table "private"."humans";

grant usage on schema "private" to "anon";
grant usage on schema "private" to "authenticated";
grant usage on schema "private" to "service_role";

grant delete on table "private"."humans" to "anon";
grant insert on table "private"."humans" to "anon";
grant references on table "private"."humans" to "anon";
grant select on table "private"."humans" to "anon";
grant trigger on table "private"."humans" to "anon";
grant truncate on table "private"."humans" to "anon";
grant update on table "private"."humans" to "anon";

grant delete on table "private"."humans" to "authenticated";
grant insert on table "private"."humans" to "authenticated";
grant references on table "private"."humans" to "authenticated";
grant select on table "private"."humans" to "authenticated";
grant trigger on table "private"."humans" to "authenticated";
grant truncate on table "private"."humans" to "authenticated";
grant update on table "private"."humans" to "authenticated";

grant delete on table "private"."humans" to "service_role";
grant insert on table "private"."humans" to "service_role";
grant references on table "private"."humans" to "service_role";
grant select on table "private"."humans" to "service_role";
grant trigger on table "private"."humans" to "service_role";
grant truncate on table "private"."humans" to "service_role";
grant update on table "private"."humans" to "service_role";
