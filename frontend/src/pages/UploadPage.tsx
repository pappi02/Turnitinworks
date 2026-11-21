import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_FILES = 10;

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) return '📝';
    return '📎';
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PDF and DOCX files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 50MB';
    }
    if (files.some(f => f.file.name === file.name)) {
      return 'This file is already added';
    }
    return null;
  };

  const handleFiles = (fileList: FileList) => {
    if (files.length >= MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);

      if (error) {
        setUploadError(`${file.name}: ${error}`);
        continue;
      }

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        progress: 0,
        status: 'pending',
      });
    }

    setFiles([...files, ...newFiles]);
    setUploadError('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      setUploadError('No files to upload');
      return;
    }

    for (const uploadFile of pendingFiles) {
      await uploadFile.file;
      
      // Update status to uploading
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        // Simulate upload with FormData
        const formData = new FormData();
        formData.append('document', uploadFile.file);
        formData.append('title', uploadFile.file.name);

        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setFiles(prev => prev.map(f =>
            f.id === uploadFile.id ? { ...f, progress: i } : f
          ));
        }

        // Mark as completed
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f
        ));
      } catch (error: any) {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: error.message || 'Upload failed' }
            : f
        ));
      }
    }

    // Show success message if all uploaded
    const completedCount = files.filter(f => f.status === 'completed').length;
    if (completedCount > 0) {
      setUploadMessage(`Successfully uploaded ${completedCount} file(s)`);
      setTimeout(() => {
        if (completedCount === files.length) {
          navigate('/dashboard');
        }
      }, 2000);
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Upload Documents</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-blue-600 font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Alerts */}
        {uploadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Upload Error</p>
              <p className="text-red-700 text-sm mt-1">{uploadError}</p>
            </div>
          </div>
        )}

        {uploadMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 font-medium">{uploadMessage}</p>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your documents here</h3>
          <p className="text-gray-600 mb-4">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Choose Files
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Supported formats: PDF, DOC, DOCX (Max 50MB per file, {MAX_FILES - files.length} slot{MAX_FILES - files.length !== 1 ? 's' : ''} available)
          </p>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {completedCount} completed {errorCount > 0 && `• ${errorCount} failed`}
                  </p>
                </div>
                {files.some(f => f.status === 'pending' || f.status === 'uploading') && (
                  <button
                    onClick={uploadFiles}
                    disabled={files.every(f => f.status === 'completed' || f.status === 'uploading')}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload All
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {files.map((uploadFile) => (
                <div key={uploadFile.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getFileIcon(uploadFile.file)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-gray-900 truncate">{uploadFile.file.name}</p>
                        {uploadFile.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        {uploadFile.status === 'uploading' && (
                          <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-sm text-gray-600">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {uploadFile.error && (
                          <p className="text-sm text-red-600">{uploadFile.error}</p>
                        )}
                      </div>

                      {(uploadFile.status === 'uploading' || uploadFile.progress > 0) && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadFile.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {uploadFile.status !== 'uploading' && (
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove file"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Fast Processing', description: 'Get similarity scores in minutes' },
            { title: 'Secure Upload', description: 'Bank-level encryption for your files' },
            { title: 'Detailed Reports', description: 'Comprehensive plagiarism analysis' },
          ].map((item) => (
            <div key={item.title} className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
