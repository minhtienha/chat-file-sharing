import { BsChatSquareDots, BsShieldCheck } from 'react-icons/bs';
import { FiPlus } from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi2';

const WelcomeChat = () => {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-50/50 p-8 select-none text-center">
      {/* Main */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs border border-indigo-100/60">
          <BsChatSquareDots className="text-3xl stroke-[0.3]" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-xl bg-amber-400 text-white flex items-center justify-center shadow-sm">
          <HiOutlineSparkles className="text-sm" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
        Welcome to your workspace chat
      </h2>
      <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-8">
        Select an existing conversation from the left sidebar or start a new
        direct message with your team members.
      </p>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-10">
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-200 transition">
          <FiPlus className="text-base stroke-[2.5]" />
          <span>New conversation</span>
        </button>
      </div>

      {/* Bottom */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <BsShieldCheck className="text-emerald-500 text-sm" />
        <span>End-to-end encrypted messaging</span>
      </div>
    </div>
  );
};

export default WelcomeChat;
