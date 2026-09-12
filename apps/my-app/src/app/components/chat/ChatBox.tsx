import { useState, useEffect, useRef, useMemo, Fragment, useCallback } from 'react';
import { FiInfo, FiArrowLeft, FiDownload, FiFile, FiTrash2, FiCheck } from 'react-icons/fi';
import { ChatRoom, Message, MessageAttachment } from '../../types/index';
import { formatMessageTime } from '../../utils/formatMessageTime';
import { formatDividerDate } from '../../utils/formatDividerDate';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getMessages, sendMessage, deleteMessage, markAsReadApi } from '../../services/chatRoom.service';
import { uploadFiles, getDownloadUrl, getPreviewUrl } from '../../services/drive.service';
import { getSocket } from '../../services/socket';
import ChatInput from './ChatInput';
import { getRoomDisplayName, getRoomAvatar } from '../../utils/chatNameHelper';
import { decodeMessageContent, encodeMessageContent, getSenderId } from '../../utils/messageContent';
import type { DriveFile } from '../../types/drive.types';
import { toast } from 'react-toastify';

interface ChatBoxProps {
  currentRoom: ChatRoom;
  onToggleDetails: () => void;
  onSendMessageSuccess?: () => void;
  onBack?: () => void;
}

type MessagesResponse = {
  data?: Message[];
  meta?: { hasMore?: boolean };
};

const unwrapMessages = (resData: MessagesResponse | Message[]): Message[] => {
  if (Array.isArray(resData)) return resData;
  return resData.data ?? [];
};

// Component hiển thị danh sách file đính kèm trong tin nhắn
const FileBlock = ({ files, isMe }: { files: MessageAttachment[]; isMe: boolean }) => {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {files.map((file) => {
        const isImage = Boolean(file.contentType?.startsWith('image/'));
        const previewUrl = getPreviewUrl(file.gridfsFileId);
        const downloadUrl = getDownloadUrl(file.gridfsFileId);

        // Render ảnh xem trước
        if (isImage) {
          return (
            <a
              key={file.gridfsFileId}
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-slate-200/50"
            >
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-56 max-w-full object-cover bg-slate-50"
              />
            </a>
          );
        }

        // Render tệp đính kèm (có icon, tên, nút tải)
        return (
          <a
            key={file.gridfsFileId}
            href={downloadUrl}
            download={file.name}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
              isMe
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
              <FiFile className="text-base" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 w-40">
              <span className="truncate font-medium">{file.name}</span>
              <span className={`text-[10px] ${isMe ? 'text-indigo-100' : 'text-slate-400'}`}>
                {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'}
              </span>
            </div>
            <FiDownload className="shrink-0 text-base opacity-70" />
          </a>
        );
      })}
    </div>
  );
};

