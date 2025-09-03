create extension if not exists moddatetime schema extensions;

create table "public"."humans" (
    "passportId" text primary key,
    "firstName" text not null,
    "lastName" text not null,
    "age" integer,

    "_deleted" boolean DEFAULT false NOT NULL,
    "_modified" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TRIGGER update_modified_datetime BEFORE UPDATE ON public.humans FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('_modified');

grant delete on table "public"."humans" to "anon";

grant insert on table "public"."humans" to "anon";

grant references on table "public"."humans" to "anon";

grant select on table "public"."humans" to "anon";

grant trigger on table "public"."humans" to "anon";

grant truncate on table "public"."humans" to "anon";

grant update on table "public"."humans" to "anon";

grant delete on table "public"."humans" to "authenticated";

grant insert on table "public"."humans" to "authenticated";

grant references on table "public"."humans" to "authenticated";

grant select on table "public"."humans" to "authenticated";

grant trigger on table "public"."humans" to "authenticated";

grant truncate on table "public"."humans" to "authenticated";

grant update on table "public"."humans" to "authenticated";

grant delete on table "public"."humans" to "service_role";

grant insert on table "public"."humans" to "service_role";

grant references on table "public"."humans" to "service_role";

grant select on table "public"."humans" to "service_role";

grant trigger on table "public"."humans" to "service_role";

grant truncate on table "public"."humans" to "service_role";

grant update on table "public"."humans" to "service_role";

-- add a table to the publication
alter publication supabase_realtime add table "public"."humans";
