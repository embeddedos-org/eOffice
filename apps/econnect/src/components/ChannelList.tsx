import type { Channel } from '../hooks/useConnect';
import type { UserPresence } from '../hooks/useConnect';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  users: UserPresence[];
}

export default function ChannelList({ channels, selectedChannelId, onSelect, onCreate, users }: ChannelListProps) {
  return (
    <div className="channel-list">
      <div className="channel-list-header">
        <span>Channels</span>
        <button className="channel-list-add" onClick={onCreate} title="New channel">+</button>
      </div>
      <div className="channel-list-items">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className={`channel-item ${ch.id === selectedChannelId ? 'active' : ''}`}
            onClick={() => onSelect(ch.id)}
          >
            <span className="channel-item-name">
              <span>#</span>
              <span>{ch.name}</span>
            </span>
            <span className="channel-badge">{ch.members}</span>
          </div>
        ))}
      </div>
      <div className="channel-list-header" style={{ borderTop: '1px solid var(--border-color)' }}>
        <span>People</span>
      </div>
      <div className="channel-list-items">
        {users.map((user) => (
          <div key={user.name} className="channel-item user-item">
            <span className="channel-item-name">
              <span className={`presence-dot ${user.online ? 'online' : 'offline'}`} />
              <span>{user.name}</span>
            </span>
            {!user.online && user.lastSeen && (
              <span className="user-last-seen">{user.lastSeen}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
