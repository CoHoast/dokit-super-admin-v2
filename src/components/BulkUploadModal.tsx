'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, File, CheckCircle, XCircle, Loader2, FolderUp } from 'lucide-react';

interface UploadResult {
  filename: string;
  status: 'success' | 'error';
  fileId?: number;
  recordId?: number;
  error?: string;
}

interface BulkUploadModalProps {
  clientId: number;
  workflowKey: string;
  workflowName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({
  clientId,
  workflowKey,
  workflowName,
  onClose,
  onSuccess
}: BulkUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    // Filter for allowed file types
    const allowedTypes = ['application/pdf', 'image/tiff', 'image/png', 'image/jpeg', 'image/jpg'];
    const validFiles = newFiles.filter(f => 
      allowedTypes.includes(f.type) || 
      f.name.endsWith('.pdf') || 
      f.name.endsWith('.tiff') || 
      f.name.endsWith('.tif') ||
      f.name.endsWith('.png') ||
      f.name.endsWith('.jpg') ||
      f.name.endsWith('.jpeg')
    );

    // Remove duplicates by name
    const existingNames = new Set(files.map(f => f.name));
    const uniqueNewFiles = validFiles.filter(f => !existingNames.has(f.name));

    setFiles(prev => [...prev, ...uniqueNewFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('clientId', clientId.toString());
      formData.append('workflowKey', workflowKey);
      
      for (const file of files) {
        formData.append('files', file);
      }

      const response = await fetch('/api/intake/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        
        // If all succeeded, auto-close after delay
        if (data.summary.failed === 0) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        setResults([{
          filename: 'Upload',
          status: 'error',
          error: data.error || 'Upload failed'
        }]);
      }
    } catch (error) {
      setResults([{
        filename: 'Upload',
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }]);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Upload</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload multiple files to {workflowName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!results ? (
            <>
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${dragActive 
                    ? 'border-violet-500 bg-violet-50' 
                    : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.tiff,.tif,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FolderUp className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-violet-500' : 'text-gray-400'}`} />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, TIFF, PNG, JPG files
                </p>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      Selected Files ({files.length})
                    </h3>
                    <button
                      onClick={() => setFiles([])}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Results */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                {results.every(r => r.status === 'success') ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">Upload Complete!</p>
                      <p className="text-sm text-gray-500">
                        {results.length} file{results.length !== 1 ? 's' : ''} uploaded successfully
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="font-medium text-gray-900">Upload Complete with Errors</p>
                      <p className="text-sm text-gray-500">
                        {results.filter(r => r.status === 'success').length} succeeded, {' '}
                        {results.filter(r => r.status === 'error').length} failed
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{result.filename}</p>
                        {result.error && (
                          <p className="text-xs text-red-600">{result.error}</p>
                        )}
                        {result.recordId && (
                          <p className="text-xs text-green-600">Created record #{result.recordId}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          {!results ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {files.length} File{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setFiles([]);
                  setResults(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Upload More
              </button>
              <button
                onClick={onSuccess}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
