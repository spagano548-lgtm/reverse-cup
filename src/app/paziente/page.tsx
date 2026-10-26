"use client";

import { useState } from 'react';

export default function SimulatorePaziente() {
  const [telefono, setTelefono] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const [loading, setLoading] = useState(false);

  const inviaRisposta = async (risposta: 'SI' | 'NO') => {
    if (!telefono) {
      setMessaggio("Inserisci il tuo numero di telefono.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, risposta })
      });
      const data = await res.json();
      setMessaggio(data.message);
    } catch (error) {
      setMessaggio("Errore di connessione.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      {/* Schermo dello "Smartphone" */}
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border-8 border-slate-800 h-[600px] flex flex-col">
        
        {/* Header Smartphone */}
        <div className="bg-blue-600 p-4 text-white text-center shadow-md">
          <h1 className="font-semibold">Messaggi SSN</h1>
          <p className="text-xs opacity-80">Simulatore Notifiche</p>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-center">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm text-slate-700">
            <p className="mb-2"><strong>SSN Informa:</strong></p>
            <p>Se hai ricevuto una notifica di disponibilità, inserisci il tuo numero e rispondi per confermare o cedere il turno.</p>
          </div>

          <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
            Il tuo numero di telefono
          </label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Es. 3331234567"
            className="w-full p-3 border border-slate-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />

          <div className="flex gap-3 mt-auto">
            <button 
              onClick={() => inviaRisposta('NO')} 
              disabled={loading}
              className="flex-1 bg-white border-2 border-red-500 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              Rifiuta (NO)
            </button>
            <button 
              onClick={() => inviaRisposta('SI')} 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 shadow-md transition-all"
            >
              Conferma (SI)
            </button>
          </div>
        </div>

        {/* Area Feedback */}
        {messaggio && (
          <div className="p-4 bg-slate-900 text-white text-center text-sm font-medium animate-pulse">
            {messaggio}
          </div>
        )}
      </div>
    </div>
  );
}