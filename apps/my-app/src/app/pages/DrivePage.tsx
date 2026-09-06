import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  FiUploadCloud,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiFileText,
  FiImage,
  FiMusic,
  FiVideo,
  FiFile,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import Spinner from '../components/common/Spinner';
import { DriveFile } from '../types/drive.types';
import {
  getMyFiles,
  uploadFiles,
  deleteFile,
  getDownloadUrl,
  getPreviewUrl,
} from '../services/drive.service';
import { ShareModal } from '../components/drive/ShareModal';

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (contentType?: string) => {
  if (!contentType) return <FiFile className="text-xl text-slate-400" />;
  if (contentType.startsWith('image/'))
    return <FiImage className="text-xl text-emerald-500" />;
  if (contentType.startsWith('video/'))
    return <FiVideo className="text-xl text-violet-500" />;
  if (contentType.startsWith('audio/'))
    return <FiMusic className="text-xl text-amber-500" />;
  if (contentType.includes('pdf') || contentType.includes('text'))
    return <FiFileText className="text-xl text-blue-500" />;
  return <FiFile className="text-xl text-slate-400" />;
};

const DrivePage = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sharingFile, setSharingFile] = useState<DriveFile | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await getMyFiles();
      setFiles(data);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      await uploadFiles(selectedFiles);
      toast.success(`Đã tải lên ${selectedFiles.length} tệp thành công`);
      await fetchFiles();
    } catch (err: any) {
      toast.error(err.message || 'Tải file thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Xóa tệp "${file.name}"?`)) return;
    try {
      await deleteFile(file.gridfsFileId);
      setFiles((prev) => prev.filter((f) => f._id !== file._id));
      toast.success('Đã xóa tệp thành công');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tệp');
    }
  };

  return (
    <div className="flex-1 h-full bg-slate-50 flex flex-col overflow-hidden p-6 select-none">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Cloud Drive
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {files.length} tệp đã lưu trữ
          </p>
        </div>

        <div>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <FiUploadCloud className="text-base" />

            <span>{uploading ? 'Đang tải lên...' : 'Tải tệp lên'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-6">
        {loading ? (
          <Spinner loading={loading} />
        ) : files.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <FiUploadCloud className="text-5xl stroke-[1] mb-2" />
            <p className="text-xs">Chưa có tệp tin nào trong Drive của bạn</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {files.map((file) => {
              const isImage = file.contentType?.startsWith('image/');
              const previewUrl = getPreviewUrl(file.gridfsFileId);

              return (
                <div
                  key={file._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col overflow-hidden group"
                >
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-40 bg-slate-50 relative flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer"
                  >
                    {isImage ? (
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : file.contentType === 'application/pdf' ? (
                      <iframe
                        src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                        title={file.name}
                        className="w-full h-full border-none pointer-events-none scale-100 overflow-hidden select-none"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="p-3 rounded-2xl bg-white shadow-xs">
                          {getFileIcon(file.contentType)}
                        </div>
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                          {file.extension || 'Tệp tin'}
                        </span>
                      </div>
                    )}

                    {file.isShared && (
                      <span
                        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-indigo-600 text-[10px] font-semibold shadow-xs"
                        title="Tệp đang được chia sẻ công khai"
                      >
                        <FiShare2 className="text-[9px]" />
                        Shared
                      </span>
                    )}
                  </a>

                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <div className="min-w-0">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate block cursor-pointer"
                        title={file.name}
                      >
                        {file.name}
                      </a>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-50">
                      <button
                        onClick={() => setSharingFile(file)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          file.isShared
                            ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={
                          file.isShared ? 'Quản lý chia sẻ' : 'Chia sẻ tệp'
                        }
                      >
                        <FiShare2 className="text-sm" />
                      </button>
                      <a
                        href={getDownloadUrl(file.gridfsFileId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="Tải xuống"
                      >
                        <FiDownload className="text-sm" />
                      </a>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Xóa tệp"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ShareModal
        file={sharingFile}
        isOpen={!!sharingFile}
        onClose={() => {
          setSharingFile(null);
          fetchFiles();
        }}
      />
    </div>
  );
};

export default DrivePage;
