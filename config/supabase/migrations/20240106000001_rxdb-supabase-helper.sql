-- Helper function for the RxDB replication-supabase plugin.
-- Performs a conditional UPDATE via RPC (HTTP POST) instead of a PATCH request
-- with all equality conditions as URL query parameters.
-- This avoids URL length limits when documents contain large text or JSON fields.
-- @see https://github.com/pubkey/rxdb/issues/7986
CREATE OR REPLACE FUNCTION _rxdb_supabase_conditional_update(
    p_table_name  text,
    p_pk_col      text,
    p_assumed_state jsonb,
    p_new_state   jsonb,
    p_deleted_col text DEFAULT '_deleted',
    p_modified_col text DEFAULT '_modified'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_pk_val       text;
    v_current      jsonb;
    v_assumed_clean jsonb;
    v_set_parts    text[] := '{}'::text[];
    v_key          text;
    v_value        jsonb;
BEGIN
    -- Extract the primary key value from the assumed state.
    v_pk_val := p_assumed_state ->> p_pk_col;
    IF v_pk_val IS NULL THEN
        RAISE EXCEPTION 'Primary key column "%" not found in assumed state', p_pk_col;
    END IF;

    -- Lock the row and read its current state as JSONB.
    -- FOR UPDATE prevents a concurrent UPDATE between our read and write.
    EXECUTE format(
        'SELECT to_jsonb(t.*) FROM (SELECT * FROM %I WHERE %I = $1 FOR UPDATE) t',
        p_table_name, p_pk_col
    ) INTO v_current USING v_pk_val;

    IF v_current IS NULL THEN
        -- Row not found; treat as conflict (return empty object to signal non-null = conflict).
        RETURN '{}'::jsonb;
    END IF;

    -- Strip internal RxDB fields that have no corresponding PostgreSQL column.
    v_assumed_clean := p_assumed_state - '_meta' - '_attachments' - '_rev';

    -- Remap RxDB's _deleted field to the actual PostgreSQL column name when they differ.
    IF p_deleted_col <> '_deleted' AND (v_assumed_clean ? '_deleted') THEN
        v_assumed_clean := (v_assumed_clean - '_deleted')
            || jsonb_build_object(p_deleted_col, v_assumed_clean -> '_deleted');
    END IF;

    -- Full equality check: every field in the cleaned assumed state must exactly
    -- match the corresponding field in the current row.
    IF NOT (v_current @> v_assumed_clean) THEN
        -- Conflict: the server state has changed since we last read it.
        RETURN v_current;
    END IF;

    -- Build the SET clause from the new document state.
    FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_new_state) LOOP
        -- Primary key is immutable; modified timestamp is maintained by the trigger.
        CONTINUE WHEN v_key = p_pk_col OR v_key = p_modified_col;
        -- Skip internal RxDB fields.
        CONTINUE WHEN v_key IN ('_meta', '_attachments', '_rev');

        IF v_value = 'null'::jsonb THEN
            v_set_parts := array_append(v_set_parts, format('%I = NULL', v_key));
        ELSIF jsonb_typeof(v_value) = 'boolean' THEN
            v_set_parts := array_append(v_set_parts, format('%I = %s', v_key, v_value::text));
        ELSIF jsonb_typeof(v_value) = 'number' THEN
            v_set_parts := array_append(v_set_parts, format('%I = %s', v_key, v_value::text));
        ELSE
            v_set_parts := array_append(v_set_parts, format('%I = %L', v_key, v_value #>> '{}'));
        END IF;
    END LOOP;

    IF array_length(v_set_parts, 1) IS NULL THEN
        -- Nothing to update; treat as success.
        RETURN NULL;
    END IF;

    -- Perform the UPDATE.
    EXECUTE format(
        'UPDATE %I SET %s WHERE %I = $1',
        p_table_name,
        array_to_string(v_set_parts, ', '),
        p_pk_col
    ) USING v_pk_val;

    -- NULL return value means the update succeeded without a conflict.
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION _rxdb_supabase_conditional_update(text, text, jsonb, jsonb, text, text)
    TO anon, authenticated, service_role;
