'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Share2,
  MessageCircle,
  Copy,
  LogOut,
  Trash2,
  Check,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Flat, Profile } from '@/types/app.types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface GroupCardProps {
  group: Flat;
  members?: Profile[];
  isActive: boolean;
  isAdmin?: boolean;
  onSelectGroup?: (groupId: string) => void;
  onLeaveGroup?: (groupId: string) => Promise<boolean>;
  onDeleteGroup?: (groupId: string) => Promise<boolean>;
  onMakeAdmin?: (userId: string) => Promise<boolean>;
}

export function GroupCard({
  group,
  members = [],
  isActive,
  isAdmin = false,
  onSelectGroup,
  onLeaveGroup,
  onDeleteGroup,
  onMakeAdmin,
}: GroupCardProps) {
  const router = useRouter();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  function handleCopyCode() {
    navigator.clipboard.writeText(group.join_code);
    toast.success('Join code copied! 📋');
  }

  function handleShareWhatsApp() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const joinUrl = `${siteUrl}/register?code=${group.join_code}`;
    const message = `🛒 Join our "${group.name}" group on GrocerySync to add groceries together:\n\n👉 ${joinUrl}\n\nInvite Code: ${group.join_code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }

  async function handleShareLink() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const joinUrl = `${siteUrl}/register?code=${group.join_code}`;
    const text = `Join our "${group.name}" group on GrocerySync with code: ${group.join_code}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on GrocerySync`,
          text,
          url: joinUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      navigator.clipboard.writeText(`${text}\n${joinUrl}`);
      toast.success('Invite link copied to clipboard!');
    }
  }

  async function handleConfirmLeave() {
    if (!onLeaveGroup) return;
    setActionLoading(true);
    const success = await onLeaveGroup(group.id);
    setActionLoading(false);
    setShowLeaveConfirm(false);
    if (success) {
      toast.success(`You left "${group.name}"`);
    } else {
      toast.error('Failed to leave group');
    }
  }

  async function handleConfirmDelete() {
    if (!onDeleteGroup) return;
    setActionLoading(true);
    const success = await onDeleteGroup(group.id);
    setActionLoading(false);
    setShowDeleteConfirm(false);
    if (success) {
      toast.success(`"${group.name}" deleted`);
    } else {
      toast.error('Failed to delete group');
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all p-3.5 space-y-3',
        isActive
          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
      )}
    >
      {/* 1. Header: Icon + Name + Code + Active Badge */}
      <div className="flex items-start justify-between gap-2">
        <div
          onClick={() => onSelectGroup && onSelectGroup(group.id)}
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
        >
          <span className="text-2xl flex-shrink-0">{group.icon || '👥'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                {group.name}
              </h4>
              {isActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1 flex-shrink-0">
                  <Check size={11} strokeWidth={3} /> Active
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              Code: #{group.join_code}
            </p>
          </div>
        </div>

        {!isActive && onSelectGroup && (
          <button
            onClick={() => onSelectGroup(group.id)}
            className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
          >
            <span>Switch</span>
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* 2. Members List Preview */}
      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-850 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold px-0.5">
          <span className="flex items-center gap-1">
            <Users size={12} /> Members ({members.length})
          </span>
          {members.length > 0 && (
            <span className="text-[10px] font-normal text-zinc-400 truncate max-w-[150px]">
              {members.slice(0, 3).map((m) => m.name).join(', ')}
              {members.length > 3 && ` +${members.length - 3} more`}
            </span>
          )}
        </div>

        {/* Member Avatars Row */}
        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
          {members.length > 0 ? (
            members.map((m) => {
              const memberIsAdmin = m.role === 'admin';
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 text-xs shadow-2xs"
                  title={m.name}
                >
                  <Avatar name={m.name} src={m.avatar_url} id={m.id} size="sm" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 max-w-[85px] truncate">
                    {m.name}
                  </span>
                  {memberIsAdmin ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-0.5">
                      ⭐ Admin
                    </span>
                  ) : (
                    isAdmin && onMakeAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMakeAdmin(m.id);
                        }}
                        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer pl-0.5"
                        title="Promote this member to Admin"
                      >
                        + Make Admin
                      </button>
                    )
                  )}
                </div>
              );
            })
          ) : (
            <span className="text-[11px] text-zinc-400 italic px-1">
              No other members yet
            </span>
          )}
        </div>
      </div>

      {/* 3. Collab, Share & Actions directly on card */}
      <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800/80 space-y-2">
        {/* Invite Code row */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Invite Code</span>
            <p className="font-mono font-bold text-sm text-zinc-900 dark:text-white tracking-widest">
              {group.join_code}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-650 transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Copy Invite Code"
          >
            <Copy size={13} />
            <span>Copy Code</span>
          </button>
        </div>

        {/* WhatsApp & Share Link Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <MessageCircle size={14} />
            <span>Share WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition-all cursor-pointer"
          >
            <Share2 size={14} />
            <span>Share Link</span>
          </button>
        </div>

        {/* Group Actions: Leave & Delete (Delete is Admin Special Power!) */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {onLeaveGroup && (
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
            >
              <LogOut size={12} />
              <span>Leave Group</span>
            </button>
          )}

          {isAdmin && onDeleteGroup && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Delete group (Admin only)"
            >
              <Trash2 size={12} />
              <span>Delete Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Leave Confirmation Dialog */}
      {showLeaveConfirm && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
            <AlertTriangle size={15} />
            <span>Leave &quot;{group.name}&quot;?</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            You will no longer receive alerts or be able to add groceries to this group until re-invited.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLeave}
              disabled={actionLoading}
              className="flex-1 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              {actionLoading ? 'Leaving...' : 'Yes, Leave'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold">
            <AlertTriangle size={15} />
            <span>Delete &quot;{group.name}&quot;?</span>
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-300">
            This will permanently remove the group, its items, and ordering history for all members.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="flex-1 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {actionLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
