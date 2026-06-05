import React, { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, Users, X } from "lucide-react";
import * as api from "../services/api";

interface CreateGroupChatPanelProps {
  onCreated?: () => void;
}

export default function CreateGroupChatPanel({
  onCreated,
}: CreateGroupChatPanelProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteeQuery, setInviteeQuery] = useState("");
  const [inviteeResults, setInviteeResults] = useState<
    api.GroupInviteeSearchResult[]
  >([]);
  const [selectedInvitees, setSelectedInvitees] = useState<
    api.GroupInviteeSearchResult[]
  >([]);
  const [searchingInvitees, setSearchingInvitees] = useState(false);
  const [isInviteeListOpen, setIsInviteeListOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const query = inviteeQuery.trim();
    if (query.length < 2) {
      setInviteeResults([]);
      setSearchingInvitees(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    const timeoutId = window.setTimeout(async () => {
      setSearchingInvitees(true);

      try {
        const response = await api.searchGroupInvitees(query);
        if (requestId !== searchRequestRef.current) return;

        const selectedIds = new Set(selectedInvitees.map((user) => user.id));
        setInviteeResults(
          response.users.filter((user) => !selectedIds.has(user.id)),
        );
        setIsInviteeListOpen(true);
      } catch (err: any) {
        if (requestId !== searchRequestRef.current) return;
        setInviteeResults([]);
        setError(err.message ?? "Gagal mencari user.");
      } finally {
        if (requestId === searchRequestRef.current) {
          setSearchingInvitees(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [inviteeQuery, selectedInvitees]);

  function selectInvitee(user: api.GroupInviteeSearchResult) {
    setSelectedInvitees((current) =>
      current.some((item) => item.id === user.id)
        ? current
        : [...current, user],
    );
    setInviteeQuery("");
    setInviteeResults([]);
    setIsInviteeListOpen(false);
    setError(null);
  }

  function removeInvitee(userId: string) {
    setSelectedInvitees((current) =>
      current.filter((user) => user.id !== userId),
    );
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || creatingGroup) return;

    setCreatingGroup(true);
    setSuccess(null);
    setError(null);

    try {
      await api.createGroupChat({
        name: newGroupName.trim(),
        description: description.trim() || undefined,
        inviteeIds: selectedInvitees.map((user) => user.id),
      });

      setSuccess(
        "Group berhasil dibuat. User yang diinvite bisa melihatnya di tab Group Chat.",
      );
      setNewGroupName("");
      setDescription("");
      setInviteeQuery("");
      setInviteeResults([]);
      setSelectedInvitees([]);

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
            Invite Users
          </label>

          <div className="relative">
            <div className="min-h-[50px] flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500">
              {selectedInvitees.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-100 dark:bg-brand-950 px-3 py-1.5 text-sm font-bold text-brand-700 dark:text-brand-300"
                >
                  {user.displayName}
                  <button
                    type="button"
                    onClick={() => removeInvitee(user.id)}
                    className="rounded-full text-brand-500 hover:bg-brand-200 hover:text-brand-800 dark:hover:bg-brand-900 dark:hover:text-white"
                    aria-label={`Hapus ${user.displayName} dari daftar invite`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}

              <div className="flex min-w-[180px] flex-1 items-center gap-2">
                <Search size={16} className="shrink-0 text-zinc-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
                  placeholder={
                    selectedInvitees.length > 0
                      ? "Search Another User..."
                      : "Type the username..."
                  }
                  value={inviteeQuery}
                  onChange={(e) => {
                    setInviteeQuery(e.target.value);
                    setIsInviteeListOpen(true);
                    setError(null);
                  }}
                  onFocus={() => setIsInviteeListOpen(true)}
                  onBlur={() =>
                    window.setTimeout(() => setIsInviteeListOpen(false), 150)
                  }
                  autoComplete="off"
                />
                {searchingInvitees && (
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin text-brand-500"
                  />
                )}
              </div>
            </div>

            {isInviteeListOpen && inviteeQuery.trim().length >= 2 && (
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                {!searchingInvitees && inviteeResults.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    User Not Found.
                  </p>
                ) : (
                  inviteeResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectInvitee(user)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-zinc-900 dark:text-white">
                          {user.displayName}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Type at least 2 characters, then click the user name. You can select
            more than one user.
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
