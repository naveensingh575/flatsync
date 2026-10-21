'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
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
  onSelectGroup?: (groupId: string) => void;
  onLeaveGroup?: (groupId: string) => Promise<boolean>;
  onDeleteGroup?: (groupId: string) => Promise<boolean>;
}

export function GroupCard({
  group,
  members = [],
  isActive,
  onSelectGroup,
  onLeaveGroup,
  onDeleteGroup,
}: GroupCardProps) {
  const router = useRouter();
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  function handleCopyInvite() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const joinUrl = `${siteUrl}/onboarding?code=${group.join_code}`;
    navigator.clipboard.writeText(`Join "${group.name}" on FlatSync:\n${joinUrl}\nInvite Code: ${group.join_code}`);
    toast.success('Invite link & code copied! 📋');
    setShowInviteMenu(false);
  }

  function handleShareWhatsApp() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flatsync-psi.vercel.app';
    const joinUrl = `${siteUrl}/onboarding?code=${group.join_code}`;
    const message = `🛒 Join our "${group.name}" group on FlatSync to add groceries together:\n\n👉 ${joinUrl}\n\nInvite Code: ${group.join_code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    setShowInviteMenu(false);
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
      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-semibold px-0.5">
          <span className="flex items-center gap-1">
            <Users size={12} /> Members ({members.length})
          </span>
          {members.length > 0 && (
            <span className="text-[10px] font-normal text-zinc-400 truncate max-w-[140px]">
              {members.slice(0, 3).map((m) => m.name).join(', ')}
              {members.length > 3 && ` +${members.length - 3} more`}
            </span>
          )}
        </div>

        {/* Member Avatars Row */}
        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
          {members.length > 0 ? (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 text-[11px]"
                title={m.name}
              >
                <Avatar name={m.name} src={m.avatar_url} id={m.id} size="sm" />
                <span className="font-medium text-zinc-700 dark:text-zinc-300 max-w-[70px] truncate">
                  {m.name}
                </span>
              </div>
            ))
          ) : (
            <span className="text-[11px] text-zinc-400 italic px-1">
              No other members yet
            </span>
          )}
        </div>
      </div>

      {/* 3. Actions Row: Invite, Leave, Delete */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        {/* Add People / Invite Button */}
        <div className="relative">
          <button
            onClick={() => setShowInviteMenu(!showInviteMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus size={13} />
            <span>Add People</span>
          </button>

          {/* Quick Invite Popover */}
          {showInviteMenu && (
            <div className="absolute left-0 bottom-full mb-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-1.5 space-y-1">
              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                <MessageCircle size={14} />
                <span>Share WhatsApp</span>
              </button>
              <button
                onClick={handleCopyInvite}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Copy size={14} />
                <span>Copy Invite Link</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Leave Group Button */}
          {onLeaveGroup && (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
              title={`Leave ${group.name}`}
            >
              <LogOut size={14} />
            </button>
          )}

          {/* Delete Group Button */}
          {onDeleteGroup && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title={`Delete ${group.name}`}
            >
              <Trash2 size={14} />
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
