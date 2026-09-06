import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { FiSearch, FiInfo, FiPaperclip, FiSmile, FiSend } from 'react-icons/fi';
import { IoCloudUploadOutline } from 'react-icons/io5';
import { ChatRoom, Message } from '../../types/index';
import { formatMessageTime } from '../../utils/formatMessageTime';
import { formatDividerDate } from '../../utils/formatDividerDate';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getMessages, sendMessage } from '../../services/chatRoom.service';
import { getSocket } from '../../services/socket';

interface ChatBoxProps {
  currentRoom: ChatRoom;
  onToggleDetails: () => void;
  onSendMessageSuccess?: () => void;
}

const ChatBox = ({
  currentRoom,
  onToggleDetails,
  onSendMessageSuccess,
}: ChatBoxProps) => {
  // State
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Store & Socket
  const currentUser = useBearerTokenStore((state) => state.user);
  const socket = useMemo(() => getSocket(), []);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const isPagingOlder = useRef(false);

  // API: Fetch
  const fetchMessages = async (pageNumber: number) => {
    if (loading || (!hasMore && pageNumber !== 1)) return;

    setLoading(true);
    try {
      const resData = await getMessages(currentRoom._id, pageNumber);
      const rawMessages =
        resData.data ?? (Array.isArray(resData) ? resData : []);
      const olderMessages = [...rawMessages].reverse();

      if (pageNumber === 1) {
        setMessages(olderMessages);
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

      setHasMore(resData.meta?.hasMore ?? olderMessages.length > 0);
      setPage(pageNumber);
    } catch (error) {
      console.error('Lỗi khi tải tin nhắn:', error);
    } finally {
      setLoading(false);
    }
  };

  // API: Send
  const handleSendMessage = async () => {
    const content = inputText.trim();
    if (!content || !currentRoom?._id) return;

    setInputText('');

    try {
      await sendMessage(currentRoom._id, content);
      onSendMessageSuccess?.();
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
    }
  };

  // Scroll: Pagination
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.scrollTop <= 20 && hasMore && !loading) {
      fetchMessages(page + 1);
    }
  };

  // Room change
  useEffect(() => {
    isFirstLoad.current = true;
    setPage(1);
    setHasMore(true);
    setMessages([]);

    if (currentRoom?._id) {
      fetchMessages(1);
    }
  }, [currentRoom?._id]);

  // Socket
  useEffect(() => {
    if (!currentRoom?._id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinRoom', { roomId: currentRoom._id });

    const handleNewMessage = (newMsg: Message) => {
      if (String(newMsg.roomId) === String(currentRoom._id)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.emit('leaveRoom', { roomId: currentRoom._id });
      socket.off('newMessage', handleNewMessage);
    };
  }, [currentRoom?._id, socket]);

  // Scroll: Auto-scroll
  useEffect(() => {
    if (isPagingOlder.current || messages.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (isFirstLoad.current) {
      container.scrollTop = container.scrollHeight;
      isFirstLoad.current = false;
      return;
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      180;

    const lastMessage = messages[messages.length - 1];
    const lastSenderId =
      typeof lastMessage?.senderId === 'object'
        ? (lastMessage.senderId as any)?._id
        : lastMessage?.senderId;
    const isMe = String(lastSenderId) === String(currentUser?._id);

    if (isNearBottom || isMe) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages, currentUser?._id]);

  return (
    <div className="flex-1 h-full flex flex-col bg-white border-r border-slate-100 min-w-0">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center">
              {currentRoom?.name
                ? currentRoom.name.charAt(0).toUpperCase()
                : 'C'}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-tight">
              {currentRoom?.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button className="p-2 rounded-xl hover:bg-slate-50 hover:text-slate-600 transition cursor-pointer">
            <FiSearch className="text-lg" />
          </button>
          <button
            type="button"
            onClick={onToggleDetails}
            className="p-2 rounded-xl hover:bg-slate-50 hover:text-slate-600 transition cursor-pointer"
            title="Room details"
          >
            <FiInfo className="text-lg" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 pb-2 space-y-6"
      >
        {loading && (
          <div className="text-center text-xs text-slate-400 py-1">
            Loading older messages...
          </div>
        )}

        {messages.map((message, index) => {
          const currentDate = new Date(message.createdAt || '').toDateString();
          const prevDate =
            index > 0
              ? new Date(messages[index - 1].createdAt || '').toDateString()
              : null;

          const showDivider = currentDate !== prevDate;

          const rawSenderId =
            typeof message.senderId === 'object'
              ? (message.senderId as any)?._id
              : message.senderId;
          const isMe =
            currentUser?._id && String(currentUser._id) === String(rawSenderId);

          return (
            <Fragment key={message._id}>
              {showDivider && (
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-100 w-full" />
                  <span className="bg-white px-3 text-[11px] font-medium text-slate-400 absolute">
                    {formatDividerDate(message.createdAt)}
                  </span>
                </div>
              )}

              {isMe ? (
                <div className="flex flex-col items-end space-y-1">
                  <span className="text-[11px] text-slate-400 mr-1">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  <div className="relative max-w-[70%] mb-2">
                    <div className="bg-indigo-600 text-white text-xs leading-relaxed py-2.5 px-4 rounded-2xl rounded-tr-sm shadow-xs break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    {message.sender?.name
                      ? message.sender.name.charAt(0).toUpperCase()
                      : 'M'}
                  </div>
                  <div className="space-y-1.5 max-w-[55%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {message.sender?.name || 'Member'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                    <div className="bg-slate-50 text-slate-700 text-xs leading-relaxed p-3.5 rounded-2xl rounded-tl-sm border border-slate-100/80 break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}

        <div ref={messagesEndRef} className="h-px w-full shrink-0" />
      </div>

      {/* Input Footer */}
      <div className="border-t border-slate-100 shrink-0">
        <div className="border border-slate-200 p-3 bg-white transition shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <button className="p-1 hover:text-slate-600 transition">
                <FiPaperclip className="text-xs" />
              </button>
              <button className="p-1 hover:text-slate-600 transition">
                <FiSmile className="text-xs" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 select-none">
              <IoCloudUploadOutline className="text-sm" />
              <span className="text-xs">Drop files here to share</span>
            </div>
          </div>

          <div className="flex items-end gap-2 mt-2">
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Write a message..."
              className="w-full text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none py-1.5 max-h-24"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="w-7 h-7 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition cursor-pointer"
            >
              <FiSend className="text-xs -translate-x-0.5 translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
