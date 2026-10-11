import { useAuth } from './AuthContext';
import { logout } from './auth';
import { AuthWrapper } from './AuthWrapper';
import { LogOut, User, LayoutDashboard, BookOpen, Users, Settings } from 'lucide-react';

export const FirebaseApp = () => {
  const { user, logout: authLogout } = useAuth();

  const handleLogout = async () => {
    await authLogout();
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Research Room</span>
              </div>
              <nav className="flex items-center gap-4">
                <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors">
                  <LayoutDashboard className="w-5 h-5" />
                </button>
                <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors">
                  <BookOpen className="w-5 h-5" />
                </button>
                <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors">
                  <Users className="w-5 h-5" />
                </button>
                <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {user?.displayName || user?.email || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Research Room
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Your collaborative research workspace powered by Firebase. 
              Create workspaces, collaborate with your team, and manage your research projects.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <LayoutDashboard className="w-10 h-10 text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workspaces</h3>
                <p className="text-gray-600 dark:text-gray-400">Create and manage research workspaces for your projects.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <BookOpen className="w-10 h-10 text-green-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Documents</h3>
                <p className="text-gray-600 dark:text-gray-400">Write and collaborate on research documents in real-time.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <Users className="w-10 h-10 text-purple-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Team</h3>
                <p className="text-gray-600 dark:text-gray-400">Invite team members and collaborate seamlessly.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthWrapper>
  );
};