import { useEditorStore, type HistoryAction } from '../store/editorStore';
import { History, Clock } from 'lucide-react';

export default function EditHistory() {
  const history = useEditorStore((state) => state.history);
  const historyIndex = useEditorStore((state) => state.historyIndex);

  if (history.length === 0) {
    return (
      <div className="h-full bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-200">Edit History</h3>
        </div>
        <div className="text-center text-gray-500 text-sm py-8">
          No actions yet. Your edits will appear here.
        </div>
      </div>
    );
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full bg-gray-800 border-t border-gray-700 flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <History className="w-5 h-5 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-200">Edit History</h3>
        <span className="ml-auto text-xs text-gray-500">{history.length} actions</span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2 p-4 min-w-max">
          {history.map((action, index) => {
            const isCurrent = index === historyIndex;
            const isFuture = index > historyIndex;

            return (
              <div
                key={action.id}
                className={`group relative flex-shrink-0 w-48 p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-blue-500/20 border-blue-500 shadow-lg'
                    : isFuture
                    ? 'bg-gray-700/50 border-gray-600 opacity-50'
                    : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                }`}
                title={`${action.description} - ${formatTime(action.timestamp)}`}
              >
                {/* Action number badge */}
                <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isCurrent
                    ? 'bg-blue-500 text-white'
                    : isFuture
                    ? 'bg-gray-600 text-gray-400'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {index + 1}
                </div>

                {/* Current indicator */}
                {isCurrent && (
                  <div className="absolute -top-3 right-2 text-xs text-blue-400 font-semibold">
                    Current
                  </div>
                )}

                {/* Action content */}
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${
                    isCurrent ? 'text-blue-400' : isFuture ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <History className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isCurrent ? 'text-blue-200' : isFuture ? 'text-gray-500' : 'text-gray-200'
                    }`}>
                      {action.description}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className={`w-3 h-3 ${
                        isCurrent ? 'text-blue-400' : isFuture ? 'text-gray-600' : 'text-gray-500'
                      }`} />
                      <p className={`text-xs ${
                        isCurrent ? 'text-blue-400' : isFuture ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {formatTime(action.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-gray-900 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg border border-gray-700">
                    {action.description}
                    <br />
                    <span className="text-gray-500">{formatTime(action.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
