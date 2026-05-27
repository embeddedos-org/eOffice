import { useState } from 'react';
import TopBar from './components/TopBar';
import ChannelList from './components/ChannelList';
import MessageThread from './components/MessageThread';
import MessageComposer from './components/MessageComposer';
import VideoCall from './components/VideoCall';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import { useConnect } from './hooks/useConnect';
import { useEBot } from './hooks/useEBot';
import { useVideoCall } from './hooks/useVideoCall';
import { LoginScreen } from '../../shared/LoginScreen';

function EconnectApp() {
  const [ebotOpen, setEbotOpen] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const connect = useConnect();
  const ebot = useEBot();
  const videoCall = useVideoCall();

  const handleNewChannel = () => {
    setShowNewChannel(true);
  };

  const handleCreateChannel = () => {
    if (newChannelName.trim()) {
      connect.addChannel(newChannelName.trim(), newChannelDesc.trim());
      setNewChannelName('');
      setNewChannelDesc('');
      setShowNewChannel(false);
    }
  };

  const handleStartCall = () => {
    if (videoCall.inCall) return;
    videoCall.startCall();
  };

  return (
    <div className="econnect-app">
      <TopBar
        onNewChannel={handleNewChannel}
        onStartCall={handleStartCall}
        ebotOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={ebot.connected}
        inCall={videoCall.inCall}
      />
      <div className="econnect-body">
        <ChannelList
          channels={connect.channels}
          selectedChannelId={connect.selectedChannelId}
          onSelect={connect.setSelectedChannelId}
          onCreate={handleNewChannel}
          users={connect.users}
        />
        <div className="econnect-main">
          <MessageThread
            messages={connect.channelMessages}
            channelName={connect.selectedChannel?.name ?? ''}
            typingUser={connect.typingUser}
          />
          <MessageComposer
            onSend={connect.sendMessage}
            onSendFile={connect.sendFileMessage}
            channelName={connect.selectedChannel?.name ?? ''}
          />
        </div>
        <EBotSidebar
          open={ebotOpen}
          connected={ebot.connected}
          loading={ebot.loading}
          onClose={() => setEbotOpen(false)}
          onSummarizeThread={ebot.summarizeThread}
          onDraftMessage={ebot.draftMessage}
        />
      </div>

      {/* New Channel Dialog */}
      {showNewChannel && (
        <div className="dialog-overlay" onClick={() => setShowNewChannel(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Create Channel</h3>
              <button className="dialog-close" onClick={() => setShowNewChannel(false)}>✕</button>
            </div>
            <label className="dialog-label">
              Channel Name
              <input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g., project-alpha"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateChannel(); }}
              />
            </label>
            <label className="dialog-label">
              Description (optional)
              <input
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
                placeholder="What is this channel about?"
              />
            </label>
            <div className="dialog-actions">
              <button className="dialog-btn" onClick={() => setShowNewChannel(false)}>Cancel</button>
              <button className="dialog-btn primary" onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Overlay */}
      {videoCall.inCall && (
        <VideoCall
          localStream={videoCall.localStream}
          participants={videoCall.participants}
          muted={videoCall.muted}
          cameraOff={videoCall.cameraOff}
          screenSharing={videoCall.screenSharing}
          onToggleMute={videoCall.toggleMute}
          onToggleCamera={videoCall.toggleCamera}
          onToggleScreenShare={videoCall.toggleScreenShare}
          onLeave={videoCall.leaveCall}
        />
      )}

      <StatusBar
        channelCount={connect.channels.length}
        messageCount={connect.messages.length}
        connected={ebot.connected}
      />
    </div>
  );
}


export default function App() {
  return (
    <LoginScreen appName="eConnect" appIcon="💬">
      <EconnectApp />
    </LoginScreen>
  );
}
