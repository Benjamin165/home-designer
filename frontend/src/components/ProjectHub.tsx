import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { projectsApi, ApiError } from '../lib/api';

interface Project {
  id: number;
  name: string;
  description?: string;
  thumbnail_path?: string;
  created_at: string;
  updated_at: string;
}

function ProjectHub() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Refs to prevent double-submission (faster than state updates)
  const isSubmittingRef = useRef(false);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getAll();
      setProjects(data.projects || []);
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        // Use the user-friendly message from ApiError
        setError(err.userMessage);
      } else {
        // Fallback for unexpected errors
        setError('Unable to load projects. Please try again.');
      }
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadProjects();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submission using ref (faster than state)
    if (isSubmittingRef.current) {
      console.log('Submission already in progress, ignoring duplicate click');
      return;
    }

    if (!newProjectName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    if (newProjectName.length > 255) {
      setCreateError('Project name must be 255 characters or less');
      return;
    }

    try {
      // Mark submission as in progress immediately
      isSubmittingRef.current = true;
      setCreateLoading(true);
      setCreateError(null);

      const createdProject = await projectsApi.create({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });

      // Show success toast
      toast.success('Project created successfully', {
        description: `"${newProjectName.trim()}" is ready to edit`,
      });

      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateModal(false);

      // Reload projects
      await loadProjects();
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        setCreateError(err.userMessage);
      } else {
        setCreateError('Failed to create project. Please try again.');
      }
      console.error('Error creating project:', err);
    } finally {
      setCreateLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDescription('');
    setCreateError(null);
    isSubmittingRef.current = false; // Reset ref in case of any stuck state
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
    setDeleteError(null);
    isDeletingRef.current = false; // Reset ref in case of any stuck state
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    // Prevent double-deletion using ref (faster than state)
    if (isDeletingRef.current) {
      console.log('Delete already in progress, ignoring duplicate click');
      return;
    }

    try {
      // Mark deletion as in progress immediately
      isDeletingRef.current = true;
      setDeleteLoading(true);
      setDeleteError(null);
      await projectsApi.delete(projectToDelete.id);

      // Remove from local state
      setProjects(projects.filter(p => p.id !== projectToDelete.id));

      // Close modal
      setShowDeleteModal(false);
      setProjectToDelete(null);
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        setDeleteError(err.userMessage);
      } else {
        setDeleteError('Failed to delete project. It may have already been deleted.');
      }
      console.error('Error deleting project:', err);
    } finally {
      setDeleteLoading(false);
      isDeletingRef.current = false;
    }
  };

  const handleImportClick = () => {
    // Create a hidden file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        setImportLoading(true);
        setImportError(null);

        const data = await projectsApi.import(file);

        console.log('✓ Project imported:', data.project.name);

        // Show success toast
        toast.success('Project imported successfully', {
          description: `"${data.project.name}" has been added to your projects`,
        });

        // Reload projects to show the imported one
        await loadProjects();
      } catch (err) {
        if (err instanceof ApiError && err.userMessage) {
          setImportError(err.userMessage);
        } else {
          setImportError('Failed to import project. Please try again.');
        }
        console.error('Error importing project:', err);
      } finally {
        setImportLoading(false);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Home Designer</h1>
              <p className="text-sm text-gray-600 mt-1">Your Projects</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleImportClick}
                disabled={importLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Import Project from ZIP"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {importLoading ? 'Importing...' : 'Import Project'}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Project
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading projects...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto mt-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6" role="alert" aria-live="assertive">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Unable to Load Projects
                  </h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new project.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                New Project
              </button>
            </div>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden relative group"
              >
                <div
                  onClick={() => navigate(`/editor/${project.id}`)}
                  className="cursor-pointer"
                >
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {project.thumbnail_path ? (
                      <img
                        src={project.thumbnail_path}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="h-16 w-16 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Delete button - appears on hover */}
                <button
                  onClick={(e) => handleDeleteClick(project, e)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Delete ${project.name}`}
                  title="Delete project"
                >
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Project</h2>

            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Living Room Redesign"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe your project..."
                />
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="assertive">
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Project</h2>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>"{projectToDelete.name}"</strong>?
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="assertive">
                <p className="text-sm text-red-600">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectHub;
