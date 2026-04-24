import { useState, useCallback, useRef, useEffect } from 'react';

export interface Channel { id: string; name: string; members: number; description?: string; }
export interface Message {
  id: string;
  channelId: string;
  author: string;
  content: string;
  timestamp: string;
  type?: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
}

export interface UserPresence {
  name: string;
  online: boolean;
  lastSeen?: string;
}

let nextId = 1;
const uid = () => `${nextId++}`;

const SEED_CHANNELS: Channel[] = [
  { id: uid(), name: 'general', members: 12, description: 'General discussion' },
  { id: uid(), name: 'engineering', members: 8, description: 'Engineering team' },
  { id: uid(), name: 'design', members: 5, description: 'Design team' },
  { id: uid(), name: 'random', members: 15, description: 'Off-topic' },
];

const SEED_MESSAGES: Message[] = [
  { id: uid(), channelId: '1', author: 'Alice', content: 'Welcome to the general channel! 🎉', timestamp: '9:00 AM' },
  { id: uid(), channelId: '1', author: 'Bob', content: 'Hey everyone! Excited to be here.', timestamp: '9:05 AM' },
  { id: uid(), channelId: '1', author: 'Carol', content: 'Don\'t forget the standup at 10 AM.', timestamp: '9:15 AM' },
  { id: uid(), channelId: '2', author: 'Dave', content: 'PR #42 is ready for review.', timestamp: '10:30 AM' },
  { id: uid(), channelId: '2', author: 'Alice', content: 'I\'ll take a look after lunch.', timestamp: '10:45 AM' },
  { id: uid(), channelId: '3', author: 'Eve', content: 'New mockups are in Figma — feedback welcome!', timestamp: '11:00 AM' },
];

const USERS: UserPresence[] = [
  { name: 'Alice', online: true },
  { name: 'Bob', online: true },
  { name: 'Carol', online: false, lastSeen: '2 hours ago' },
  { name: 'Dave', online: true },
  { name: 'Eve', online: false, lastSeen: '30 min ago' },
];

export function useConnect() {
  const [channels, setChannels] = useState<Channel[]>(SEED_CHANNELS);
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(SEED_CHANNELS[0].id);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [users] = useState<UserPresence[]>(USERS);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null;
  const channelMessages = messages.filter((m) => m.channelId === selectedChannelId);

  const addChannel = useCallback((name: string, description = '') => {
    const id = uid();
    setChannels((prev) => [...prev, { id, name, members: 1, description }]);
    setSelectedChannelId(id);
  }, []);

  const sendMessage = useCallback((content: string) => {
    const id = uid();
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id, channelId: selectedChannelId, author: 'You', content, timestamp, type: 'text' }]);

    // Simulate someone typing after a delay
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      const randomUser = ['Alice', 'Bob', 'Dave'][Math.floor(Math.random() * 3)];
      setTypingUser(randomUser);
      setTimeout(() => {
        setTypingUser(null);
        const replyId = uid();
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [...prev, {
          id: replyId, channelId: selectedChannelId, author: randomUser,
          content: getRandomReply(), timestamp: replyTime, type: 'text',
        }]);
      }, 2000 + Math.random() * 2000);
    }, 1500);
  }, [selectedChannelId]);

  const sendFileMessage = useCallback((fileName: string, fileSize: number) => {
    const id = uid();
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, {
      id, channelId: selectedChannelId, author: 'You',
      content: `📎 Shared file: ${fileName}`, timestamp,
      type: 'file', fileName, fileSize,
    }]);
  }, [selectedChannelId]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, []);

  return {
    channels, messages, selectedChannelId, selectedChannel, channelMessages,
    typingUser, users,
    setSelectedChannelId, addChannel, sendMessage, sendFileMessage,
  };
}

function getRandomReply(): string {
  const replies = [
    'Sounds great! 👍', 'I agree!', 'Let me check on that.',
    'Thanks for sharing!', 'Good point.', 'Will do! ✅',
    'Can you elaborate?', 'Nice work! 🎉', 'I\'ll follow up on that.',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
