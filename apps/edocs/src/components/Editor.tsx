import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange: (line: number, col: number) => void;
  showFindReplace?: boolean;
  onCloseFindReplace?: () => void;
}

const Editor = forwardRef<HTMLDivElement, EditorProps>(
  ({ onChange, onCursorChange, showFindReplace, onCloseFindReplace }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const editorEl = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCount, setMatchCount] = useState(0);

    const handleInput = useCallback(() => {
      const el = editorEl.current;
      if (el) {
        onChange(el.innerText);
      }
    }, [editorEl, onChange]);

    const updateCursorPosition = useCallback(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const el = editorEl.current;
      if (!el) return;

      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      const textBeforeCaret = preCaretRange.toString();
      const lines = textBeforeCaret.split('\n');
      const line = lines.length;
      const col = (lines[lines.length - 1]?.length ?? 0) + 1;

      onCursorChange(line, col);
    }, [editorEl, onCursorChange]);

    // Handle image paste
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            document.execCommand('insertHTML', false,
              `<img src="${dataUrl}" style="max-width:100%;height:auto;margin:8px 0;border-radius:4px;" />`
            );
            handleInput();
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }, [handleInput]);

    // Find & Replace logic
    const handleFind = useCallback(() => {
      if (!findText || !editorEl.current) {
        setMatchCount(0);
        return;
      }
      const text = editorEl.current.innerText;
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      setMatchCount(matches ? matches.length : 0);

      // Use window.find for highlight
      if ((window as any).find) {
        window.getSelection()?.collapse(editorEl.current, 0);
        (window as any).find(findText, false, false, true);
      }
    }, [findText, editorEl]);

    const handleFindNext = useCallback(() => {
      if ((window as any).find) {
        (window as any).find(findText, false, false, true);
      }
    }, [findText]);

    const handleReplace = useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.toString().toLowerCase() === findText.toLowerCase()) {
        document.execCommand('insertText', false, replaceText);
        handleInput();
        handleFindNext();
      } else {
        handleFindNext();
      }
    }, [findText, replaceText, handleFindNext, handleInput]);

    const handleReplaceAll = useCallback(() => {
      const el = editorEl.current;
      if (!el || !findText) return;
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      el.innerHTML = el.innerHTML.replace(regex, replaceText);
      handleInput();
      setMatchCount(0);
    }, [editorEl, findText, replaceText, handleInput]);

    // Keyboard shortcut for find/replace handled in App.tsx

    useEffect(() => {
      const el = editorEl.current;
      if (!el) return;

      const handleKeyUp = () => updateCursorPosition();
      const handleMouseUp = () => updateCursorPosition();

      el.addEventListener('keyup', handleKeyUp);
      el.addEventListener('mouseup', handleMouseUp);

      return () => {
        el.removeEventListener('keyup', handleKeyUp);
        el.removeEventListener('mouseup', handleMouseUp);
      };
    }, [editorEl, updateCursorPosition]);

    return (
      <main className="editor-container">
        {showFindReplace && (
          <div className="find-replace-bar">
            <div className="find-replace-row">
              <input
                type="text"
                className="find-replace-input"
                placeholder="Find..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFind(); }}
                autoFocus
              />
              <input
                type="text"
                className="find-replace-input"
                placeholder="Replace..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReplace(); }}
              />
              <span className="find-match-count">
                {matchCount > 0 ? `${matchCount} found` : findText ? 'No matches' : ''}
              </span>
            </div>
            <div className="find-replace-actions">
              <button className="find-replace-btn" onClick={handleFind} title="Find">Find</button>
              <button className="find-replace-btn" onClick={handleFindNext} title="Find Next">Next</button>
              <button className="find-replace-btn" onClick={handleReplace} title="Replace">Replace</button>
              <button className="find-replace-btn" onClick={handleReplaceAll} title="Replace All">All</button>
              <button className="find-replace-btn find-replace-close" onClick={onCloseFindReplace} title="Close">✕</button>
            </div>
          </div>
        )}
        <div className="editor-paper">
          <div
            ref={editorEl}
            className="editor-content"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Document editor"
            data-placeholder="Start typing your document..."
            onInput={handleInput}
            onKeyUp={updateCursorPosition}
            onMouseUp={updateCursorPosition}
            onPaste={handlePaste}
            spellCheck
          />
        </div>
      </main>
    );
  }
);

Editor.displayName = 'Editor';

export default Editor;
