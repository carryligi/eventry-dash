'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface UserSearchProps {
  initialQuery?: string
}

export function UserSearch({ initialQuery = '' }: UserSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  const handleSearch = (value: string) => {
    setQuery(value)
    const params = new URLSearchParams()
    if (value.trim()) params.set('q', value.trim())
    router.push(`/dashboard/admin/users${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
        style={{ color: 'var(--text-tertiary)' }}
      />
      <Input
        placeholder="Search users..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9 h-9"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}
