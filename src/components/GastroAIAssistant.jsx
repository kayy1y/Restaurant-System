import React from 'react';
import { 
  Sparkles, Send, Bot, AlertTriangle, TrendingUp, ShieldCheck, 
  HelpCircle, Lightbulb, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { RAW_INGREDIENTS, PRODUCTS, RESTAURANT_INFO } from '../data/mockData';

export default function GastroAIAssistant({ orders, rawIngredients, currentRole }) {
  const [query, setQuery] = React.useState('');
  const [messages, setMessages] = React.useState([
    {
      id: '1',
      sender: 'ai',
      text: '¡Hola! Soy GastroAI Engine 🤖, tu asistente inteligente de gestión gastronómica. Puedo predecir agotamiento de insumos, sugerir sustitutos en recetas, detectar anomalías de caja y responder consultas financieras.',
      confidence: 99,
      dataUsed: 'Estado de recetas, inventario y ventas en vivo',
      actionProposed: 'Revisar sugerencias de reabastecimiento'
    }
  ]);

  // Generate automated AI Insights
  const lowStockIngs = rawIngredients.filter(i => i.stock <= i.minStock);

  const handleSendQuery = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);

    const qLower = query.toLowerCase();
    let aiResponse = "";
    let confidence = 95;
    let dataUsed = "Inventario y ventas en tiempo real";
    let action = "Consultar reporte";

    if (qLower.includes('agotad') || qLower.includes('insumo') || qLower.includes('stock')) {
      aiResponse = `Actualmente tienes ${lowStockIngs.length} insumos en nivel crítico: ${lowStockIngs.map(i => i.name).join(', ')}. Te sugiero emitir una orden de compra para mantener la operación del turno de la noche.`;
      action = "Emitir orden de compra recomendada";
    } else if (qLower.includes('vender') || qLower.includes('popular') || qLower.includes('mejor')) {
      aiResponse = `El producto estrella del día es la "Hamburguesa Gourmet Escalante" con un margen del 62%. El segundo lugar lo ocupa el "Mojito Centenario de la Casa".`;
      action = "Promocionar combos sugeridos";
    } else if (qLower.includes('iva') || qLower.includes('hacienda') || qLower.includes('factura')) {
      aiResponse = `La capa fiscal Costa Rica v4.3 se encuentra 100% activa. Todas las facturas generadas tienen su Clave Numérica de 50 dígitos y código QR de verificación listos.`;
      action = "Verificar firmas XML v4.3";
    } else {
      aiResponse = `Entendido. He analizado la base de datos de ${RESTAURANT_INFO.name}. Con base en los pedidos del día, la proyección de facturación para el cierre de caja es altamente favorable. ¿Deseas ajustar recetas o consultar rendimiento de saloneros?`;
    }

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiResponse,
          confidence,
          dataUsed,
          actionProposed: action
        }
      ]);
    }, 600);

    setQuery('');
  };

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-rose-500 p-2.5 rounded-xl shadow-lg shadow-amber-500/20 text-slate-950">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
              GastroAI Assistant
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                IA Activa
              </span>
            </h2>
            <p className="text-xs text-slate-400">Inteligencia artificial adaptativa para optimizar recetas, compras e ingresos</p>
          </div>
        </div>
      </div>

      {/* AI Quick Insights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>Alerta de Desabastecimiento</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-300">
            {lowStockIngs.length > 0 
              ? `${lowStockIngs.length} ingrediente(s) requieren reposición (ej. ${lowStockIngs[0]?.name}).`
              : 'Niveles de stock óptimos para el turno.'}
          </p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
            <span>Predicción de Ventas</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-300">
            Se proyecta un incremento del 24% en demanda de coctelería para el horario nocturno (19:00 - 22:00).
          </p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-bold">
            <span>Auditoría de Anomalías</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-300">
            No se detectan anulaciones ni descuentos sospechosos en el turno actual. Operación 100% íntegra.
          </p>
        </div>
      </div>

      {/* Interactive Chat Console */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[480px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {msg.sender === 'ai' && msg.confidence && (
                  <div className="pt-2 border-t border-slate-800/80 text-[10px] space-y-1 text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Confianza IA:</span>
                      <strong className="text-emerald-400">{msg.confidence}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Datos Utilizados:</span>
                      <span className="text-slate-300">{msg.dataUsed}</span>
                    </div>
                    {msg.actionProposed && (
                      <div className="mt-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 p-2 rounded-lg font-sans font-bold">
                        Acción Propuesta: {msg.actionProposed}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendQuery} className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder="Haz una pregunta a GastroAI (ej. ¿Qué insumos se van a agotar hoy?)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Consultar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
