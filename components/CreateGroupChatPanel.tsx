import React, { useState } from "react";
import { Loader2, Plus, Users } from "lucide-react";
import * as api from "../services/api";

interface CreateGroupChatPanelProps {
  onCreated?: () => void;
}

export default function CreateGroupChatPanel({
  onCreated,
}: CreateGroupChatPanelProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteeIdsText, setInviteeIdsText] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateGroup() {
    if (!newGroupName.trim() || creatingGroup) return;

    const inviteeIds = inviteeIdsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    setCreatingGroup(true);
    setSuccess(null);
    setError(null);

    try {
      await api.createGroupChat({
        name: newGroupName.trim(),
        description: description.trim() || undefined,
        inviteeIds,
      });

      setSuccess("Group berhasil dibuat. User yang diinvite bisa melihatnya di tab Group Chat.");
      setNewGroupName("");
      setDescription("");
      setInviteeIdsText("");

      onCreated?.();
    } catch (err: any) {
      setError(err.message ?? "Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center">
          <Users size={24} />
        </div>

        <div>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white">
            Create Private Group
          </h3>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create a private group chat and invite the users you choose.
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-2xl p-3 text-sm font-bold">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-2xl p-3 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Group Name
          </label>

          <input
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Example: Diabetes Support Group"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Description
          </label>

          <textarea
            className="w-full min-h-[90px] px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Invite User IDs
          </label>

          <input
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="uid1, uid2, uid3"
            value={inviteeIdsText}
            onChange={(e) => setInviteeIdsText(e.target.value)}
          />

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            For now, we're still using user IDs separated by commas. Later, we can upgrade to searching for users by name or email.
          </p>
        </div>

        <button
          onClick={handleCreateGroup}
          disabled={creatingGroup || !newGroupName.trim()}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 font-black text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {creatingGroup ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          Create Group
        </button>
      </div>
    </div>
  );
}