import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent, DragEvent } from 'react';
import { FiPaperclip, FiSmile, FiSend, FiX, FiFile } from 'react-icons/fi';
import { BsCloudUpload } from 'react-icons/bs';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => Promise<void> | void;
  disabled?: boolean;
  onFocus?: () => void;
}

const ChatInput = ({ onSendMessage, disabled = false, onFocus }: ChatInputProps) => {
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapRef = useRef<HTMLDivElement>(null);

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const appendFiles = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    appendFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  // Các sự kiện kéo thả tệp tin
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      appendFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Gửi tin
  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText && selectedFiles.length === 0) return;
    // API backend chat yêu cầu ít nhất 2 ký tự nếu chỉ gửi text
    if (selectedFiles.length === 0 && trimmedText.length < 2) return;
    if (disabled) return;

    await onSendMessage(trimmedText, selectedFiles);
    setText('');
    setSelectedFiles([]);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = selectedFiles.length > 0 || text.trim().length >= 2;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-t border-slate-200 bg-white px-3 pt-3 flex flex-col transition-colors shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] ${
        isDragging ? 'bg-indigo-50/50 border-dashed border-indigo-400' : ''
      }`}
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <div ref={emojiWrapRef}>
        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 left-2 right-2 lg:right-auto z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-100">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              previewConfig={{ showPreview: false }}
              width={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 24 : 320)}
              height={320}
            />
          </div>
        )}

        {/* Danh sách tệp đính kèm */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 max-h-28 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-100/80 rounded-xl text-xs text-indigo-700 shadow-2xs"
              >
                <FiFile className="text-indigo-500 shrink-0" />
                <span className="max-w-[140px] truncate font-semibold">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-indigo-400 hover:text-rose-500 ml-1 transition cursor-pointer"
                  aria-label="Xóa file"
                >
                  <FiX className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbars */}
        <div className="flex items-center justify-between text-slate-400 mb-2 select-none">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 rounded-xl hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Đính kèm tệp tin"
            >
              <FiPaperclip className="text-xl rotate-45" />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              disabled={disabled}
              className={`p-2 rounded-xl hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer ${
                showEmojiPicker ? 'text-indigo-600 bg-indigo-50' : ''
              }`}
              title="Biểu tượng cảm xúc"
            >
              <FiSmile className="text-xl" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 pointer-events-none">
            <BsCloudUpload className="text-sm" />
            <span>Kéo thả tệp vào đây</span>
          </div>
        </div>
      </div>

      {/* Box nhập liệu */}
      <div className="flex items-end gap-2 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-1.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          disabled={disabled}
          className="flex-1 max-h-32 min-h-[40px] py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none resize-none focus:ring-0 leading-relaxed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend || disabled}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
            canSend && !disabled
              ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200 hover:from-indigo-500 hover:to-indigo-600 hover:scale-105 active:scale-95'
              : 'bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
          }`}
          title="Gửi (Enter)"
        >
          <FiSend className="text-base" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
