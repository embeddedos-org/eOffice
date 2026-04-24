import { useState, useRef } from 'react';

interface MessageComposerProps {
  onSend: (content: string) => void;
  onSendFile: (name: string, size: number) => void;
  channelName: string;
}

export default function MessageComposer({ onSend, onSendFile, channelName }: MessageComposerProps) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      onSendFile(files[i].name, files[i].size);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      onSendFile(files[i].name, files[i].size);
    }
  };

  return (
    <div
      className="message-composer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <button
        className="message-attach-btn"
        onClick={() => fileRef.current?.click()}
        title="Attach file"
      >
        📎
      </button>
      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} multiple />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Message #${channelName}...`}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
      />
      <button onClick={handleSend} disabled={!text.trim()}>Send</button>
    </div>
  );
}
