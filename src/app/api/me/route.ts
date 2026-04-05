import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(null, { status: 401 })
  }

  const supabase = await createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.userId)
    .single()

  return NextResponse.json(profile)
}
