import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createDatabaseClient } from './db'

async function main() {
  const sql = createDatabaseClient()
  const migrationsDirectory = join(process.cwd(), 'database', 'migrations')

  try {
    await sql`
      create table if not exists public.schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const [applied] = await sql<{ version: string }[]>`
        select version from public.schema_migrations where version = ${file}
      `

      if (applied) {
        console.log(`Migration ${file}: already applied`)
        continue
      }

      const migration = await readFile(join(migrationsDirectory, file), 'utf8')

      await sql.begin(async (transaction) => {
        await transaction.unsafe(migration)
        await transaction`
          insert into public.schema_migrations (version) values (${file})
        `
      })

      console.log(`Migration ${file}: applied`)
    }
  } finally {
    await sql.end()
  }
}

void main()
