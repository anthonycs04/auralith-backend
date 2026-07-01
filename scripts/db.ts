import 'dotenv/config'
import postgres from 'postgres'

export function createDatabaseClient(max = 1) {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL no esta configurado.')
  }

  return postgres(databaseUrl, {
    max,
    prepare: false,
    ssl: process.env.DATABASE_SSL === 'false' ? false : 'require',
  })
}
