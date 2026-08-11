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
      case 'SALONERO': return { label: 'Salonero', icon: User, color: 'text-[#5d402b] bg-[#5d402b]/10 border-[#5d402b]/30' };
      case 'COCINA': return { label: 'Cocina KDS', icon: ChefHat, color: 'text-[#735036] bg-[#735036]/10 border-[#735036]/30' };
      case 'CAJERO': return { label: 'Cajero', icon: CreditCard, color: 'text-[#3e2718] bg-[#3e2718]/10 border-[#3e2718]/30' };
      case 'ADMINISTRADOR': return { label: 'Administrador', icon: ShieldCheck, color: 'text-[#46593a] bg-[#46593a]/10 border-[#46593a]/30' };
      default: return { label: roleId, icon: User, color: 'text-[#6e5a4b]' };
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe6] text-[#231710] flex flex-col items-center justify-center p-4 selection:bg-[#5d402b] selection:text-[#fffdf9]">
      <div className="glass-panel border border-[#dac8b3] bg-[#faf6ee] w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="bg-[#5d402b] w-16 h-16 rounded-2xl shadow-xl border border-[#8c6544] text-[#fffdf9] font-black text-3xl flex items-center justify-center mx-auto transform hover:scale-105 transition-transform">
            🍷
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-[#231710] tracking-tight">
            La Vid Steak House & Pizza
          </h1>
          <p className="text-xs text-[#6e5a4b]">Selecciona tu usuario e ingresa tu código PIN de 4 dígitos</p>
        </div>

        {/* User Selection List */}
        <div>
          <label className="text-[11px] font-bold text-[#6e5a4b] uppercase tracking-wider block mb-2 text-center font-mono">
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
                      ? 'bg-[#5d402b] border-[#3e2718] text-[#fffdf9] shadow-md ring-2 ring-[#5d402b]/40 font-bold' 
                      : 'bg-[#fffdf9] border-[#dac8b3] text-[#6e5a4b] hover:bg-[#f5efe6]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSel ? 'text-[#fffdf9]' : 'text-[#5d402b]'}`} />
                  <span className="truncate w-full text-center">{u.name}</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${isSel ? 'bg-[#3e2718] text-[#f7f2e9] border-[#68472e]' : badge.color}`}>
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
            <label className="text-[11px] font-bold text-[#6e5a4b] uppercase tracking-wider block mb-1.5 text-center font-mono">
              2. Código PIN de 4 Dígitos
            </label>
            <div className="bg-[#fffdf9] border border-[#dac8b3] rounded-2xl py-3 px-4 flex items-center justify-center gap-3 shadow-inner">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    pinInput.length > idx 
                      ? 'bg-[#5d402b] shadow-md scale-110' 
                      : 'bg-[#e5ded4] border border-[#dac8b3]'
                  }`}
                />
              ))}
            </div>
            {selectedUser && (
              <p className="text-[10px] text-[#6e5a4b] text-center mt-1 font-mono">
                PIN para {selectedUser.name}: <strong className="text-[#5d402b]">{selectedUser.pin}</strong>
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
                className="bg-[#fffdf9] hover:bg-[#f5efe6] active:bg-[#e2d7c5] text-[#231710] font-mono font-bold text-lg py-3 rounded-2xl border border-[#dac8b3] transition-all active:scale-95 shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="bg-[#faf6ee] hover:bg-rose-100 text-[#802319] font-bold text-xs py-3 rounded-2xl border border-[#dac8b3] transition-all"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="bg-[#fffdf9] hover:bg-[#f5efe6] text-[#231710] font-mono font-bold text-lg py-3 rounded-2xl border border-[#dac8b3] transition-all"
            >
              0
            </button>
            <button
              type="submit"
              disabled={pinInput.length < 4 || isSubmitting}
              className="bg-[#5d402b] hover:bg-[#483120] text-[#fffdf9] font-extrabold text-xs py-3 rounded-2xl shadow-lg disabled:opacity-50 transition-all border border-[#3e2718]"
            >
              Ingresar
            </button>
          </div>

          {errorMsg && (
            <div className="bg-[#802319]/15 border border-[#802319]/40 p-3 rounded-xl text-xs text-[#802319] font-bold text-center">
              {errorMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
