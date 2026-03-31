'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { userApi } from '@/utils/api';
import ProtectedRoute from '@/components/ProtectedRoute';

const membershipStyles: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400',
  basic: 'bg-cyan-500/10 text-cyan-400',
  premium: 'bg-amber-500/10 text-amber-400',
  vip: 'bg-purple-500/10 text-purple-400',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return <ProtectedRoute><div /></ProtectedRoute>;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await userApi.updateProfile({ name: name.trim() });
      setSuccess('Profile updated successfully');
      setEditing(false);
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-8">
        Profile
      </h1>

      <div className="bg-surface border border-border rounded-xl max-w-xl">
        {/* Header with avatar */}
        <div className="p-6 flex items-center gap-5 border-b border-border">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-hover border-2 border-border flex items-center justify-center">
              <span className="text-2xl text-muted">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            ) : (
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
            )}
            <p className="text-muted text-sm mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <span className="text-sm text-muted">Membership</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${membershipStyles[user.membershipLevel] || membershipStyles.free}`}>
              {user.membershipLevel.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border/50">
            <span className="text-sm text-muted">Token Balance</span>
            <span className="text-sm font-medium text-foreground">{user.tokenBalance} tokens</span>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          {/* Actions */}
          {editing ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setName(user.name); setError(''); }}
                className="h-10 px-5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={() => { setEditing(true); setSuccess(''); }}
                className="h-10 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
