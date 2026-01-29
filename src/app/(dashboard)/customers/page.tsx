'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCustomers, useCreateCustomer } from '@/hooks/use-customers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Users, ChevronRight } from 'lucide-react'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const { data: customers, isLoading } = useCustomers(search)
  const createCustomer = useCreateCustomer()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  const handleCreate = async () => {
    await createCustomer.mutateAsync(form)
    setForm({ name: '', email: '', phone: '' })
    setOpen(false)
  }

  const stageColors: Record<string, string> = {
    bronze: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    silver: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20',
    gold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    platinum: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers?.length ?? 0} total customers
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
                  className="bg-secondary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+45 12 34 56 78"
                  className="bg-secondary/50"
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.name || createCustomer.isPending}>
                {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border/50 h-12"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : !customers?.length ? (
        <div className="py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No customers found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add your first customer to get started</p>
        </div>
      ) : (
        <div className="space-y-1">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3.5 transition-all duration-200 hover:bg-card hover:border-border/50 group min-h-[56px]"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {customer.email ?? customer.phone ?? 'No contact info'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-foreground">
                    {Number(customer.balance).toFixed(0)} kr
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase tracking-wider ${
                    stageColors[customer.loyalty_stage] ?? stageColors.bronze
                  }`}
                >
                  {customer.loyalty_stage}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
