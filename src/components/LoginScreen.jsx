import React from 'react';
import { ChefHat, CreditCard, ShieldCheck, User } from 'lucide-react';
import { authenticateByPin, getAllUsers } from '../services/authService';
import { INITIAL_USERS } from '../services/db';

export default function LoginScreen({ onLoginSuccess }) {
  const [users, setUsers] = React.useState(INITIAL_USERS);
  const [selectedUser, setSelectedUser] = React.useState(INITIAL_USERS[0]);
  const [pinInput, setPinInput] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    getAllUsers().then(data => {
      if (data && data.length > 0) {
        setUsers(data);
        setSelectedUser(data[0]);
      }
    }).catch(err => console.error('Error cargando usuarios:', err));
  }, []);

  const handleKeypadPress = (digit) => {
    if (pinInput.length < 4) {
      setPinInput(prev => prev + digit);
    }
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (pinInput.length < 4) {
      setErrorMsg('El código PIN debe ser de 4 dígitos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await authenticateByPin(pinInput);
      setIsSubmitting(false);
      onLoginSuccess(session);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'PIN no válido para el usuario seleccionado.');
    }
  };

  const getRoleBadge = (roleId) => {
    switch (roleId) {
      case 'SALONERO': return { label: 'Salonero', icon: User, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'COCINA': return { label: 'Cocina KDS', icon: ChefHat, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'CAJERO': return { label: 'Cajero', icon: CreditCard, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'ADMINISTRADOR': return { label: 'Administrador', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      default: return { label: roleId, icon: User, color: 'text-slate-400' };
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="glass-panel border border-slate-700/80 w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-rose-600 w-16 h-16 rounded-2xl shadow-xl shadow-amber-500/20 text-slate-950 font-black text-3xl flex items-center justify-center mx-auto transform hover:scale-105 transition-transform">
            🍷
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-100 tracking-tight">
            GastroFlow OS
          </h1>
          <p className="text-xs text-slate-400">Selecciona tu usuario e ingresa tu código PIN de 4 dígitos</p>
        </div>

        {/* User Selection List */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            1. Seleccionar Empleado o Puesto
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {users.map(u => {
              const badge = getRoleBadge(u.role_id);
              const isSel = selectedUser?.id === u.id;
              const Icon = badge.icon;

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setPinInput('');
                    setErrorMsg('');
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${
                    isSel 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-2 ring-amber-500/30' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate w-full text-center">{u.name}</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${badge.color}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Input Display */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 text-center">
              2. Código PIN de 4 Dígitos
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 flex items-center justify-center gap-3">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    pinInput.length > idx 
                      ? 'bg-amber-400 shadow-md shadow-amber-400/40 scale-110' 
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              ))}
            </div>
            {selectedUser && (
              <p className="text-[10px] text-slate-500 text-center mt-1 font-mono">
                PIN para {selectedUser.name}: <strong className="text-amber-400">{selectedUser.pin}</strong>
              </p>
            )}
          </div>

          {/* Touch Keypad Grid */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-100 font-mono font-bold text-lg py-3 rounded-2xl border border-slate-800 transition-all active:scale-95 shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="bg-slate-900/60 hover:bg-rose-950/40 text-rose-400 font-bold text-xs py-3 rounded-2xl border border-slate-800 transition-all"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-100 font-mono font-bold text-lg py-3 rounded-2xl border border-slate-800 transition-all"
            >
              0
            </button>
            <button
              type="submit"
              disabled={pinInput.length < 4 || isSubmitting}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 rounded-2xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
            >
              Ingresar
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-bold text-center">
              {errorMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
