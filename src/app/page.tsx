import { sql } from '@/lib/db';

export default async function Dashboard() {
  // --- FETCH DATI DAL DATABASE NEON ---
  // ...
  
  // 1. Dati per la tabella Live Matching
  const agende = await sql`
    SELECT id, data_ora, prestazione, ospedale, stato_slot 
    FROM agende 
    ORDER BY data_ora ASC 
    LIMIT 10
  `;

  // 2. Calcolo KPI
  // Slot recuperati: contiamo quelli passati allo stato 'occupato'
  const recuperatiQuery = await sql`SELECT count(*) FROM agende WHERE stato_slot = 'occupato'`;
  const slotRecuperati = parseInt(recuperatiQuery[0].count, 10);
  
  // Slot sprecati: slot rimasti 'liberi' ma con data passata
  const sprecatiQuery = await sql`SELECT count(*) FROM agende WHERE stato_slot = 'libero' AND data_ora < NOW()`;
  const slotSprecati = parseInt(sprecatiQuery[0].count, 10);

  // Valore generato (Valorizzazione media SSN: 45€ a visita)
  const valoreGenerato = slotRecuperati * 45;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* SIDEBAR LATERALE */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 bg-slate-950">
          <h1 className="text-xl font-bold text-white tracking-wide">Reverse<span className="text-blue-500">-CUP</span></h1>
          <p className="text-xs text-slate-400 mt-1">Direzione Sanitaria ASL</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="block px-4 py-3 bg-blue-600 text-white rounded-md font-medium shadow">
            Dashboard
          </a>
          <a href="#" className="block px-4 py-3 hover:bg-slate-800 rounded-md transition-colors">
            Analitiche
          </a>
          <a href="#" className="block px-4 py-3 hover:bg-slate-800 rounded-md transition-colors">
            Impostazioni
          </a>
        </nav>
        <div className="p-4 text-xs text-slate-500 border-t border-slate-800">
          Reverse-CUP MVP v1.0
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800">Monitoraggio Rese (Yield Management)</h2>
          <p className="text-slate-500 text-sm mt-1">Panoramica in tempo reale sull'ottimizzazione delle liste d'attesa.</p>
        </header>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Slot Sprecati</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{slotSprecati}</p>
            <p className="text-xs text-slate-400 mt-1">Nelle ultime 48h</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Slot Recuperati</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{slotRecuperati}</p>
            <p className="text-xs text-slate-400 mt-1">Tramite matching SMS</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Valore Generato</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-2">€ {valoreGenerato.toLocaleString('it-IT')}</p>
            <p className="text-xs text-slate-400 mt-1">Basato su media rimborsi SSN (45€)</p>
          </div>
        </div>

        {/* TABELLA LIVE MATCHING */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-medium text-slate-800">Live Matching Agende</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Data e Ora</th>
                  <th className="px-6 py-3 font-medium">Prestazione</th>
                  <th className="px-6 py-3 font-medium">Struttura</th>
                  <th className="px-6 py-3 font-medium">Stato Slot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {agende.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                      Nessun dato presente in agenda.
                    </td>
                  </tr>
                ) : (
                  agende.map((slot: any) => (
                    <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {new Date(slot.data_ora).toLocaleString('it-IT', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium">{slot.prestazione}</td>
                      <td className="px-6 py-4">{slot.ospedale}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium 
                          ${slot.stato_slot === 'libero' ? 'bg-slate-100 text-slate-600' : ''}
                          ${slot.stato_slot === 'in_attesa_conferma' ? 'bg-amber-100 text-amber-700 animate-pulse' : ''}
                          ${slot.stato_slot === 'occupato' ? 'bg-emerald-100 text-emerald-700' : ''}
                        `}>
                          {slot.stato_slot.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </main>
    </div>
  );
}