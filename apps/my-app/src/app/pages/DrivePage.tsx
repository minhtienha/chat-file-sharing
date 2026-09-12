import { useState, useEffect, useRef, ChangeEvent, useCallback, useMemo } from 'react';
import {
  FiUploadCloud,
  FiTrash2,
  FiShare2,
  FiDownload,
  FiFileText,
  FiImage,
  FiArchive,
  FiFilm,
  FiSearch,
  FiGrid,
  FiList,
  FiCheck,
} from 'react-icons/fi';
import { DriveFile } from '../types/index';
import {
  getMyFiles,
  deleteFile,
  uploadFiles,
  getPreviewUrl,
  getDownloadUrl,
} from '../services/drive.service';
import Spinner from '../components/common/Spinner';
import { ShareModal } from '../components/drive/ShareModal';
import { formatFileSize } from '../utils/formatFileSize';
import { toast } from 'react-toastify';

const getFileIcon = (contentType?: string) => {
  if (!contentType) return <FiFileText className="text-3xl text-slate-400" />;
  if (contentType.startsWith('image/')) return <FiImage className="text-3xl text-sky-400" />;
  if (contentType.startsWith('video/')) return <FiFilm className="text-3xl text-rose-400" />;
  if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('rar'))
    return <FiArchive className="text-3xl text-amber-400" />;
  return <FiFileText className="text-3xl text-indigo-400" />;
};

type FilterType = 'ALL' | 'IMAGE' | 'DOCUMENT' | 'MEDIA';

