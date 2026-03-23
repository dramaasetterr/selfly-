"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  listing_id: string;
};

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse conversation id: listing_id + peer_id
  const decodedId = decodeURIComponent(id || "");
  const parts = decodedId.split("_");
  const listingId = parts[0] || "";
  const peerId = parts.slice(1).join("_") || "";

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!user || !listingId || !peerId) return;
    const supabase = createClient();

    async function fetchMessages() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", listingId)
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });

      if (err) {
        setError(err.message);
      } else {
        setMessages(data ?? []);
      }
      setLoading(false);

      // Mark as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("listing_id", listingId)
        .eq("sender_id", peerId)
        .eq("receiver_id", user!.id)
        .eq("read", false);
    }

    fetchMessages();
  }, [user, listingId, peerId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !listingId || !peerId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${listingId}:${peerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // Only add if it's part of this conversation
          if (
            (msg.sender_id === user.id && msg.receiver_id === peerId) ||
            (msg.sender_id === peerId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // Mark incoming as read
            if (msg.sender_id === peerId) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", msg.id)
                .then(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, listingId, peerId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const supabase = createClient();

    const { error: err } = await supabase.from("messages").insert({
      listing_id: listingId,
      sender_id: user.id,
      receiver_id: peerId,
      sender_name: user.user_metadata?.full_name || user.email || "You",
      content: newMessage.trim(),
      read: false,
    });

    if (err) {
      setError(err.message);
    } else {
      setNewMessage("");
      inputRef.current?.focus();
    }
    setSending(false);
  }

  // Get peer name from first message
  const peerName =
    messages.find((m) => m.sender_id === peerId)?.sender_name || "Conversation";

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gold-bg rounded-xl animate-pulse" />
        <div className="h-[500px] bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/messages" className="text-gold-dark hover:text-gold text-sm">
          &larr; Back
        </Link>
        <div className="w-9 h-9 rounded-full bg-gold-bg flex items-center justify-center text-sm font-semibold text-gold">
          {peerName[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-heading font-bold text-navy text-lg leading-tight">{peerName}</p>
          <p className="text-xs text-navy-light/50">Listing conversation</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-3">
          {error}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 bg-white rounded-2xl border border-gold-muted/30 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-navy-light/50 text-sm">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-gold text-navy rounded-br-md"
                      : "bg-cream-light text-navy rounded-bl-md"
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs font-semibold text-navy-light/60 mb-0.5">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMe ? "text-navy/50" : "text-navy-light/40"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border border-gold-muted/50 rounded-xl focus:ring-2 focus:ring-gold/40 px-4 py-2.5 text-navy outline-none text-sm"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-gold hover:bg-gold-dark text-navy font-semibold rounded-xl px-5 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
