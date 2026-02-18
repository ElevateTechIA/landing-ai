"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  MessageCircle,
  Loader2,
  Phone,
  Send,
  CheckCircle,
  Archive,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string | { _seconds: number };
};

type Conversation = {
  id: string;
  phoneNumber: string;
  displayName?: string;
  messages?: Message[];
  lastMessageAt?: string | { _seconds: number };
  status?: string;
  businessPhoneNumberId?: string;
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "text-blue-600", bg: "bg-blue-50" },
  resolved: { label: "Resolved", color: "text-green-600", bg: "bg-green-50" },
  archived: { label: "Archived", color: "text-gray-500", bg: "bg-gray-50" },
};

function formatTime(ts: string | { _seconds: number } | undefined): string {
  if (!ts) return "";
  try {
    const d = typeof ts === "object" && "_seconds" in ts
      ? new Date(ts._seconds * 1000)
      : new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatTimeShort(ts: string | { _seconds: number } | undefined): string {
  if (!ts) return "";
  try {
    const d = typeof ts === "object" && "_seconds" in ts
      ? new Date(ts._seconds * 1000)
      : new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getLastMessage(conv: Conversation): string {
  if (!conv.messages || conv.messages.length === 0) return "";
  const last = conv.messages[conv.messages.length - 1];
  const prefix = last.role === "assistant" ? "You: " : "";
  const text = last.content.length > 50 ? last.content.slice(0, 50) + "..." : last.content;
  return prefix + text;
}

export default function WhatsAppPage() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/conversations?limit=50");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  function selectConversation(conv: Conversation) {
    setSelected(conv);
    setStatusMenu(false);
  }

  async function handleSend() {
    if (!messageText.trim() || !selected) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const res = await fetch("/api/whatsapp/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selected.phoneNumber,
          type: "text",
          text,
          phoneNumberId: selected.businessPhoneNumberId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const newMsg: Message = {
          id: data.messageId || `sent_${Date.now()}`,
          role: "assistant",
          content: text,
          timestamp: new Date().toISOString(),
        };
        setSelected((prev) =>
          prev ? { ...prev, messages: [...(prev.messages ?? []), newMsg] } : prev
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selected.id
              ? { ...c, messages: [...(c.messages ?? []), newMsg], lastMessageAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch { /* ignore */ }
    setSending(false);
  }

  async function handleStatusChange(status: string) {
    if (!selected?.id) return;
    setStatusMenu(false);
    try {
      await fetch("/api/whatsapp/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, status }),
      });
      setSelected((prev) => prev ? { ...prev, status } : prev);
      setConversations((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, status } : c))
      );
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] -mt-2">
      {/* Conversations list */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white rounded-l-xl flex flex-col ${
          selected ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            {t("socialMedia.whatsapp.title")}
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {conversations.length}
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t("socialMedia.whatsapp.noTemplates")}</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selected?.id === conv.id;
              const cfg = statusConfig[conv.status ?? "open"] ?? statusConfig.open;
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conv.displayName || conv.phoneNumber}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {formatTimeShort(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-500 truncate flex-1">
                          {getLastMessage(conv)}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 flex flex-col bg-gray-50 rounded-r-xl ${
          selected ? "flex" : "hidden md:flex"
        }`}
      >
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {selected.displayName || selected.phoneNumber}
                </p>
                <p className="text-xs text-gray-500">{selected.phoneNumber}</p>
              </div>

              {/* Status menu */}
              <div className="relative">
                <button
                  onClick={() => setStatusMenu(!statusMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                {statusMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(false)} />
                    <div className="absolute right-0 top-10 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => handleStatusChange("open")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-blue-600" /> Open
                      </button>
                      <button
                        onClick={() => handleStatusChange("resolved")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" /> Resolved
                      </button>
                      <button
                        onClick={() => handleStatusChange("archived")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4 text-gray-500" /> Archived
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {(!selected.messages || selected.messages.length === 0) ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No messages yet</p>
                </div>
              ) : (
                selected.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "assistant" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        msg.role === "assistant"
                          ? "bg-green-600 text-white rounded-br-md"
                          : "bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-all">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.role === "assistant" ? "text-green-200" : "text-gray-400"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
