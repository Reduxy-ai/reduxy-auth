import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Connection for queries
export const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

// Helper function for queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await sql.unsafe(text, params || [])
  return result as unknown as T[]
}
