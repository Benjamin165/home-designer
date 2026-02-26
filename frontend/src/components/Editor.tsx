import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, ApiError } from '../lib/api';

interface Project {
  id: number;
  name: string;
  description?: string;
  thumbnail_path?: string;
  created_at: string;
  updated_at: string;
}

function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getById(parseInt(projectId));
      setProject(data.project);
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        setError(err.userMessage);
      } else {
        setError('Failed to load project');
      }
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProjects = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-200 mb-2">Error Loading Project</h3>
            <p className="text-red-300">{error || 'Project not found'}</p>
            <button
              onClick={handleBackToProjects}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Editor Toolbar */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToProjects}
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to Projects"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-400">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors">
              Save
            </button>
          </div>
        </div>
      </header>

      {/* Editor Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v10h10v-3a1 1 0 112 0v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 3h6v6M10 14l9.5-9.5"
              />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-200 mb-2">3D Editor</h2>
          <p className="text-gray-400 max-w-md">
            The 3D editor view will be implemented here. This is where users will design their rooms and place furniture.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Editor;
