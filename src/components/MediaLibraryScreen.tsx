import React, { useState, useRef } from "react";
import { MediaFile } from "../types";
import {
  Image,
  UploadCloud,
  File,
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Eye
} from "lucide-react";

interface MediaLibraryScreenProps {
  files: MediaFile[];
  onUploadFile: (name: string, size: string, url: string) => void;
  onDeleteFile: (id: string) => void;
}

export default function MediaLibraryScreen({
  files,
  onUploadFile,
  onDeleteFile
}: MediaLibraryScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processUploadedFile(droppedFiles[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      processUploadedFile(selected[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    // Generate a beautiful preview URL using URL.createObjectURL or mock placeholder
    const mockUrl = URL.createObjectURL(file);
    const sizeStr = (file.size / 1024).toFixed(0) + " KB";
    onUploadFile(file.name, sizeStr, mockUrl);
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl text-gray-950 tracking-tight">
            Media Library
          </h2>
          <p className="text-gray-500 text-sm mt-1">Upload and store images to use on your bio links.</p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Drag & Drop File Uploader conforming to Usability Patterns */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[#4F46E5] bg-indigo-50/10"
            : "border-gray-200 hover:border-gray-300 bg-white"
        }`}
      >
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mb-4">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h4 className="font-display font-bold text-gray-950 text-base">
          Drag & drop images here, or click to upload
        </h4>
        <p className="text-gray-400 text-xs mt-1.5">
          Supports PNG, JPG, GIF, WebP up to 5MB
        </p>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {files.map((file) => (
          <div
            key={file.id}
            className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm group flex flex-col justify-between"
          >
            {/* Thumbnail preview */}
            <div className="h-40 bg-slate-50 relative flex items-center justify-center overflow-hidden border-b border-gray-50">
              <img
                src={file.url}
                alt={file.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-2 bg-white text-gray-800 rounded-xl hover:bg-slate-50 shadow-sm"
                  title="View Image"
                >
                  <Eye className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => handleCopy(file.id, file.url)}
                  className="p-2 bg-white text-gray-800 rounded-xl hover:bg-slate-50 shadow-sm"
                  title="Copy Link URL"
                >
                  {copiedId === file.id ? (
                    <Check className="h-4.5 w-4.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Meta details */}
            <div className="p-4 flex items-center justify-between">
              <div className="overflow-hidden">
                <h5 className="font-sans font-semibold text-gray-950 text-xs truncate">
                  {file.name}
                </h5>
                <span className="text-[10px] text-gray-400 font-medium font-mono mt-0.5 block">
                  {file.size} • {file.uploadedAt}
                </span>
              </div>

              <button
                onClick={() => onDeleteFile(file.id)}
                className="text-gray-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-all"
                title="Delete file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-gray-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
              <h4 className="font-display font-bold text-gray-950 text-base">{previewFile.name}</h4>
              <button onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-100 flex items-center justify-center p-4 max-h-[400px]">
              <img
                src={previewFile.url}
                alt="Full Preview"
                referrerPolicy="no-referrer"
                className="max-h-[350px] object-contain rounded-xl"
              />
            </div>

            <div className="p-4 bg-white flex items-center justify-between border-t border-gray-50">
              <div className="text-xs text-gray-400 font-mono">
                Size: {previewFile.size} • Uploaded: {previewFile.uploadedAt}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(previewFile.id, previewFile.url)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {copiedId === previewFile.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Direct</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
