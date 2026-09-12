import { useState, useEffect, useRef, ChangeEvent, useCallback } from 'react';
import { FiUploadCloud, FiTrash2, FiShare2, FiDownload, FiFileText, FiImage, FiArchive, FiFilm } from 'react-icons/fi';
import { DriveFile } from '../types/index';
import { getMyFiles, deleteFile, uploadFiles, getPreviewUrl, getDownloadUrl } from '../services/drive.service';
import Spinner from '../components/common/Spinner';
import { ShareModal } from '../components/drive/ShareModal';
import { formatFileSize } from '../utils/formatFileSize';
import { toast } from 'react-toastify';

const getFileIcon = (contentType?: string) => {
  if (!contentType) return <FiFileText className="text-3xl text-slate-400" />;
  if (contentType.startsWith('image/')) return <FiImage className="text-3xl text-sky-400" />;
  if (contentType.startsWith('video/')) return <FiFilm className="text-3xl text-rose-400" />;
  if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('rar')) return <FiArchive className="text-3xl text-amber-400" />;
  return <FiFileText className="text-3xl text-indigo-400" />;
};

const DrivePage = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharingFile, setSharingFile] = useState<DriveFile | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      const res = await getMyFiles(currentPage, limit);
      if (res && res.data) {
        setFiles(res.data);
        setTotalPages(res.meta?.totalPages || 1);
      } else if (Array.isArray(res)) {
        setFiles(res);
        setTotalPages(1);
      } else {
        setFiles([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải tệp tin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(page);
  }, [page, fetchFiles]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      await uploadFiles(Array.from(selectedFiles));
      toast.success(`Đã tải lên ${selectedFiles.length} tệp thành công`);
      await fetchFiles(1);
      setPage(1);
    } catch (err: any) {
      toast.error(err.message || 'Tải file thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!window.confirm(`Xóa tệp "${file.name}"?`)) return;
    try {
      await deleteFile(file.gridfsFileId);
      setFiles((prev) => prev.filter((f) => f._id !== file._id));
      toast.success('Đã xóa tệp thành công');
      if (files.length === 1 && page > 1) {
        setPage(prev => prev - 1);
      } else {
        fetchFiles(page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tệp');
    }
  };

  return (
    <div className="flex-1 h-full bg-slate-50 flex flex-col overflow-hidden relative">
      <div className="hidden md:flex items-center justify-between p-6 pb-4 shrink-0 bg-white border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cloud Drive</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Lưu trữ và chia sẻ an toàn</p>
        </div>
        <div>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <FiUploadCloud className="text-lg" />
            <span>{uploading ? 'Đang tải lên...' : 'Tải tệp lên'}</span>
          </button>
        </div>
      </div>

      <div className="md:hidden flex items-center justify-between p-4 shrink-0 bg-white border-b border-slate-100 shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800">Drive</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
        {loading ? (
          <Spinner loading={loading} />
        ) : files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
            <FiUploadCloud className="text-6xl stroke-[1] mb-4 text-slate-300" />
            <p className="text-sm font-medium">Chưa có tệp tin nào trong Drive của bạn</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => {
              const isImage = file.contentType?.startsWith('image/');
              const previewUrl = getPreviewUrl(file.gridfsFileId);

              return (
                <div key={file._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col overflow-hidden group">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="w-full h-36 bg-slate-50 relative flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer">
                    {isImage ? (
                      <img src={previewUrl} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                    ) : file.contentType === 'application/pdf' ? (
                      <div className="w-full h-full relative">
                         <div className="absolute inset-0 z-10" />
                         <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} title={file.name} className="w-full h-full border-none pointer-events-none scale-110" loading="lazy" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {getFileIcon(file.contentType)}
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 bg-white px-2 py-1 rounded-lg shadow-sm">
                          {file.extension || 'FILE'}
                        </span>
                      </div>
                    )}
                    {file.isShared && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold shadow-sm" title="Tệp đang chia sẻ công khai">
                        <FiShare2 className="text-[10px]" /> Shared
                      </span>
                    )}
                  </a>

                  <div className="p-3.5 flex flex-col flex-1">
                    <div className="mb-3">
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-800 hover:text-indigo-600 truncate block cursor-pointer" title={file.name}>
                        {file.name}
                      </a>
                      <span className="text-[11px] font-medium text-slate-400 block mt-0.5">{formatFileSize(file.size)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                      <button onClick={() => setSharingFile(file)} className={`p-2 rounded-xl transition cursor-pointer flex-1 flex justify-center ${file.isShared ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`} title="Chia sẻ link">
                        <FiShare2 className="text-[15px]" />
                      </button>
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      <a href={getDownloadUrl(file.gridfsFileId)} className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer flex-1 flex justify-center" title="Tải xuống">
                        <FiDownload className="text-[15px]" />
                      </a>
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      <button onClick={() => handleDelete(file)} className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex-1 flex justify-center" title="Xóa tệp">
                        <FiTrash2 className="text-[15px]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8 pb-4">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition shadow-sm cursor-pointer"
            >
              Trước
            </button>
            <span className="text-sm font-semibold text-slate-600">Trang {page} / {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition shadow-sm cursor-pointer"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-xl flex items-center justify-center transition-transform disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FiUploadCloud className="text-2xl" />
          )}
        </button>
      </div>

      <ShareModal file={sharingFile} isOpen={!!sharingFile} onClose={() => { setSharingFile(null); fetchFiles(page); }} />
    </div>
  );
};
export default DrivePage;
