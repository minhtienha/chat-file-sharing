import type { MessageAttachment } from '../types/chat.types';

const MAX_CONTENT_LENGTH = 500;

type CompactFile = {
  id: string;
  n: string;
  c: string;
  s: number;
};

type StoredPayload = {
  v: 1;
  t: string;
  f: CompactFile[];
};

/** Backend yêu cầu content tối thiểu 2 ký tự — JSON payload luôn đủ dài khi có file */
export const encodeMessageContent = (
  text: string,
  files: MessageAttachment[],
): string => {
  const trimmed = text.trim();

  if (files.length === 0) {
    return trimmed;
  }

  let compact: CompactFile[] = files.map((file) => ({
    id: file.gridfsFileId,
    n: file.name,
    c: file.contentType || '',
    s: file.size || 0,
  }));

  let raw = JSON.stringify({ v: 1, t: trimmed, f: compact } satisfies StoredPayload);

  while (raw.length > MAX_CONTENT_LENGTH && compact.length > 1) {
    compact = compact.slice(0, -1);
    raw = JSON.stringify({ v: 1, t: trimmed, f: compact });
  }

  if (raw.length > MAX_CONTENT_LENGTH) {
    const first = compact[0];
    raw = JSON.stringify({
      v: 1,
      t: trimmed.slice(0, 80),
      f: first
        ? [{ id: first.id, n: first.n.slice(0, 24), c: first.c, s: first.s }]
        : [],
    });
  }

  if (raw.length > MAX_CONTENT_LENGTH) {
    return trimmed.slice(0, MAX_CONTENT_LENGTH) || '📎';
  }

  return raw;
};

export const decodeMessageContent = (
  messageOrContent?: any,
): { text: string; files: MessageAttachment[] } => {
  if (!messageOrContent) {
    return { text: '', files: [] };
  }

  const contentStr = typeof messageOrContent === 'string' ? messageOrContent : messageOrContent.content;
  const nativeAttachments = typeof messageOrContent === 'object' && messageOrContent.attachments ? messageOrContent.attachments : [];

  let parsedText = contentStr || '';
  let parsedFiles = [...nativeAttachments];

  if (contentStr) {
    try {
      const parsed = JSON.parse(contentStr) as StoredPayload;
      if (parsed && parsed.v === 1 && Array.isArray(parsed.f)) {
        parsedText = parsed.t || '';
        // If native attachments exist, prefer them, otherwise use legacy JSON parsed files
        if (parsedFiles.length === 0) {
          parsedFiles = parsed.f.map((item) => ({
            gridfsFileId: item.id,
            name: item.n,
            contentType: item.c,
            size: item.s,
          }));
        }
      }
    } catch {
      // Tin nhắn văn bản thuần, không phải JSON đính kèm
    }
  }

  return { text: parsedText, files: parsedFiles };
};

export const getMessagePreview = (messageOrContent?: any): string => {
  const { text, files } = decodeMessageContent(messageOrContent);
  if (text) return text;
  if (files.length === 1) return files[0].name;
  if (files.length > 1) return `${files.length} tệp đính kèm`;
  return 'Chưa có tin nhắn';
};

export const getSenderId = (
  sender?: string | { _id: string } | null,
): string => {
  if (!sender) return '';
  if (typeof sender === 'object' && sender._id) {
    return String(sender._id);
  }
  return String(sender);
};
