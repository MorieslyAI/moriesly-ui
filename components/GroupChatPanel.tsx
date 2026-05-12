import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import * as api from "../services/api";
import type { GroupChat, GroupChatMessage } from "../services/api";
import type { UserProfile } from "../types";
import { Loader2, Lock, MessageSquare, Send, Users } from "lucide-react";

interface GroupChatPanelProps {
  userStats: UserProfile;
  refreshKey?: number;
}

export default function GroupChatPanel({
  userStats,
  refreshKey = 0,
}: GroupChatPanelProps) {
  const currentUserId = getAuth().currentUser?.uid ?? null;
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);

  const [text, setText] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStatus = activeGroup?.currentMember?.status ?? "invited";
  const canReadMessages = activeGroup && activeStatus === "joined";

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

  async function handleAcceptInvite() {
    if (!activeGroup || acceptingInvite) return;

    setAcceptingInvite(true);
    setError(null);

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

    try {
      const sent = await api.sendGroupMessage(activeGroup.id, text);
      setMessages((prev) => [...prev, sent]);
      setText("");
      await loadGroups();
    } catch (err: any) {
      setError(err.message ?? "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
      <aside className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
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

        {loadingGroups && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 py-3">
            <Loader2 size={16} className="animate-spin" />
            Loading groups...
          </div>
        )}

        <div className="space-y-2">
          {groups.map((group) => {
            const status = group.currentMember?.status ?? "invited";
            const isActive = activeGroup?.id === group.id;

            return (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group)}
                className={`w-full text-left p-3 rounded-2xl transition-all border ${
                  isActive
                    ? "bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900"
                    : "bg-zinc-50 dark:bg-zinc-950 border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                }`}
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
            Belum ada group chat.
          </div>
        )}
      </aside>

      <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[560px] overflow-hidden">
        {activeGroup ? (
          <>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-zinc-900 dark:text-white">
                  {activeGroup.name}
                </h3>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeStatus === "joined"
                    ? `${activeGroup.memberIds?.length ?? 0} members`
                    : "You were invited to this private group"}
                </p>
              </div>

              {activeStatus === "invited" && (
                <button
                  onClick={handleAcceptInvite}
                  disabled={acceptingInvite}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-black flex items-center gap-2"
                >
                  {acceptingInvite && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Accept Invite
                </button>
              )}
            </div>

            {activeStatus === "invited" ? (
              <div className="flex-1 grid place-items-center p-8 text-center">
                <div>
                  <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
                    <Lock size={28} />
                  </div>

                  <h4 className="font-black text-zinc-900 dark:text-white mb-2">
                    Invite belum diterima
                  </h4>

                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-5">
                    Kamu sudah diundang ke group ini, tapi belum bisa membaca
                    pesan sampai kamu klik Accept Invite.
                  </p>

                  <button
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
                    const isMine = Boolean(currentUserId && msg.senderId === currentUserId);

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
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
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div>
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} />
              </div>

              <h4 className="font-black text-zinc-900 dark:text-white mb-1">
                Select a group chat
              </h4>

              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Select a group from the left to open a chat.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}