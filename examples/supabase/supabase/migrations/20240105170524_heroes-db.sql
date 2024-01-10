create table "public"."heroes" (
    "name" character varying not null,
    "color" character varying not null,
    "updatedAt" bigint not null,
    "replicationRevision" character varying not null,
    "deleted" boolean not null
);


CREATE UNIQUE INDEX heroes_pkey ON public.heroes USING btree (name);

alter table "public"."heroes" add constraint "heroes_pkey" PRIMARY KEY using index "heroes_pkey";

grant delete on table "public"."heroes" to "anon";

grant insert on table "public"."heroes" to "anon";

grant references on table "public"."heroes" to "anon";

grant select on table "public"."heroes" to "anon";

grant trigger on table "public"."heroes" to "anon";

grant truncate on table "public"."heroes" to "anon";

grant update on table "public"."heroes" to "anon";

grant delete on table "public"."heroes" to "authenticated";

grant insert on table "public"."heroes" to "authenticated";

grant references on table "public"."heroes" to "authenticated";

grant select on table "public"."heroes" to "authenticated";

grant trigger on table "public"."heroes" to "authenticated";

grant truncate on table "public"."heroes" to "authenticated";

grant update on table "public"."heroes" to "authenticated";

grant delete on table "public"."heroes" to "service_role";

grant insert on table "public"."heroes" to "service_role";

grant references on table "public"."heroes" to "service_role";

grant select on table "public"."heroes" to "service_role";

grant trigger on table "public"."heroes" to "service_role";

grant truncate on table "public"."heroes" to "service_role";

grant update on table "public"."heroes" to "service_role";

-- add a table to the publication
alter publication supabase_realtime add table "public"."heroes";