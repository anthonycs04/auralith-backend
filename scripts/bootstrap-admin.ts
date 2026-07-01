import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { createDatabaseClient } from './db'

const url = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const displayName = process.env.ADMIN_DISPLAY_NAME ?? 'Administrador Auralith'

if (!url || !secretKey || !email || !password) {
  throw new Error('Faltan variables SUPABASE_URL, SUPABASE_SECRET_KEY o ADMIN_*.')
}

async function main() {
  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const sql = createDatabaseClient()

  try {
    const { data: listed, error: listError } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (listError) {
      throw listError
    }

    let user = listed.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    )

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { display_name: displayName },
      })

      if (error) {
        throw error
      }

      user = data.user
    } else {
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: true,
        password,
        user_metadata: { display_name: displayName },
      })

      if (error) {
        throw error
      }

      user = data.user
    }

    await sql`
      insert into public.profiles (id, email, display_name, role, active)
      values (${user.id}, ${email}, ${displayName}, 'admin', true)
      on conflict (id) do update set
        email = excluded.email,
        display_name = excluded.display_name,
        role = 'admin',
        active = true,
        updated_at = now()
    `

    console.log(`Admin ${email}: ready`)
  } finally {
    await sql.end()
  }
}

void main()
