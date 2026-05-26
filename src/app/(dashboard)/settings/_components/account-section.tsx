'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Mail, Lock, Trash2, LogOut } from 'lucide-react'

export function AccountSection() {
  const { user, updatePassword, updateEmail, signOut } = useAuth()
  const router = useRouter()

  // Email change
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Sign out
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    router.replace('/login')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Could not delete account')
        setDeleting(false)
        return
      }
      await signOut()
      router.replace('/login?deleted=1')
    } catch {
      toast.error('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  const handleEmailChange = async () => {
    if (!newEmail) return
    setEmailSaving(true)
    const { error } = await updateEmail(newEmail)
    setEmailSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Verification email sent to ${newEmail}`)
      setShowEmailForm(false)
      setNewEmail('')
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setPasswordSaving(true)
    const { error } = await updatePassword(newPassword)
    setPasswordSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">Manage your personal account settings.</p>
      </div>

      {/* Email */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {!showEmailForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowEmailForm(true)}>
              Change email
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-email">New email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="new@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleEmailChange} disabled={!newEmail || emailSaving}>
                  {emailSaving ? 'Sending...' : 'Send verification'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowEmailForm(false); setNewEmail('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            size="sm"
            onClick={handlePasswordChange}
            disabled={!newPassword || !confirmPassword || passwordSaving}
          >
            {passwordSaving ? 'Updating...' : 'Update password'}
          </Button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card variant="glass" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card variant="glass" className="rounded-2xl border-destructive/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Permanently delete your Loyalink account. Studios you solely own, along with all
            customers, transactions, wallet passes, and settings, will be deleted immediately.
            This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setDeleteOpen(true); setDeleteConfirm('') }}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete your account?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              This will permanently delete your account and every studio you solely own, along with
              all customer data, transactions, wallet passes, and settings. Other studios where
              you are a co-owner or member will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="delete-confirm" className="text-xs text-muted-foreground uppercase tracking-wider">
              Type <span className="font-mono text-foreground">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
