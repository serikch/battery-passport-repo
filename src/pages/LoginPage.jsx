import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Battery, Wrench, Building2, Recycle, Lock, User, ArrowRight, Sparkles, CheckCircle
} from 'lucide-react';
import { useAuthStore } from '../store';

// Credentials préremplis pour le PoC
const DEMO_CREDENTIALS = {
  garagiste: { username: 'garage.martin', password: 'demo123' },
  proprietaire: { username: 'bp.owner', password: 'demo123' },
  'centre-tri': { username: 'eco.recycle', password: 'demo123' }
};

const ROLES = [
  {
    id: 'garagiste',
    name: 'Garagiste',
    icon: Wrench,
    description: 'Diagnostic & Signalement',
    gradient: 'from-blue-500 to-cyan-400',
    path: '/garagiste'
  },
  {
    id: 'proprietaire',
    name: 'Propriétaire BP',
    icon: Building2,
    description: 'Gestion des statuts',
    gradient: 'from-purple-500 to-pink-400',
    path: '/proprietaire'
  },
  {
    id: 'centre-tri',
    name: 'Centre de Tri',
    icon: Recycle,
    description: 'Décision & Recyclage',
    gradient: 'from-green-500 to-emerald-400',
    path: '/centre-tri'
  }
];

const styles = {
  glassCard: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl",
  glassInput: "w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all",
  primaryButton: "px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2",
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    const creds = DEMO_CREDENTIALS[role.id];
    setUsername(creds.username);
    setPassword(creds.password);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    login(selectedRole.id, username);
    setIsLoading(false);
    navigate(selectedRole.path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Battery className="w-12 h-12 text-cyan-400" />
              <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Battery Passport
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Digital Battery Lifecycle Management System
          </p>
        </div>

        {/* Main Card */}
        <div className={`${styles.glassCard} p-8`}>
          <h2 className="text-xl font-semibold mb-6 text-center">
            Sélectionnez votre rôle
          </h2>

          {/* Role Selection */}
          <div className="space-y-3 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className={`w-full p-4 rounded-xl border transition-all duration-300 text-left ${
                  selectedRole?.id === role.id
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${role.gradient}`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{role.name}</h3>
                    <p className="text-sm text-gray-400">{role.description}</p>
                  </div>
                  {selectedRole?.id === role.id && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Login Form */}
          {selectedRole && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />
              
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`${styles.glassInput} pl-12`}
                  placeholder="Nom d'utilisateur"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.glassInput} pl-12`}
                  placeholder="Mot de passe"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`${styles.primaryButton} w-full py-4 text-base disabled:opacity-50`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Mode démo - Credentials préremplis
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Hackathon ESILV x Capgemini Engineering - Battery Passport PoC
        </p>
      </div>
    </div>
  );
};

export default LoginPage;