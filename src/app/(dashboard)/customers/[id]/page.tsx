'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCustomer, useUpdateCustomer } from '@/hooks/use-customers'
import { useCustomerPasses, useGeneratePass } from '@/hooks/use-wallet'
import { useStudio } from '@/hooks/use-studio'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { TRANSACTION_TYPES } from '@/lib/constants'
import { PASS_SERVICE_URL } from '@/lib/constants'
import type { Transaction } from '@/types/database'
import { ArrowLeft, CreditCard, Download, Percent, Plus, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: customer, isLoading } = useCustomer(params.id)
  const { data: passes } = useCustomerPasses(params.id)
  const { currentStudio } = useStudio()
  const updateCustomer = useUpdateCustomer()
  const generatePass = useGeneratePass()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: transactions } = useQuery({
    queryKey: ['transactions', params.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false })
      return data as Transaction[]
    },
    enabled: !!params.id,
  })

  const addTransaction = useMutation({
    mutationFn: async (tx: { type: string; amount: number; description: string }) => {
      const { error } = await supabase.from('transactions').insert({
        customer_id: params.id,
        studio_id: currentStudio!.id,
        ...tx,
      })
      if (error) throw error

      const delta = tx.type === 'credit' || tx.type === 'cashback' ? tx.amount : -tx.amount
      await supabase
        .from('customers')
        .update({ balance: Number(customer!.balance) + delta })
        .eq('id', params.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', params.id] })
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
    },
  })

  const [txForm, setTxForm] = useState({ type: 'credit', amount: '', description: '' })
  const [txOpen, setTxOpen] = useState(false)

  if (isLoading || !customer) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-4 w-32 animate-shimmer rounded" />
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const handleAddTx = async () => {
    await addTransaction.mutateAsync({
      type: txForm.type,
      amount: parseFloat(txForm.amount),
      description: txForm.description,
    })
    setTxForm({ type: 'credit', amount: '', description: '' })
    setTxOpen(false)
  }

  const handleGeneratePass = async () => {
    if (!currentStudio) return
    await generatePass.mutateAsync({
      customerId: customer.id,
      studioId: currentStudio.id,
      templateId: '',
    })
  }

  const stageColors: Record<string, string> = {
    bronze: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    silver: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20',
    gold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    platinum: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  }

  return (
    <div className="space-y-6 stagger-children">
      {/* Back + Header */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Customers
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xl font-semibold text-foreground">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-display-lg text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{customer.name}</h1>
              <p className="text-sm text-muted-foreground">{customer.email ?? customer.phone ?? 'No contact'}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs uppercase tracking-wider ${
              stageColors[customer.loyalty_stage] ?? stageColors.bronze
            }`}
          >
            {customer.loyalty_stage}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{Number(customer.balance).toFixed(2)} kr</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Cashback Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{customer.cashback_rate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Wallet Pass</span>
            </div>
            {passes?.length ? (
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {passes[0].platform} - {passes[0].status}
                </Badge>
                <a
                  href={`${PASS_SERVICE_URL}/api/passes/${passes[0].serial_number}/download`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleGeneratePass} disabled={generatePass.isPending} className="mt-1">
                {generatePass.isPending ? 'Generating...' : 'Generate Pass'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Transactions</CardTitle>
            <Dialog open={txOpen} onOpenChange={setTxOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
                    <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v })}>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                    <Input
                      value={txForm.description}
                      onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                      placeholder="Optional description"
                      className="bg-secondary/50"
                    />
                  </div>
                  <Button onClick={handleAddTx} className="w-full" disabled={!txForm.amount || addTransaction.isPending}>
                    {addTransaction.isPending ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!transactions?.length ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                      tx.type === 'credit' || tx.type === 'cashback'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'credit' || tx.type === 'cashback' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description ?? tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    tx.type === 'credit' || tx.type === 'cashback' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'credit' || tx.type === 'cashback' ? '+' : '-'}
                    {Math.abs(Number(tx.amount)).toFixed(2)} kr
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
