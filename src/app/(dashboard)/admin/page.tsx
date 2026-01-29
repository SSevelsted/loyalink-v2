'use client'

import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Studio } from '@/types/database'

export default function AdminPage() {
  const { membership } = useStudio()
  const supabase = createClient()

  const { data: allStudios } = useQuery({
    queryKey: ['admin_studios'],
    queryFn: async () => {
      const { data } = await supabase
        .from('studios')
        .select('*, studio_members(count), customers(count)')
        .order('created_at', { ascending: false })
      return data as (Studio & {
        studio_members: { count: number }[]
        customers: { count: number }[]
      })[]
    },
    enabled: membership?.role === 'super_admin',
  })

  if (membership?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Super Admin</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Studios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allStudios?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {allStudios?.reduce((s, st) => s + (st.studio_members?.[0]?.count ?? 0), 0) ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {allStudios?.reduce((s, st) => s + (st.customers?.[0]?.count ?? 0), 0) ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Studios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allStudios?.map((studio) => (
                <TableRow key={studio.id}>
                  <TableCell className="font-medium">{studio.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{studio.slug}</Badge>
                  </TableCell>
                  <TableCell>{studio.studio_members?.[0]?.count ?? 0}</TableCell>
                  <TableCell>{studio.customers?.[0]?.count ?? 0}</TableCell>
                  <TableCell>{new Date(studio.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
