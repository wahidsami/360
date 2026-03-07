import React, { useRef, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './UIComponents';

interface ImageUploadProps {
    label?: string;
    initialPreview?: string;
    onFileSelect: (file: File | null) => void;
    className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    label = "Upload Image",
    initialPreview,
    onFileSelect,
    className
}) => {
    const [preview, setPreview] = useState<string | null>(initialPreview || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialPreview) {
            setPreview(initialPreview);
        }
    }, [initialPreview]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            onFileSelect(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>}

            <div className="flex items-center gap-4">
                <div
                    onClick={triggerUpload}
                    className={`
            relative w-24 h-24 rounded-full border-2 border-dashed border-slate-600 
            flex items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group overflow-hidden
            ${preview ? 'border-none' : ''}
          `}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-emerald-400" />
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={triggerUpload}>
                        {preview ? 'Change Logo' : 'Select Logo'}
                    </Button>
                    {preview && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="text-rose-400 hover:text-rose-300">
                            <X className="w-4 h-4 mr-2" />
                            Remove
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
