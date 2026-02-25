'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Mail, Lock } from 'lucide-react'

export function AccountSection() {
  const { user, updatePassword, updateEmail } = useAuth()

  // Email change
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

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
    </div>
  )
}
