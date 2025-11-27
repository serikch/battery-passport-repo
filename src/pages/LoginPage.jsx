import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Battery, 
  Wrench, 
  Building2, 
  Recycle, 
  Lock, 
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

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

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Quand on sélectionne un rôle, préremplir les credentials
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    const creds = DEMO_CREDENTIALS[role.id];
    setUsername(creds.username);
    setPassword(creds.password);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      toast.error('Veuillez sélectionner un rôle');
      return;
    }

    setIsLoading(true);
    
    // Simulation d'un délai de connexion
    await new Promise(resolve => setTimeout(resolve, 800));
    
    login(selectedRole.id, username);
    toast.success(`Bienvenue, ${username}!`);
    setIsLoading(false);
    navigate(selectedRole.path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-500/30 to-cyan-500/30"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: [null, Math.random() * -200 - 100],
              opacity: [0.3, 0]
            }}
            transition={{ 
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <Battery className="w-12 h-12 text-cyan-400" />
              <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Battery Passport
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Digital Battery Lifecycle Management System
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          className="glass-card p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold mb-6 text-center">
            Sélectionnez votre rôle
          </h2>

          {/* Role Selection */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            {ROLES.map((role, index) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                onClick={() => handleRoleSelect(role)}
                className={`relative p-4 rounded-xl border transition-all duration-300 text-left group overflow-hidden ${
                  selectedRole?.id === role.id
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                {/* Gradient background on selection */}
                <div className={`absolute inset-0 bg-gradient-to-r ${role.gradient} opacity-0 transition-opacity duration-300 ${
                  selectedRole?.id === role.id ? 'opacity-10' : 'group-hover:opacity-5'
                }`} />
                
                <div className="relative flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${role.gradient} bg-opacity-20`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{role.name}</h3>
                    <p className="text-sm text-slate-400">{role.description}</p>
                  </div>
                  {selectedRole?.id === role.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Login Form */}
          <AnimatePresence mode="wait">
            {selectedRole && (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />
                
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="glass-input pl-12"
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
                      className="glass-input pl-12"
                      placeholder="Mot de passe"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-button primary w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="spinner w-5 h-5" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Mode démo - Credentials préremplis
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-slate-500 mt-6"
        >
          Hackathon ESILV x Capgemini Engineering - Battery Passport PoC
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoginPage;