import { useRef, useEffect } from 'react';

interface VideoCallProps {
  localStream: MediaStream | null;
  participants: Array<{ id: string; name: string; stream?: MediaStream; muted?: boolean; cameraOff?: boolean }>;
  muted: boolean;
  cameraOff: boolean;
  screenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

function VideoTile({ stream, name, muted, cameraOff, isLocal }: {
  stream?: MediaStream | null;
  name: string;
  muted?: boolean;
  cameraOff?: boolean;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{
      position: 'relative',
      background: '#1e293b',
      borderRadius: 8,
      overflow: 'hidden',
      aspectRatio: '16/9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 200,
    }}>
      {stream && !cameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isLocal ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div style={{ fontSize: 40, color: '#94a3b8' }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: 6,
        left: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(0,0,0,0.6)',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        color: '#fff',
      }}>
        {muted && '🔇 '}
        {isLocal ? `${name} (You)` : name}
      </div>
    </div>
  );
}

export default function VideoCall({
  localStream,
  participants,
  muted,
  cameraOff,
  screenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}: VideoCallProps) {
  const totalTiles = participants.length + 1;
  const cols = totalTiles <= 2 ? totalTiles : totalTiles <= 4 ? 2 : 3;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0f172a',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Video grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
        padding: 16,
        alignContent: 'center',
      }}>
        <VideoTile stream={localStream} name="You" muted={muted} cameraOff={cameraOff} isLocal />
        {participants.map((p) => (
          <VideoTile key={p.id} stream={p.stream} name={p.name} muted={p.muted} cameraOff={p.cameraOff} />
        ))}
      </div>

      {/* Controls bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
        background: '#1e293b',
      }}>
        <CallButton icon={muted ? '🔇' : '🎤'} label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute} active={!muted} />
        <CallButton icon={cameraOff ? '📷' : '🎥'} label={cameraOff ? 'Start Video' : 'Stop Video'} onClick={onToggleCamera} active={!cameraOff} />
        <CallButton icon={screenSharing ? '🖥️' : '📺'} label={screenSharing ? 'Stop Share' : 'Share Screen'} onClick={onToggleScreenShare} active={screenSharing} />
        <button
          onClick={onLeave}
          style={{
            padding: '10px 24px',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          📞 Leave
        </button>
      </div>

      {/* Participant count */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#94a3b8',
        fontSize: 13,
      }}>
        <span style={{ fontSize: 16 }}>📹</span>
        <span>{participants.length + 1} participant{participants.length > 0 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function CallButton({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: 'none',
        background: active ? '#334155' : '#475569',
        color: '#fff',
        fontSize: 18,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  );
}
