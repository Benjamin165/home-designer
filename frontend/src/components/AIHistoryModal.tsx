import { useState, useEffect } from 'react';
import { 
  X, History, Loader2, Trash2, CheckCircle2, 
  XCircle, Clock, Image, Camera, Link, RefreshCw
} from 'lucide-react';
import { aiApi } from '../lib/api';
import { toast } from 'sonner';

interface AIHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Generation {
  id: number;
  type: string;
  status: string;
  input_image_path?: string;
  input_url?: string;
  output_model_path?: string;
  error_message?: string;
  parameters?: any;
  created_at: string;
}

type FilterType = 'all' | 'photo_to_furniture' | 'photo_to_room' | 'url_import';
type FilterStatus = 'all' | 'completed' | 'failed' | 'processing';

export default function AIHistoryModal({ isOpen, onClose }: AIHistoryModalProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const fetchGenerations = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: pageSize,
        offset: page * pageSize,
      };
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;

      const result = await aiApi.getGenerations(params);
      setGenerations(result.generations);
      setTotal(result.total);
    } catch (error) {
      console.error('Error fetching generations:', error);
      toast.error('Failed to load generation history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGenerations();
    }
  }, [isOpen, page, filterType, filterStatus]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this generation record?')) {
      return;
    }

    try {
      await aiApi.deleteGeneration(id);
      toast.success('Generation deleted');
      fetchGenerations();
    } catch (error) {
      toast.error('Failed to delete generation');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo_to_furniture':
        return <Image className="w-4 h-4 text-blue-400" />;
      case 'photo_to_room':
        return <Camera className="w-4 h-4 text-purple-400" />;
      case 'url_import':
        return <Link className="w-4 h-4 text-green-400" />;
      default:
        return <History className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'photo_to_furniture':
        return 'Photo → Furniture';
      case 'photo_to_room':
        return 'Photo → Room';
      case 'url_import':
        return 'URL Import';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded">
            <Clock className="w-3 h-3" />
            Processing
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            AI Generation History
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-4 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Type:</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setPage(0);
              }}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="photo_to_furniture">Photo → Furniture</option>
              <option value="photo_to_room">Photo → Room</option>
              <option value="url_import">URL Import</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setPage(0);
              }}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <button
            onClick={fetchGenerations}
            className="ml-auto p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History className="w-12 h-12 mb-4 opacity-50" />
              <p>No generation history found</p>
              <p className="text-sm mt-1">Generate models or import products to see them here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {generations.map((gen) => (
                <div key={gen.id} className="px-6 py-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Preview Image */}
                    <div className="w-16 h-16 bg-gray-700 rounded flex-shrink-0 overflow-hidden">
                      {gen.input_image_path ? (
                        <img
                          src={`http://localhost:5000${gen.input_image_path}`}
                          alt="Input"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getTypeIcon(gen.type)}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(gen.type)}
                        <span className="text-white font-medium">
                          {getTypeLabel(gen.type)}
                        </span>
                        {getStatusBadge(gen.status)}
                      </div>

                      <p className="text-gray-400 text-sm mb-1">
                        {formatDate(gen.created_at)}
                      </p>

                      {gen.input_url && (
                        <p className="text-gray-500 text-xs truncate">
                          URL: {gen.input_url}
                        </p>
                      )}

                      {gen.error_message && (
                        <p className="text-red-400 text-xs mt-1">
                          Error: {gen.error_message}
                        </p>
                      )}

                      {gen.parameters && gen.type === 'photo_to_room' && (
                        <div className="mt-2 text-xs text-gray-500">
                          Room: {gen.parameters.roomType} | 
                          Confidence: {Math.round((gen.parameters.confidence || 0) * 100)}%
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(gen.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between bg-gray-800/50">
            <p className="text-sm text-gray-400">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
