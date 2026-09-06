import { useState } from 'react';
import {
  FiMoreHorizontal,
  FiPlus,
  FiBell,
  FiArchive,
  FiLogOut,
} from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { RoomDetailsProps } from '../../types/chat.types';

const RoomDetails = ({ currentRoom, isOpen }: RoomDetailsProps) => {
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'files'>(
    'members',
  );
  const [isMuted, setIsMuted] = useState(true);

  return (
    <aside
      className={`h-full bg-white flex flex-col justify-between select-none overflow-y-auto border-slate-100 shrink-0 transition-all duration-400 ease-in-out ${
        isOpen
          ? 'w-80 p-6 border-l opacity-100'
          : 'w-0 p-0 border-l-0 opacity-0 pointer-events-none'
      }`}
    >
      <div className="w-full flex flex-col justify-between h-full">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-800 tracking-tight whitespace-nowrap">
              Room details
            </h3>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition cursor-pointer">
              <FiMoreHorizontal className="text-lg" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50/70 text-indigo-600 flex items-center justify-center mb-3">
              <HiOutlineUserGroup className="text-3xl stroke-[1.5]" />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1 truncate max-w-full">
              {currentRoom.name}
            </h4>
          </div>

          <div className="flex items-center border-b border-slate-100 mb-5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-2 mr-6 relative transition-colors cursor-pointer ${
                activeTab === 'members'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Members</span>
              <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                {currentRoom.members?.length}
              </span>
              {activeTab === 'members' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`pb-2 mr-6 relative transition-colors cursor-pointer ${
                activeTab === 'media'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Media
              {activeTab === 'media' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`pb-2 relative transition-colors cursor-pointer ${
                activeTab === 'files'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Files
              {activeTab === 'files' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="space-y-3.5 mb-5">
              {currentRoom?.members?.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col text-left truncate">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {member.user?.name}
                      </span>
                    </div>
                  </div>

                  <button className="p-1 text-slate-300 hover:text-slate-500 rounded transition opacity-80 group-hover:opacity-100 cursor-pointer">
                    <FiMoreHorizontal className="text-base" />
                  </button>
                </div>
              ))}

              <button className="flex items-center gap-2 pt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition cursor-pointer">
                <FiPlus className="text-sm stroke-[3]" />
                <span>Add member</span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <FiBell className="text-base text-slate-400" />
              <span>Mute notifications</span>
            </div>

            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                isMuted ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                  isMuted ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button className="flex items-center gap-3 w-full text-xs text-slate-600 font-medium hover:text-slate-900 transition cursor-pointer">
            <FiArchive className="text-base text-slate-400" />
            <span>Archive room</span>
          </button>

          <button className="flex items-center gap-3 w-full text-xs text-rose-500 font-medium hover:text-rose-600 transition cursor-pointer">
            <FiLogOut className="text-base text-rose-400" />
            <span>Leave room</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default RoomDetails;
