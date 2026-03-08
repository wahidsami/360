import React from 'react';
import { FileText, Download, XCircle } from 'lucide-react';
import { Button } from './ui/UIComponents';

interface DocumentViewerProps {
    url: string;
    filename: string;
    mimeType: string;
    onDownload?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, filename, mimeType, onDownload }) => {
    // Helper to infer MIME type from filename if provided type is generic
    const getEffectiveMimeType = (mime: string, name: string) => {
        if (mime !== 'application/octet-stream' && mime !== '') return mime;

        const ext = name.split('.').pop()?.toLowerCase();
        const mimeMap: Record<string, string> = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'image': 'image/jpeg',  // Handle nameless image uploads
            'screenshot': 'image/png' // Handle common nameless screenshots
        };
        return (ext && mimeMap[ext]) || mimeMap[name.toLowerCase()] || mime;
    };

    const effectiveMimeType = getEffectiveMimeType(mimeType, filename);
    const isImage = effectiveMimeType.startsWith('image/');
    const isPdf = effectiveMimeType === 'application/pdf';

    if (isImage) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 flex justify-center items-center min-h-[300px]">
                    <img
                        src={url}
                        alt={filename}
                        className="max-w-full max-h-[70vh] object-contain shadow-2xl"
                    />
                </div>
                {onDownload && (
                    <Button variant="secondary" onClick={onDownload} className="w-full">
                        <Download className="w-4 h-4 mr-2" /> Download Image
                    </Button>
                )}
            </div>
        );
    }

    if (isPdf) {
        return (
            <div className="flex flex-col space-y-4">
                <div className="w-full h-[70vh] rounded-lg border border-slate-700 overflow-hidden bg-slate-800">
                    <iframe
                        src={`${url}#toolbar=0`}
                        title={filename}
                        className="w-full h-full border-none"
                    />
                </div>
                {onDownload && (
                    <Button variant="secondary" onClick={onDownload} className="w-full">
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                )}
            </div>
        );
    }

    // Fallback for unsupported types
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
            <div className="p-4 bg-slate-800 rounded-full text-slate-500">
                <XCircle className="w-12 h-12" />
            </div>
            <div>
                <h3 className="text-xl font-semibold text-white mb-2">No Preview Available</h3>
                <p className="text-slate-400 max-w-xs mx-auto">
                    This file type ({effectiveMimeType}) cannot be previewed directly in the browser.
                </p>
            </div>
            {onDownload && (
                <Button onClick={onDownload} className="px-8">
                    <Download className="w-4 h-4 mr-2" /> Download to View
                </Button>
            )}
        </div>
    );
};
