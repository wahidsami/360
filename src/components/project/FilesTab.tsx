import React, { useState, useRef } from 'react';
import { FileAsset, Permission } from '@/types';
import { Button, GlassCard, Badge, Modal, Input } from '../ui/UIComponents';
import { Upload, File, FileText, Image, Download, Eye, X, Trash2 } from 'lucide-react';
import { DocumentViewer } from '../DocumentViewer';
import { PermissionGate } from '../PermissionGate';
import { formatDistanceToNow } from 'date-fns';

interface FilesTabProps {
    files: FileAsset[];
    onUpload: (file: File, metadata: { name: string; category: string; visibility: string }) => Promise<void>;
    onDownload?: (fileId: string, download?: boolean) => Promise<string | undefined>;
    onDelete?: (fileId: string) => Promise<void>;
}

export const FilesTab: React.FC<FilesTabProps> = ({ files, onUpload, onDownload, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [viewModal, setViewModal] = useState<{ isOpen: boolean; url: string; filename: string; mimeType: string; fileId: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            alert("Please select a file first");
            return;
        }

        const formData = new FormData(e.target as HTMLFormElement);
        const metadata = {
            name: (formData.get('name') as string) || selectedFile.name,
            category: formData.get('category') as any,
            visibility: formData.get('visibility') as any,
        };

        setIsUploading(true);
        try {
            await onUpload(selectedFile, metadata);
            setIsModalOpen(false);
            setSelectedFile(null);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (file: FileAsset) => {
        setDownloadingId(file.id);
        try {
            let url = file.url;
            if (onDownload) {
                url = (await onDownload(file.id, true)) || file.url;
            }
            if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                alert('Download URL not available.');
            }
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to download file.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleView = async (file: FileAsset) => {
        setDownloadingId(file.id);
        try {
            let url = file.url;
            if (onDownload) {
                url = (await onDownload(file.id, false)) || file.url;
            }
            if (url) {
                setViewModal({
                    isOpen: true,
                    url,
                    filename: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    fileId: file.id
                });
            } else {
                alert('View URL not available.');
            }
        } catch (err) {
            console.error('View failed', err);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (file: FileAsset) => {
        if (!window.confirm(`Are you sure you want to delete "${file.name}"? This cannot be undone.`)) return;
        if (onDelete) {
            setDownloadingId(file.id);
            try {
                await onDelete(file.id);
            } catch (err) {
                console.error('Delete failed', err);
                alert('Failed to delete file.');
            } finally {
                setDownloadingId(null);
            }
        }
    };

    const getFileIcon = (type?: string) => {
        if (!type) return <File className="w-8 h-8 text-cyan-400" />;
        if (type.includes('image')) return <Image className="w-8 h-8 text-purple-400" />;
        if (type.includes('pdf')) return <FileText className="w-8 h-8 text-rose-400" />;
        return <File className="w-8 h-8 text-cyan-400" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Project Files</h3>
                <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Upload File
                    </Button>
                </PermissionGate>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map(file => (
                    <GlassCard key={file.id} className="p-4 flex items-start justify-between group hover:border-cyan-500/50 transition-all">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                {getFileIcon(file.type)}
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-medium text-white truncate max-w-[150px]" title={file.name}>{file.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge size="sm" variant="neutral" className="text-[10px]">{file.category}</Badge>
                                    <span className="text-xs text-slate-500">{file.size}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {file.uploadedAt && !isNaN(new Date(file.uploadedAt).getTime()) ? `Uploaded ${formatDistanceToNow(new Date(file.uploadedAt))} ago by ${file.uploaderName}` : `Uploaded unknown date by ${file.uploaderName}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleDownload(file)}
                                disabled={downloadingId === file.id}
                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-white disabled:opacity-50"
                                title="Download"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleView(file)}
                                disabled={downloadingId === file.id}
                                className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-50"
                                title={file.visibility || 'View'}
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            {onDelete && (
                                <button
                                    onClick={() => handleDelete(file)}
                                    disabled={downloadingId === file.id}
                                    className="p-2 bg-rose-900/40 hover:bg-rose-700/60 rounded text-rose-400 hover:text-rose-200 disabled:opacity-50"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </GlassCard>
                ))}
                {files.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                        <Upload className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No files uploaded yet.</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedFile(null); }} title="Upload File">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center bg-slate-800/20 hover:bg-slate-800/40 transition-colors cursor-pointer relative"
                    >
                        {selectedFile ? (
                            <div className="flex flex-col items-center">
                                <FileText className="w-10 h-10 text-cyan-400 mb-2" />
                                <p className="text-white font-medium truncate max-w-full px-4">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="mt-2 text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs"
                                >
                                    <X className="w-3 h-3" /> Remove
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                                <p className="text-slate-300">Click to select or drag file here</p>
                            </>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                    <Input name="name" label="Display Name" placeholder="Defaults to file name if empty" />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                            <select name="category" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                                <option value="DOCS">Document/Report</option>
                                <option value="DESIGNS">Design Asset</option>
                                <option value="BUILDS">Build/Release</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Visibility</label>
                            <select name="visibility" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                                <option value="INTERNAL">Internal Only</option>
                                <option value="CLIENT">Shared with Client</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setSelectedFile(null); }}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={!selectedFile || isUploading}>
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Document Viewer Modal */}
            {viewModal && (
                <Modal
                    isOpen={viewModal.isOpen}
                    onClose={() => setViewModal(null)}
                    title={viewModal.filename}
                    maxWidth="max-w-4xl"
                >
                    <DocumentViewer
                        url={viewModal.url}
                        filename={viewModal.filename}
                        mimeType={viewModal.mimeType}
                        onDownload={() => handleDownload(files.find(f => f.id === viewModal.fileId)!)}
                    />
                </Modal>
            )}
        </div>
    );
};
