import type { Client } from "pg";

export interface ForeignKeyColumn {
  column: string;
  refColumn: string;
  refTable: string;
  table: string;
}

// Introspects every foreign key in the `public` schema directly from the
// Postgres catalog, so this stays correct as the schema evolves - nothing
// about individual tables/columns is hardcoded here.
export async function loadPublicForeignKeys(client: Client): Promise<ForeignKeyColumn[]> {
  const { rows } = await client.query<{
    column_name: string;
    ref_column_name: string;
    ref_table_name: string;
    table_name: string;
  }>(`
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confrelid::regclass::text as ref_table_name,
      af.attname as ref_column_name
    from pg_constraint c
    join unnest(c.conkey) with ordinality as ck(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = ck.attnum
    join unnest(c.confkey) with ordinality as fk(attnum, ord) on fk.ord = ck.ord
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = fk.attnum
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
    order by table_name, column_name
  `);

  return rows.map((row) => ({
    column: row.column_name,
    refColumn: row.ref_column_name,
    refTable: row.ref_table_name,
    table: row.table_name
  }));
}

export async function listPublicTables(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ table_name: string }>(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  return rows.map((row) => row.table_name);
}

/**
 * Ordered, insertable column names for a table - excludes generated
 * (`generated always as ... stored`) columns, which Postgres recomputes
 * automatically and refuses to accept in an explicit INSERT column list.
 */
export async function listInsertableColumns(client: Client, table: string): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and is_generated = 'NEVER'
      order by ordinal_position
    `,
    [table]
  );
  return rows.map((row) => row.column_name);
}

export async function tableRowCount(client: Client, table: string): Promise<number> {
  const { rows } = await client.query<{ count: string }>(
    `select count(*)::text as count from public.${quoteIdent(table)}`
  );
  return Number(rows[0]?.count ?? "0");
}

export function quoteIdent(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Refusing to quote unexpected identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}
