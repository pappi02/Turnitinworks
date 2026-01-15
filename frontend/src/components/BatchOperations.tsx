import { useState } from 'react';
import { CheckCircle2, Download, Trash2, Share2, AlertCircle, Loader } from 'lucide-react';

interface BatchOperation {
  id: string;
  operation: 'delete' | 'export' | 'share';
  selectedCount: number;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  message?: string;
}

interface BatchOperationsProps {
  selectedCount: number;
  onSelectAll: (select: boolean) => void;
  onBatchDelete: () => Promise<void>;
  onBatchExport: (format: 'pdf' | 'csv') => Promise<void>;
  onBatchShare: () => Promise<void>;
}

export default function BatchOperations({
  selectedCount,
  onSelectAll,
  onBatchDelete,
  onBatchExport,
  onBatchShare,
}: BatchOperationsProps) {
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [showConfirm, setShowConfirm] = useState<'delete' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const addOperation = (op: Omit<BatchOperation, 'id' | 'progress'>) => {
    const id = `op-${Date.now()}`;
    setOperations(prev => [...prev, { ...op, id, progress: 0 }]);
    return id;
  };

  const updateOperation = (id: string, updates: Partial<BatchOperation>) => {
    setOperations(prev =>
      prev.map(op => (op.id === id ? { ...op, ...updates } : op))
    );
  };

  const removeOperation = (id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const handleDelete = async () => {
    const opId = addOperation({
      operation: 'delete',
      selectedCount,
      status: 'in-progress',
      message: `Deleting ${selectedCount} item${selectedCount !== 1 ? 's' : ''}...`,
    });

    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        updateOperation(opId, { progress: i });
      }

      await onBatchDelete();
      updateOperation(opId, {
        status: 'completed',
        progress: 100,
        message: `Successfully deleted ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`,
      });

      setShowConfirm(null);
      setTimeout(() => removeOperation(opId), 5000);
    } catch (error) {
      updateOperation(opId, {
        status: 'error',
        message: 'Failed to delete items. Please try again.',
      });
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    const opId = addOperation({
      operation: 'export',
      selectedCount,
      status: 'in-progress',
      message: `Exporting ${selectedCount} item${selectedCount !== 1 ? 's' : ''} as ${format.toUpperCase()}...`,
    });

    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 400));
        updateOperation(opId, { progress: i });
      }

      await onBatchExport(format);
      updateOperation(opId, {
        status: 'completed',
        progress: 100,
        message: `Successfully exported ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`,
      });

      setShowExportMenu(false);
      setTimeout(() => removeOperation(opId), 5000);
    } catch (error) {
      updateOperation(opId, {
        status: 'error',
        message: 'Failed to export. Please try again.',
      });
    }
  };

  const handleShare = async () => {
    const opId = addOperation({
      operation: 'share',
      selectedCount,
      status: 'in-progress',
      message: `Preparing to share ${selectedCount} item${selectedCount !== 1 ? 's' : ''}...`,
    });

    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 25) {
        await new Promise(resolve => setTimeout(resolve, 300));
        updateOperation(opId, { progress: i });
      }

      await onBatchShare();
      updateOperation(opId, {
        status: 'completed',
        progress: 100,
        message: `Share links generated for ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`,
      });

      setTimeout(() => removeOperation(opId), 5000);
    } catch (error) {
      updateOperation(opId, {
        status: 'error',
        message: 'Failed to generate share links. Please try again.',
      });
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="space-y-4">
      {/* Batch Action Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</p>
              <p className="text-sm text-gray-600">Choose an action below</p>
            </div>
          </div>
          <button
            onClick={() => onSelectAll(false)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Export Button */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          {showExportMenu && (
            <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-medium first:rounded-t-lg border-b border-gray-200"
              >
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-medium last:rounded-b-lg"
              >
                Export as CSV
              </button>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>

        {/* Delete Button */}
        <div className="relative">
          <button
            onClick={() => setShowConfirm('delete')}
            className="w-full px-4 py-3 border border-red-300 bg-red-50 rounded-lg text-red-600 font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>

          {/* Delete Confirmation */}
          {showConfirm === 'delete' && (
            <div className="absolute top-full mt-2 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
              <p className="font-semibold text-gray-900 mb-3">Delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}?</p>
              <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Toggle */}
      {operations.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {showHistory ? 'Hide' : 'Show'} operation history ({operations.length})
        </button>
      )}

      {/* Operation History */}
      {showHistory && operations.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          {operations.map(op => (
            <div key={op.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {op.status === 'in-progress' && (
                    <Loader className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                  )}
                  {op.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                  {op.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{op.operation.toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{op.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeOperation(op.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ×
                </button>
              </div>

              {(op.status === 'in-progress' || op.progress > 0) && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${op.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
