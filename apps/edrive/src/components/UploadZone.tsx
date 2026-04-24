import { useState } from 'react';
import type { UploadItem } from '../hooks/useDrive';

interface UploadZoneProps {
  onUpload: (name: string, size: number) => void;
  uploads: UploadItem[];
}

export default function UploadZone({ onUpload, uploads }: UploadZoneProps) {
  const [dragover, setDragover] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      onUpload(f.name, f.size);
    }
  };

  const simulateUpload = () => {
    const names = ['document.pdf', 'photo.png', 'data.csv', 'notes.md', 'archive.zip'];
    const name = names[Math.floor(Math.random() * names.length)];
    const size = Math.floor(Math.random() * 5000000) + 10000;
    onUpload(name, size);
  };

  return (
    <div className="upload-zone-container">
      <div
        className={`upload-zone ${dragover ? 'dragover' : ''}`}
        onClick={simulateUpload}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragover(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          } else {
            simulateUpload();
          }
        }}
      >
        <div className="upload-zone-icon">📤</div>
        <div>Click or drag files here to upload</div>
      </div>
      {uploads.length > 0 && (
        <div className="upload-progress-list">
          {uploads.map((u) => (
            <div key={u.id} className="upload-progress-item">
              <div className="upload-progress-name">
                {u.done ? '✅' : '📤'} {u.name}
              </div>
              <div className="upload-progress-bar-track">
                <div
                  className={`upload-progress-bar-fill ${u.done ? 'done' : ''}`}
                  style={{ width: `${Math.min(u.progress, 100)}%` }}
                />
              </div>
              <span className="upload-progress-pct">{Math.round(Math.min(u.progress, 100))}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
