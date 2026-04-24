import { useState } from 'react';
import TopBar from './components/TopBar';
import FileExplorer from './components/FileExplorer';
import FilePreview from './components/FilePreview';
import UploadZone from './components/UploadZone';
import EBotSidebar from './components/EBotSidebar';
import StatusBar from './components/StatusBar';
import { useDrive } from './hooks/useDrive';
import { useEBot } from './hooks/useEBot';

export default function App() {
  const [ebotOpen, setEbotOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const drive = useDrive();
  const ebot = useEBot();

  const handleNewFolder = () => {
    const name = prompt('Folder name:');
    if (name?.trim()) drive.createFolder(name.trim());
  };

  return (
    <div className="edrive-app">
      <TopBar
        onUpload={() => setShowUpload((p) => !p)}
        onNewFolder={handleNewFolder}
        ebotOpen={ebotOpen}
        onToggleEBot={() => setEbotOpen((p) => !p)}
        connected={ebot.connected}
        viewMode={drive.viewMode}
        onToggleView={() => drive.setViewMode((v) => v === 'grid' ? 'list' : 'grid')}
      />
      <div className="edrive-body">
        <FileExplorer
          children={drive.children}
          currentPath={drive.currentPath}
          selectedFileId={drive.selectedFileId}
          viewMode={drive.viewMode}
          onSelect={drive.setSelectedFileId}
          onOpen={(f) => drive.navigateTo(f.id, f.name)}
          onNavigateBreadcrumb={drive.navigateToBreadcrumb}
          onMoveFile={drive.moveFile}
        />
        {drive.selectedFile && (
          <FilePreview
            file={drive.selectedFile}
            formatSize={drive.formatSize}
            onGenerateShareLink={drive.generateShareLink}
            onDelete={drive.removeFile}
            onRename={drive.renameFile}
          />
        )}
        <EBotSidebar
          open={ebotOpen}
          connected={ebot.connected}
          loading={ebot.loading}
          onClose={() => setEbotOpen(false)}
          onSearchFiles={ebot.searchFiles}
          onSummarizeFile={ebot.summarizeFile}
        />
      </div>
      {showUpload && (
        <UploadZone onUpload={drive.simulateUpload} uploads={drive.uploads} />
      )}
      <StatusBar
        fileCount={drive.files.length}
        totalSize={drive.formatSize(drive.totalSize)}
        connected={ebot.connected}
      />
    </div>
  );
}
