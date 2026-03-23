"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Conversation = {
  id: string;
  peer_name: string;
  peer_id: string;
  listing_address: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchConversations() {
      setLoading(true);
      setError(null);

      // Fetch messages and group by conversation
      const { data: messages, error: err } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      // Group by conversation key (listing_id + peer)
      const convMap = new Map<string, Conversation>();

      (messages ?? []).forEach((msg: {
        id: string;
        listing_id: string;
        sender_id: string;
        receiver_id: string;
        sender_name: string;
        receiver_name: string;
        content: string;
        created_at: string;
        read: boolean;
        listing_address?: string;
      }) => {
        const peerId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        const peerName = msg.sender_id === user!.id ? msg.receiver_name : msg.sender_name;
        const key = `${msg.listing_id}_${peerId}`;

        if (!convMap.has(key)) {
          convMap.set(key, {
            id: key,
            peer_name: peerName || "Unknown",
            peer_id: peerId,
            listing_address: msg.listing_address || "Unknown listing",
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }

        const conv = convMap.get(key)!;
        if (!msg.read && msg.sender_id !== user!.id) {
          conv.unread_count++;
        }
      });

      setConversations(Array.from(convMap.values()));
      setLoading(false);
    }

    fetchConversations();
  }, [user]);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gold-bg rounded-xl animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-gold-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-navy text-2xl">Messages</h1>
        <p className="text-navy-light text-sm mt-1">
          Conversations with buyers and agents
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold-muted/30 p-12 text-center">
          <p className="text-navy-light text-lg">No messages yet</p>
          <p className="text-navy-light/60 text-sm mt-1">
            Messages from buyers and agents will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gold-muted/30 divide-y divide-gold-muted/10 overflow-hidden">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/messages/${encodeURIComponent(conv.id)}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-cream-light transition group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gold-bg flex items-center justify-center text-sm font-semibold text-gold flex-shrink-0">
                {conv.peer_name?.[0]?.toUpperCase() || "?"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm truncate ${
                      conv.unread_count > 0 ? "font-bold text-navy" : "font-medium text-navy"
                    }`}
                  >
                    {conv.peer_name}
                  </p>
                  <span className="text-xs text-navy-light/50 flex-shrink-0 ml-2">
                    {timeAgo(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-navy-light/60 truncate">{conv.listing_address}</p>
                <p
                  className={`text-sm truncate mt-0.5 ${
                    conv.unread_count > 0 ? "text-navy font-medium" : "text-navy-light/70"
                  }`}
                >
                  {conv.last_message}
                </p>
              </div>

              {/* Unread badge */}
              {conv.unread_count > 0 && (
                <span className="bg-gold text-navy text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {conv.unread_count > 9 ? "9+" : conv.unread_count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