const DrivePage = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharingFile, setSharingFile] = useState<DriveFile | null>(null);

  // Tìm kiếm và bộ lọc định dạng
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  // Chế độ xem trên Desktop (Grid / Table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
      await uploadFiles(Array.from(selectedFiles), 'drive');
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

  // Lọc tệp theo ô tìm kiếm và tag định dạng
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const matchesSearch =
        !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === 'ALL') return true;
      if (filterType === 'IMAGE') return f.contentType?.startsWith('image/');
      if (filterType === 'DOCUMENT') {
        const type = f.contentType || '';
        return (
          type.includes('pdf') ||
          type.includes('text') ||
          type.includes('document') ||
          type.includes('sheet') ||
          type.includes('presentation') ||
          (!type.startsWith('image/') && !type.startsWith('video/'))
        );
      }
      if (filterType === 'MEDIA') {
        const type = f.contentType || '';
        return (
          type.startsWith('video/') ||
          type.startsWith('audio/') ||
          type.includes('zip') ||
          type.includes('tar') ||
          type.includes('rar')
        );
      }
      return true;
    });
  }, [files, searchQuery, filterType]);

  return (
    <div className="flex-1 h-full bg-slate-50/60 flex flex-col overflow-hidden relative select-none">
      {/* Header chính */}
      <div className="p-4 lg:p-6 bg-white border-b border-slate-100 shrink-0 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">
              Cloud Drive
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Lưu trữ, quản lý và chia sẻ tệp tin tốc độ cao
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white text-xs font-semibold rounded-2xl shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <FiUploadCloud className="text-base" />
              <span>{uploading ? 'Đang tải lên...' : 'Tải tệp lên'}</span>
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc & Chuyển chế độ Grid/Table */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md flex items-center">
            <FiSearch className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tệp theo tên..."
              className="w-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200/70 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Bộ lọc loại tệp */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/70 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'IMAGE', label: 'Ảnh' },
                { id: 'DOCUMENT', label: 'Tài liệu' },
                { id: 'MEDIA', label: 'Media' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setFilterType(filter.id as FilterType)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    filterType === filter.id
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Chuyển đổi View Grid / Table (Desktop) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Chế độ lưới"
              >
                <FiGrid className="text-sm" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Chế độ danh sách"
              >
                <FiList className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung danh sách tệp */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/60 min-h-0">
        {loading ? (
          <Spinner loading={loading} />
        ) : filteredFiles.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm shadow-indigo-100/50">
              <FiUploadCloud className="text-3xl" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {searchQuery ? 'Không tìm thấy tệp phù hợp' : 'Chưa có tệp tin nào trong Drive'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">
              {searchQuery
                ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.'
                : 'Bắt đầu bằng cách tải lên các tệp tài liệu, hình ảnh hoặc tài nguyên của bạn.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm cursor-pointer"
              >
                Tải tệp đầu tiên
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop: Grid View hoặc Table View */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredFiles.map((file) => {
                  const isImage = file.contentType?.startsWith('image/');
                  const previewUrl = getPreviewUrl(file.gridfsFileId);

                  return (
                    <div
                      key={file._id}
                      className="bg-white rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col overflow-hidden group"
                    >
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full h-36 bg-slate-50 relative flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer"
                      >
                        {isImage ? (
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            loading="lazy"
                          />
                        ) : file.contentType === 'application/pdf' ? (
                          <div className="w-full h-full relative">
                            <div className="absolute inset-0 z-10" />
                            <iframe
                              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                              title={file.name}
                              className="w-full h-full border-none pointer-events-none scale-110"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {getFileIcon(file.contentType)}
                            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 bg-white px-2 py-1 rounded-lg shadow-xs">
                              {file.extension || 'FILE'}
                            </span>
                          </div>
                        )}
                        {file.isShared && (
                          <span
                            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-xs"
                            title="Tệp đang chia sẻ công khai"
                          >
                            <FiShare2 className="text-[10px]" /> Shared
                          </span>
                        )}
                      </a>

                      <div className="p-3.5 flex flex-col flex-1">
                        <div className="mb-3">
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block cursor-pointer"
                            title={file.name}
                          >
                            {file.name}
                          </a>
                          <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                            {formatFileSize(file.size)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100/80">
                          <button
                            type="button"
                            onClick={() => setSharingFile(file)}
                            className={`p-2 rounded-xl transition cursor-pointer flex-1 flex justify-center ${
                              file.isShared
                                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                            }`}
                            title="Chia sẻ link"
                          >
                            <FiShare2 className="text-sm" />
                          </button>
                          <div className="w-px h-4 bg-slate-200/60 mx-1" />
                          <a
                            href={getDownloadUrl(file.gridfsFileId)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer flex-1 flex justify-center"
                            title="Tải xuống"
                          >
                            <FiDownload className="text-sm" />
                          </a>
                          <div className="w-px h-4 bg-slate-200/60 mx-1" />
                          <button
                            type="button"
                            onClick={() => handleDelete(file)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex-1 flex justify-center"
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
            ) : (
              /* Desktop: Table View */
              <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Tên tệp tin</th>
                      <th className="py-3 px-4">Định dạng</th>
                      <th className="py-3 px-4">Dung lượng</th>
                      <th className="py-3 px-4">Chia sẻ</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredFiles.map((file) => {
                      const isImage = file.contentType?.startsWith('image/');
                      const previewUrl = getPreviewUrl(file.gridfsFileId);

                      return (
                        <tr key={file._id} className="hover:bg-slate-50/70 transition group">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-3 min-w-0 max-w-md">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                {isImage ? (
                                  <img
                                    src={previewUrl}
                                    alt={file.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <FiFileText className="text-indigo-600 text-base" />
                                )}
                              </div>
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate hover:text-indigo-600"
                              >
                                {file.name}
                              </a>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 uppercase font-medium">
                            {file.extension || 'FILE'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="py-3 px-4">
                            {file.isShared ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                                <FiCheck className="text-xs" /> Public
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Riêng tư</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSharingFile(file)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Chia sẻ"
                              >
                                <FiShare2 className="text-sm" />
                              </button>
                              <a
                                href={getDownloadUrl(file.gridfsFileId)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Tải xuống"
                              >
                                <FiDownload className="text-sm" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDelete(file)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Xóa"
                              >
                                <FiTrash2 className="text-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Phân trang (Pagination) Hiện Đại */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 pb-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition shadow-xs cursor-pointer"
            >
              Trước
            </button>
            <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-white rounded-xl border border-slate-100 shadow-2xs">
              Trang {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition shadow-xs cursor-pointer"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) góc dưới bên phải */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white rounded-full shadow-xl shadow-indigo-300 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
          title="Tải tệp lên"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiUploadCloud className="text-2xl" />
          )}
        </button>
      </div>

      {/* Modal Chia Sẻ Tệp */}
      <ShareModal
        file={sharingFile}
        isOpen={!!sharingFile}
        onClose={() => {
          setSharingFile(null);
          fetchFiles(page);
        }}
      />
    </div>
  );
};

export default DrivePage;