const ChatBox = ({ currentRoom, onToggleDetails, onSendMessageSuccess, onBack }: ChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const currentUser = useBearerTokenStore((state) => state.user);
  const socket = useMemo(() => getSocket(), []);
  const roomName = useMemo(() => {
    return getRoomDisplayName(currentRoom, currentUser?._id, messages);
  }, [currentRoom, currentUser?._id, messages]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const isPagingOlder = useRef(false);

  // Lưu mốc thời gian đọc gần nhất của đối phương để hiển thị Đã xem
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<number>(0);
  const lastMarkReadTime = useRef<number>(0);

  // Tìm index của tin nhắn cuối cùng do tôi gửi (để chỉ hiển thị trạng thái Đã gửi / Đã xem ở đó - chuẩn UX)
  const lastMyMessageIndex = useMemo(() => {
    if (!currentUser?._id || !messages || messages.length === 0) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const senderId = getSenderId(msg.senderId || msg.sender);
      if (String(senderId) === String(currentUser._id)) {
        return i;
      }
    }
    return -1;
  }, [messages, currentUser?._id]);

  // Lấy avatar của đối phương để hiển thị
  const partnerAvatar = useMemo(() => {
    return getRoomAvatar(currentRoom, currentUser?._id, messages);
  }, [currentRoom, currentUser?._id, messages]);

  // Kích hoạt tự động đánh dấu đã đọc (debounce 300ms)
  const triggerMarkAsRead = useCallback(() => {
    if (!currentRoom?._id) return;
    const now = Date.now();
    if (now - lastMarkReadTime.current < 300) return;
    lastMarkReadTime.current = now;

    markAsReadApi(currentRoom._id).catch(() => {});
    socket.emit('markAsRead', { roomId: currentRoom._id, userId: currentUser?._id });
  }, [currentRoom?._id, currentUser?._id, socket]);

  // Cập nhật partnerLastReadAt khi currentRoom thay đổi
  useEffect(() => {
    const otherMembers = (currentRoom?.members || []).filter(
      (m: any) => String(m.userId?._id || m.userId || m.user?._id) !== String(currentUser?._id)
    );
    let maxRead = 0;
    otherMembers.forEach((m: any) => {
      if (m.lastReadAt) {
        const time = new Date(m.lastReadAt).getTime();
        if (time > maxRead) maxRead = time;
      }
    });
    setPartnerLastReadAt(maxRead);
  }, [currentRoom, currentUser?._id]);

  // Xóa tin nhắn hoàn toàn khỏi giao diện cả 2 bên
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      toast.success('Đã xóa tin nhắn');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa tin nhắn');
    }
  };

  // Tải tin nhắn phân trang
  const fetchMessages = async (pageNumber: number) => {
    if (loading || (!hasMore && pageNumber !== 1)) return;

    setLoading(true);
    try {
      const resData = (await getMessages(currentRoom._id, pageNumber)) as MessagesResponse | Message[];
      const rawMessages = unwrapMessages(resData);
      const olderMessages = [...rawMessages].reverse();

      if (pageNumber === 1) {
        setMessages(olderMessages);
        // Tự động đánh dấu đã đọc ngay khi mở phòng
        triggerMarkAsRead();
      } else {
        isPagingOlder.current = true;
        const container = scrollContainerRef.current;
        const previousScrollHeight = container?.scrollHeight ?? 0;

        setMessages((prev) => [...olderMessages, ...prev]);

        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - previousScrollHeight;
          }
          isPagingOlder.current = false;
        });
      }

      const metaHasMore =
        !Array.isArray(resData) && typeof resData.meta?.hasMore === 'boolean'
          ? resData.meta.hasMore
          : olderMessages.length > 0;
      setHasMore(metaHasMore);
      setPage(pageNumber);
    } catch (error) {
      console.error('Lỗi khi tải tin nhắn:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gửi tin nhắn (gồm chữ và tệp)
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;
    if (!currentRoom?._id) return;

    try {
      setSending(true);

      let attachments: MessageAttachment[] = [];
      // Nếu có tệp, upload lên Drive trước
      if (files && files.length > 0) {
        const uploaded: DriveFile[] = await uploadFiles(files);
        attachments = uploaded.map((file) => ({
          gridfsFileId: file.gridfsFileId,
          name: file.name,
          contentType: file.contentType,
          size: file.size,
        }));
      }

      // Không cần đóng gói thành JSON nữa, gửi song song text và attachments
      const res = (await sendMessage(currentRoom._id, content, files && files.length > 0 ? 'FILE' : 'TEXT', attachments)) as Message | { data: Message };
      const createdMessage: Message = 'data' in res && res.data?._id ? res.data : (res as Message);

      // Cập nhật giao diện ngay
      if (createdMessage?._id) {
        setMessages((prev) => {
          if (prev.some((item) => item._id === createdMessage._id)) return prev;
          return [...prev, createdMessage];
        });
      }

      onSendMessageSuccess?.();
    } catch (error: any) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      toast.error(error?.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleScroll = () => {
    // Scroll nhẹ là tự động đánh dấu đã đọc
    triggerMarkAsRead();

    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.scrollTop <= 20 && hasMore && !loading) {
      fetchMessages(page + 1);
    }
  };

  useEffect(() => {
    isFirstLoad.current = true;
    setPage(1);
    setHasMore(true);
    setMessages([]);

    if (currentRoom?._id) {
      fetchMessages(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?._id]);

  useEffect(() => {
    if (!currentRoom?._id) return;
    if (!socket.connected) socket.connect();

    socket.emit('joinRoom', { roomId: currentRoom._id });

    const handleNewMessage = (newMsg: Message) => {
      if (String(newMsg.roomId) === String(currentRoom._id)) {
        setMessages((prev) => {
          if (prev.some((item) => item._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });

        // Nếu tin nhắn từ đối phương -> tự động đánh dấu đã đọc
        const isFromMe = String(getSenderId(newMsg.senderId || newMsg.sender)) === String(currentUser?._id);
        if (!isFromMe) {
          triggerMarkAsRead();
        }
      }
    };

    const handleMessageDeleted = (data: { messageId: string; roomId: string }) => {
      if (String(data.roomId) === String(currentRoom._id)) {
        setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
      }
    };

    const handleRoomRead = (data: { roomId: string; userId: string; lastReadAt: string }) => {
      if (String(data.roomId) === String(currentRoom._id) && String(data.userId) !== String(currentUser?._id)) {
        const time = new Date(data.lastReadAt).getTime();
        setPartnerLastReadAt((prev) => Math.max(prev, time));
      }
    };

    const handleMessagesSeen = (data: { roomId: string; userId: string; seenAt: string }) => {
      if (String(data.roomId) === String(currentRoom._id) && String(data.userId) !== String(currentUser?._id)) {
        const time = new Date(data.seenAt).getTime();
        setPartnerLastReadAt((prev) => Math.max(prev, time));
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('roomRead', handleRoomRead);
    socket.on('messagesSeen', handleMessagesSeen);

    return () => {
      socket.emit('leaveRoom', { roomId: currentRoom._id });
      socket.off('newMessage', handleNewMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('roomRead', handleRoomRead);
      socket.off('messagesSeen', handleMessagesSeen);
    };
  }, [currentRoom?._id, socket, currentUser?._id, triggerMarkAsRead]);

  useEffect(() => {
    if (isPagingOlder.current || messages.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (isFirstLoad.current) {
      container.scrollTop = container.scrollHeight;
      isFirstLoad.current = false;
      return;
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;
    const lastMessage = messages[messages.length - 1];
    const lastSenderId = getSenderId(lastMessage?.senderId || lastMessage?.sender);
    const isMe = String(lastSenderId) === String(currentUser?._id);

    // Cuộn xuống cùng nếu mình gửi tin nhắn hoặc đang ở gần cuối trang
    if (isNearBottom || isMe) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages, currentUser?._id]);

  return (
    <div
      onClick={triggerMarkAsRead}
      className="flex-1 h-full flex flex-col bg-white min-w-0 min-h-0"
    >
      {/* Header */}
      <div className="h-14 lg:h-16 px-3 lg:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-2 min-w-0">
          {/* Nút quay lại (chỉ hiện trên Mobile/Tablet) */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              <FiArrowLeft className="text-xl" />
            </button>
          )}
          <div className="relative shrink-0">
            {partnerAvatar ? (
              <img
                src={partnerAvatar}
                alt={roomName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center">
                {(roomName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{roomName}</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleDetails}
          className="hidden lg:inline-flex p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
          title="Chi tiết phòng"
        >
          <FiInfo className="text-xl" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-6 pt-6 pb-2 space-y-6 min-h-0 bg-slate-50/30"
      >
        {loading && <div className="text-center text-xs text-slate-400 py-2">Đang tải...</div>}

        {messages.map((message, index) => {
          const currentDate = new Date(message.createdAt || '').toDateString();
          const prevDate = index > 0 ? new Date(messages[index - 1].createdAt || '').toDateString() : null;
          const showDivider = currentDate !== prevDate;
          const isMe = Boolean(currentUser?._id) && String(currentUser?._id) === getSenderId(message.senderId || message.sender);
          const parsed = decodeMessageContent(message);
          const isSeen = Boolean(
            partnerLastReadAt &&
              message.createdAt &&
              new Date(message.createdAt).getTime() <= partnerLastReadAt,
          );

          return (
            <Fragment key={message._id}>
              {showDivider && (
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-medium text-slate-400 absolute">
                    {formatDividerDate(message.createdAt)}
                  </span>
                </div>
              )}

              {isMe ? (
                <div className="flex flex-col items-end space-y-1 group">
                  <span className="text-[11px] text-slate-400 mr-1">{formatMessageTime(message.createdAt)}</span>
                  <div className="flex items-center gap-2 max-w-[85%] lg:max-w-[70%] mb-1">
                    {/* Nút xóa tin nhắn (Chỉ hiện khi hover) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(message._id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                      title="Xóa tin nhắn"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                    <div className="bg-indigo-600 text-white text-sm leading-relaxed py-2.5 px-4 rounded-2xl rounded-tr-sm shadow-sm break-words whitespace-pre-wrap">
                      {parsed.text}
                      <FileBlock files={parsed.files} isMe />
                    </div>
                  </div>

                  {/* Trạng thái tin nhắn: CHỈ hiển thị ở tin nhắn cuối cùng do tôi gửi (chuẩn UX Messenger / Zalo) */}
                  {index === lastMyMessageIndex && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mr-1 select-none">
                      {isSeen ? (
                        <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                          <span className="flex items-center -space-x-1.5">
                            <FiCheck className="text-xs" />
                            <FiCheck className="text-xs" />
                          </span>
                          <span>Đã xem</span>
                          {partnerAvatar ? (
                            <img
                              src={partnerAvatar}
                              alt={roomName}
                              className="w-3.5 h-3.5 rounded-full object-cover border border-indigo-200 shadow-xs"
                            />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-[8px] text-white flex items-center justify-center font-bold">
                              {(roomName || 'U').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <FiCheck className="text-xs" />
                          <span>Đã gửi</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                (() => {
                  const senderName =
                    message.sender?.name ||
                    (typeof message.senderId === 'object' ? (message.senderId as any)?.name : '') ||
                    (message.sender?.email ? message.sender.email.split('@')[0] : '') ||
                    (typeof message.senderId === 'object' && (message.senderId as any)?.email ? (message.senderId as any).email.split('@')[0] : '') ||
                    roomName ||
                    'Người dùng';

                  const senderAvatar =
                    message.sender?.avatar ||
                    (typeof message.senderId === 'object' ? (message.senderId as any)?.avatar : null) ||
                    partnerAvatar ||
                    null;

                  return (
                    <div className="flex items-start gap-3">
                      {senderAvatar ? (
                        <img
                          src={senderAvatar}
                          alt={senderName}
                          className="w-9 h-9 rounded-full object-cover shrink-0 mt-1 border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center shrink-0 mt-1">
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-1.5 max-w-[85%] lg:max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">{senderName}</span>
                          <span className="text-[11px] text-slate-400">{formatMessageTime(message.createdAt)}</span>
                        </div>
                        <div className="bg-white text-slate-800 text-sm leading-relaxed p-3.5 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm break-words whitespace-pre-wrap">
                          {parsed.text}
                          <FileBlock files={parsed.files} isMe={false} />
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </Fragment>
          );
        })}

        <div ref={messagesEndRef} className="h-px w-full shrink-0" />
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={sending}
        onFocus={triggerMarkAsRead}
      />
    </div>
  );
};

export default ChatBox;
