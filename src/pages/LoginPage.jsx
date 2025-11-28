import React, { useState } from 'react';
import { 
  Wrench, Building2, Recycle, Lock, User, ArrowRight, CheckCircle, RefreshCw
} from 'lucide-react';

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
    color: 'from-blue-600 to-blue-500'
  },
  {
    id: 'proprietaire',
    name: 'Propriétaire BP',
    icon: Building2,
    description: 'Gestion des statuts',
    color: 'from-slate-700 to-slate-600'
  },
  {
    id: 'centre-tri',
    name: 'Centre de Tri',
    icon: Recycle,
    description: 'Décision & Recyclage',
    color: 'from-emerald-600 to-emerald-500'
  }
];

const LoginPage = ({ onLogin }) => {
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
    
    onLogin(selectedRole.id, username);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Fond subtil avec motif géométrique */}
      <div className="absolute inset-0 z-0">
        {/* Cercles décoratifs subtils */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-200 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />
        
        {/* Grille subtile */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #334155 1px, transparent 1px),
              linear-gradient(to bottom, #334155 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header avec Logo */}
        <div className="text-center mb-8">
          {/* Logo de l'équipe */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo-equipe73.png" 
              alt="Équipe 73 - Battery Passport"
              className="h-28 w-auto object-contain drop-shadow-md"
            />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Battery Passport
          </h1>
          <p className="text-slate-500 text-sm">
            Team 73
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
          <h2 className="text-lg font-semibold mb-6 text-center text-slate-700">
            Sélectionnez votre rôle
          </h2>

          {/* Role Selection */}
          <div className="space-y-3 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedRole?.id === role.id
                    ? 'border-blue-500 bg-blue-50/50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${role.color} shadow-lg`}>
                    <role.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{role.name}</h3>
                    <p className="text-sm text-slate-500">{role.description}</p>
                  </div>
                  {selectedRole?.id === role.id && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
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
              <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-6" />
              
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Nom d'utilisateur"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Mot de passe"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-400 mt-4">
                Mode démo • Credentials préremplis
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-slate-500">
            Hackathon ESILV × Capgemini Engineering
          </p>
          <p className="text-xs text-slate-400">
            Règlement UE 2023/1542 • Battery Passport PoC
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;