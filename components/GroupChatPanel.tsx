import React, { useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  Info,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  MoreVertical,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import * as api from "../services/api";
import type { GroupChat, GroupChatMessage } from "../services/api";
import type { UserProfile } from "../types";

interface GroupChatPanelProps {
  userStats: UserProfile;
  refreshKey?: number;
}

type GroupMemberDetail = {
  id: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: "owner" | "admin" | "member" | string;
  status?: "invited" | "joined" | "left" | string;
};

type GroupChatMessageWithMeta = GroupChatMessage & {
  type?: "text" | "system" | string;
  eventType?: "member_invited" | "member_joined" | "member_left" | string;
  actorId?: string;
  actorName?: string;
  targetUserIds?: string[];
};

export default function GroupChatPanel({
  userStats,
  refreshKey = 0,
}: GroupChatPanelProps) {
  void userStats;

  const currentUserId = getAuth().currentUser?.uid ?? null;

  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<GroupChatMessageWithMeta[]>([]);
  const [text, setText] = useState("");

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const [inviteeQuery, setInviteeQuery] = useState("");
  const [inviteeResults, setInviteeResults] = useState<
    api.GroupInviteeSearchResult[]
  >([]);
  const [selectedInvitees, setSelectedInvitees] = useState<
    api.GroupInviteeSearchResult[]
  >([]);
  const [searchingInvitees, setSearchingInvitees] = useState(false);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchRequestRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeStatus = activeGroup?.currentMember?.status ?? "invited";
  const canReadMessages = Boolean(activeGroup && activeStatus === "joined");
  const activeMembers = activeGroup ? getGroupMembers(activeGroup) : [];

  function getGroupMembers(group: GroupChat): GroupMemberDetail[] {
    const richMembers = (group as GroupChat & { members?: GroupMemberDetail[] })
      .members;

    if (Array.isArray(richMembers) && richMembers.length > 0) {
      return richMembers
        .map((member) => ({
          ...member,
          id: member.id ?? member.userId ?? "",
          userId: member.userId ?? member.id,
        }))
        .filter((member) => member.id && member.status !== "left");
    }

    return (group.memberIds ?? []).map((id) => ({
      id,
      displayName: currentUserId === id ? "You" : `Member ${id.slice(0, 6)}`,
      role: currentUserId === id ? group.currentMember?.role : undefined,
      status: currentUserId === id ? group.currentMember?.status : undefined,
    }));
  }

  function resetInviteeState() {
    setInviteeQuery("");
    setInviteeResults([]);
    setSelectedInvitees([]);
    setSearchingInvitees(false);
  }

  function closeOverlays() {
    setMenuOpen(false);
    setInfoOpen(false);
    setAddMemberOpen(false);
    setLeaveConfirmOpen(false);
  }

  function openGroup(group: GroupChat) {
    setActiveGroup(group);
    setMessages([]);
    setText("");
    setSuccess(null);
    setError(null);
    resetInviteeState();
    closeOverlays();
  }

  function goBackToGroups() {
    setActiveGroup(null);
    setMessages([]);
    setText("");
    setSuccess(null);
    setError(null);
    resetInviteeState();
    closeOverlays();
  }

  async function loadGroups() {
    setLoadingGroups(true);
    setError(null);

    try {
      const res = await api.getGroupChats();
      setGroups(res.groups);

      if (activeGroup) {
        const updatedActiveGroup = res.groups.find(
          (group) => group.id === activeGroup.id,
        );

        if (updatedActiveGroup) {
          setActiveGroup(updatedActiveGroup);
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load group chats.");
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadMessages(groupId: string) {
    setLoadingMessages(true);
    setError(null);

    try {
      const res = await api.getGroupMessages(groupId);
      setMessages(res.messages);
    } catch (err: any) {
      setError(err.message ?? "Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadGroups().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (!activeGroup) return;

    const status = activeGroup.currentMember?.status;

    if (status !== "joined") {
      setMessages([]);
      return;
    }

    loadMessages(activeGroup.id).catch(console.error);

    const interval = window.setInterval(() => {
      loadMessages(activeGroup.id).catch(console.error);
    }, 2500);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id, activeGroup?.currentMember?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeGroup?.id]);

  useEffect(() => {
    if (!addMemberOpen || !activeGroup) return;

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

        const blockedIds = new Set([
          ...(activeGroup.memberIds ?? []),
          ...getGroupMembers(activeGroup).map(
            (member) => member.userId ?? member.id,
          ),
          ...selectedInvitees.map((user) => user.id),
        ]);

        setInviteeResults(
          response.users.filter((user) => !blockedIds.has(user.id)),
        );
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
  }, [activeGroup, addMemberOpen, inviteeQuery, selectedInvitees]);

  async function handleAcceptInvite() {
    if (!activeGroup || acceptingInvite) return;

    setAcceptingInvite(true);
    setError(null);
    setSuccess(null);

    try {
      await api.acceptGroupInvite(activeGroup.id);

      const res = await api.getGroupChats();
      setGroups(res.groups);

      const updatedGroup = res.groups.find(
        (group) => group.id === activeGroup.id,
      );

      if (updatedGroup) {
        setActiveGroup(updatedGroup);

        if (updatedGroup.currentMember?.status === "joined") {
          const messagesRes = await api.getGroupMessages(updatedGroup.id);
          setMessages(messagesRes.messages);
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to accept invite.");
    } finally {
      setAcceptingInvite(false);
    }
  }

  async function handleSend() {
    if (!activeGroup || !text.trim() || sending) return;

    if (activeGroup.currentMember?.status !== "joined") {
      setError("Accept the invite first before sending messages.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const sent = await api.sendGroupMessage(activeGroup.id, text.trim());
      setMessages((prev) => [...prev, sent]);
      setText("");
      await loadGroups();
    } catch (err: any) {
      setError(err.message ?? "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function selectInvitee(user: api.GroupInviteeSearchResult) {
    setSelectedInvitees((current) =>
      current.some((item) => item.id === user.id)
        ? current
        : [...current, user],
    );
    setInviteeQuery("");
    setInviteeResults([]);
    setError(null);
  }

  function removeInvitee(userId: string) {
    setSelectedInvitees((current) =>
      current.filter((user) => user.id !== userId),
    );
  }

  async function handleAddMembers() {
    if (!activeGroup || selectedInvitees.length === 0 || addingMembers) return;

    setAddingMembers(true);
    setError(null);
    setSuccess(null);

    try {
      await api.addGroupMembers(
        activeGroup.id,
        selectedInvitees.map((user) => user.id),
      );

      setSuccess("Successful added member to group");
      setAddMemberOpen(false);
      resetInviteeState();

      const res = await api.getGroupChats();
      setGroups(res.groups);

      const updatedGroup = res.groups.find(
        (group) => group.id === activeGroup.id,
      );
      if (updatedGroup) setActiveGroup(updatedGroup);
    } catch (err: any) {
      setError(err.message ?? "Failed to add member.");
    } finally {
      setAddingMembers(false);
    }
  }

  async function handleLeaveGroup() {
    if (!activeGroup || leavingGroup) return;

    setLeavingGroup(true);
    setError(null);
    setSuccess(null);

    try {
      await api.leaveGroupChat(activeGroup.id);
      goBackToGroups();
      await loadGroups();
    } catch (err: any) {
      setError(err.message ?? "Failed to leave group.");
    } finally {
      setLeavingGroup(false);
    }
  }

  if (activeGroup) {
    return (
      <>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[640px] overflow-hidden">
          <div className="relative grid grid-cols-[44px_1fr_44px] items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 p-3">
            <button
              type="button"
              onClick={goBackToGroups}
              className="h-11 w-11 rounded-2xl flex items-center justify-center text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Back to group chat list"
            >
              <ArrowLeft size={22} />
            </button>

            <div className="min-w-0 text-center">
              <h3 className="truncate text-base font-black text-zinc-900 dark:text-white">
                {activeGroup.name}
              </h3>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {activeStatus === "joined"
                  ? `${activeGroup.memberIds?.length ?? 0} members`
                  : "You were invited to this private group"}
              </p>
            </div>

            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Open group menu"
              >
                <MoreVertical size={22} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-30 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => {
                      setInfoOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Info size={18} className="text-brand-500" />
                    Group Info Detail
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddMemberOpen(true);
                      setMenuOpen(false);
                    }}
                    disabled={activeStatus !== "joined"}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <UserPlus size={18} className="text-brand-500" />
                    Add Member
                  </button>

                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setLeaveConfirmOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-black text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut size={18} />
                    Leave Group
                  </button>
                </div>
              )}
            </div>
          </div>

          {(error || success) && (
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {success}
                </div>
              )}
            </div>
          )}

          {activeStatus === "invited" ? (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div>
                <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
                  <Lock size={28} />
                </div>
                <h4 className="font-black text-zinc-900 dark:text-white mb-2">
                  Invitation not received
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-5">
                  You've been invited to this group, but you won't be able to
                  read the messages until you click Accept Invite.
                </p>
                <button
                  type="button"
                  onClick={handleAcceptInvite}
                  disabled={acceptingInvite}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-black inline-flex items-center gap-2"
                >
                  {acceptingInvite && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Accept Invite
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-zinc-50/60 dark:bg-zinc-950/40">
                {loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 py-8">
                    <Loader2 size={16} className="animate-spin" />
                    Loading messages...
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="grid place-items-center h-full text-center">
                    <div>
                      <div className="w-16 h-16 rounded-3xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={28} />
                      </div>
                      <h4 className="font-black text-zinc-900 dark:text-white mb-1">
                        No messages yet
                      </h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Start the conversation with your group.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isSystemMessage =
                    msg.type === "system" || msg.senderId === "system";
                  const isMine = Boolean(
                    currentUserId && msg.senderId === currentUserId,
                  );
                  const sentAt = new Date(msg.createdAt).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );

                  if (isSystemMessage) {
                    return (
                      <div key={msg.id} className="flex justify-center px-3">
                        <div
                          title={sentAt}
                          className="max-w-[86%] rounded-full bg-zinc-200/80 px-3 py-1.5 text-center text-[11px] font-bold text-zinc-600 shadow-sm dark:bg-zinc-800/90 dark:text-zinc-300"
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 ${
                          isMine
                            ? "bg-brand-500 text-white"
                            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                        }`}
                      >
                        {!isMine && (
                          <div className="text-xs font-black text-zinc-500 dark:text-zinc-400 mb-1">
                            {msg.senderName}
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-line">
                          {msg.text}
                        </div>
                        <div
                          className={`text-[10px] mt-1 ${
                            isMine
                              ? "text-white/70"
                              : "text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          {sentAt}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                <input
                  className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Type a message..."
                  value={text}
                  disabled={!canReadMessages}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend().catch(console.error);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSend().catch(console.error)}
                  disabled={sending || !text.trim() || !canReadMessages}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 font-black flex items-center justify-center"
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </>
          )}
        </section>

        {infoOpen && (
          <div className="fixed inset-0 z-200 flex justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <aside className="flex h-full w-full max-w-md flex-col overflow-hidden border-zinc-200 bg-zinc-100 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:h-[92vh] sm:rounded-3xl sm:border">
              <div className="grid grid-cols-[44px_1fr_44px] items-center border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  aria-label="Close group info"
                >
                  <ArrowLeft size={22} />
                </button>
                <h3 className="text-center text-base font-black text-zinc-900 dark:text-white">
                  Group info
                </h3>
                <span />
              </div>

              <div className="flex-1 overflow-y-auto">
                <section className="border-b border-zinc-200 bg-white px-6 py-7 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-brand-100 text-4xl font-black text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {activeGroup.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="truncate text-2xl font-black text-zinc-900 dark:text-white">
                    {activeGroup.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    Group · {activeMembers.length} members
                  </p>
                </section>

                <section className="mt-3 border-y border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="mb-1 text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Description
                  </p>
                  <p className="whitespace-pre-line text-sm font-medium leading-6 text-zinc-700 dark:text-zinc-200">
                    {activeGroup.description?.trim() || "No description yet."}
                  </p>
                </section>

                <section className="mt-3 border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-black text-zinc-500 dark:text-zinc-400">
                      {activeMembers.length} members
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInfoOpen(false);
                      setAddMemberOpen(true);
                    }}
                    disabled={activeStatus !== "joined"}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800/70"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white">
                      <UserPlus size={20} />
                    </span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white">
                      Add member
                    </span>
                  </button>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {activeMembers.map((member) => {
                      const displayName = member.displayName ?? member.id;
                      const isCurrentUser =
                        Boolean(currentUserId) &&
                        (member.userId === currentUserId ||
                          member.id === currentUserId);

                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt=""
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-200 text-sm font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-zinc-900 dark:text-white">
                                {isCurrentUser ? "You" : displayName}
                              </p>
                              {member.role === "owner" && (
                                <span className="rounded-full border border-brand-200 px-2 py-0.5 text-[10px] font-black uppercase text-brand-600 dark:border-brand-900 dark:text-brand-300">
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              {member.status === "invited"
                                ? "Invited"
                                : member.role === "owner"
                                  ? "Group owner"
                                  : "Member"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-3 border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => {
                      setInfoOpen(false);
                      setLeaveConfirmOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                      <LogOut size={20} />
                    </span>
                    <span className="text-sm font-black">Exit group</span>
                  </button>
                </section>
              </div>
            </aside>
          </div>
        )}

        {addMemberOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-brand-500">
                    Add Member
                  </p>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    {activeGroup.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(false);
                    resetInviteeState();
                  }}
                  className="rounded-2xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                  aria-label="Close add member"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4">
                <div className="relative">
                  <div className="min-h-[50px] flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500 dark:border-zinc-800 dark:bg-zinc-950">
                    {selectedInvitees.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-1.5 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                      >
                        {user.displayName}
                        <button
                          type="button"
                          onClick={() => removeInvitee(user.id)}
                          className="rounded-full text-brand-500 hover:bg-brand-200 hover:text-brand-800 dark:hover:bg-brand-900 dark:hover:text-white"
                          aria-label={`Remove ${user.displayName}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}

                    <div className="flex min-w-[180px] flex-1 items-center gap-2">
                      <Search size={16} className="shrink-0 text-zinc-400" />
                      <input
                        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
                        placeholder="Search user..."
                        value={inviteeQuery}
                        onChange={(e) => {
                          setInviteeQuery(e.target.value);
                          setError(null);
                        }}
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

                  {inviteeQuery.trim().length >= 2 && (
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

                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Type at least 2 characters, then click the user name. Existing
                  members are hidden from the search result.
                </p>
              </div>

              <div className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(false);
                    resetInviteeState();
                  }}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMembers().catch(console.error)}
                  disabled={addingMembers || selectedInvitees.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingMembers && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}

        {leaveConfirmOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <LogOut size={26} />
              </div>
              <h3 className="mb-2 text-lg font-black text-zinc-900 dark:text-white">
                Leave group?
              </h3>
              <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                You will leave {activeGroup.name}. You may need another
                invitation to join this group again.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveConfirmOpen(false)}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleLeaveGroup().catch(console.error)}
                  disabled={leavingGroup}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {leavingGroup && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-brand-500" />
        <div>
          <h3 className="font-black text-zinc-900 dark:text-white">
            Group Chat
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Groups you've created or groups you've been invited to.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-2xl p-3 text-sm font-bold">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-2xl p-3 text-sm font-bold">
          {success}
        </div>
      )}

      {loadingGroups && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 py-3">
          <Loader2 size={16} className="animate-spin" />
          Loading groups...
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group) => {
          const status = group.currentMember?.status ?? "invited";

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => openGroup(group)}
              className="w-full text-left p-3 rounded-2xl transition-all border bg-zinc-50 dark:bg-zinc-950 border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-black text-sm text-zinc-900 dark:text-white truncate">
                  {group.name}
                </div>

                {status === "invited" && (
                  <span className="shrink-0 text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-1 rounded-full">
                    Invited
                  </span>
                )}

                {status === "joined" && (
                  <span className="shrink-0 text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded-full">
                    Joined
                  </span>
                )}
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                {status === "invited"
                  ? "Accept invite to open this group"
                  : group.lastMessageText || "No messages yet"}
              </div>
            </button>
          );
        })}
      </div>

      {!loadingGroups && groups.length === 0 && (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
          There isn't a group chat yet.
        </div>
      )}
    </div>
  );
}
