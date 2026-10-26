"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [agende, setAgende] = useState<any[]>([]);
  const [coda, setCoda] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [matchAudit, setMatchAudit] = useState<any>(null); // Nuovo stato per il Log Crittografico
  const [loading, setLoading] = useState<boolean>(true);

  const caricaDati = async (reset = false) => {
    try {
      const url = reset ? "/api/webhook?reset=1" : "/api/webhook";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.agende) setAgende(data.agende);
      if (data.coda) setCoda(data.coda);
      if (reset) {
          setStatusMsg("Database ripristinato con i dati demo iniziali!");
          setMatchAudit(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const eseguiMatch = async () => {
    setStatusMsg("Elaborazione Algoritmo DYCUS in corso...");
    setMatchAudit(null);
    try {
      const res = await fetch("/api/match", { cache: "no-store" });
      const data = await res.json();
      
      if (data.dettagli) {
        setStatusMsg(`Match Assegnato! Paziente: ${data.dettagli.paziente} (Tel: ${data.dettagli.telefono})`);
        if (data.dettagli.metriche_govtech) {
            // Salviamo il certificato crittografico e lo score per mostrarlo in UI
            setMatchAudit(data.dettagli.metriche_govtech);
        }
      } else {
        setStatusMsg(data.message || "Controllo completato. Nessun match possibile.");
      }
      await caricaDati();
    } catch {
      setStatusMsg("Errore durante l'esecuzione del match.");
    }
  };

  useEffect(() => {
    caricaDati();
    const timer = setInterval(() => caricaDati(), 3000);
    return () => clearInterval(timer);
  }, []);

  const slotLiberi = agende.filter((a) => a.stato_slot === "libero").length;
  const slotInAttesa = agende.filter((a) => a.stato_slot === "in_attesa_conferma").length;
  const slotRecuperati = agende.filter((a) => a.stato_slot === "occupato").length;
  const valoreGenerato = slotRecuperati * 45;

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-blue-400">Reverse-CUP</h1>
            <p className="text-xs text-slate-400 mt-1">Direzione Sanitaria ASL</p>
          </div>
          <nav className="space-y-2">
            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md">
              Dashboard Yield & Audit
            </div>
            <Link
              href="/paziente"
              target="_blank"
              className="block text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
            >
              📱 Apri Simulatore Paziente
            </Link>
          </nav>
        </div>
        <div className="text-xs text-slate-500 border-t border-slate-800 pt-4">
          Motore DYCUS + SHA-256 Attivo
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Monitoraggio Rese e Assegnazioni
            </h2>
            <p className="text-sm text-slate-500">
              Motore Predittivo Black-Box e Registro Crittografico Incorruttibile.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={eseguiMatch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer flex items-center gap-2"
            >
              ⚡ Innesca Algoritmo DYCUS
            </button>
            <button
              onClick={() => caricaDati(true)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              🔄 Reset Dati Demo
            </button>
          </div>
        </div>

        {/* Notifica di sistema */}
        {statusMsg && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-sm font-medium flex justify-between items-center shadow-sm">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg("")} className="text-xs underline ml-4 hover:text-blue-700">
              Chiudi
            </button>
          </div>
        )}

        {/* AUDIT CRITTOGRAFICO (Mostrato solo quando c'è un match) */}
        {matchAudit && (
          <div className="mb-8 bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden font-mono text-sm">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                🔒 LOG ASSEGNAZIONE INCORRUTTIBILE
              </span>
              <span className="text-xs text-slate-500">Zero-Trust Architecture</span>
            </div>
            <div className="p-5 text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <span className="text-slate-500 text-xs block mb-1">CERTIFICATO (HASH SHA-256)</span>
                <span className="text-amber-400 font-bold tracking-widest break-all">
                  {matchAudit.certificato_hash_sha256}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block mb-1">SCORE YIELD (DYCUS)</span>
                <span className="text-white font-bold text-lg">{matchAudit.dycus_score} pts</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block mb-1">MOTIVAZIONE CLINICO-PREDITTIVA</span>
                <span className="text-blue-300">{matchAudit.motivazione_pubblica}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block mb-1">PROBABILITÀ CONVERSIONE STIMATA</span>
                <span className="text-emerald-400">{matchAudit.probabilita_conversione}</span>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Slot Liberi / A Rischio</p>
            <p className="text-4xl font-bold text-red-600 mt-2">{slotLiberi}</p>
            <p className="text-xs text-slate-500 mt-1">
              In attesa conferma: <strong>{slotInAttesa}</strong>
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Slot Recuperati</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">{slotRecuperati}</p>
            <p className="text-xs text-slate-500 mt-1">Tramite matching automatico</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Valore Generato (SSN)</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">€ {valoreGenerato}</p>
            <p className="text-xs text-slate-500 mt-1">Stima recupero costi</p>
          </div>
        </div>

        {/* Tabella Live Matching Agende */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Live Matching Agende (Prossime 48h)</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
              ● Live Sync
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Data e Ora</th>
                <th className="p-4">Prestazione</th>
                <th className="p-4">Struttura</th>
                <th className="p-4">Stato Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">Caricamento dati dal database...</td>
                </tr>
              ) : (
                agende.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">
                      {new Date(item.data_ora).toLocaleString("it-IT", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">{item.prestazione}</td>
                    <td className="p-4 text-slate-600">{item.ospedale}</td>
                    <td className="p-4">
                      {item.stato_slot === "libero" && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Libero (Da Assegnare)</span>}
                      {item.stato_slot === "in_attesa_conferma" && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⏳ In Attesa Conferma SMS</span>}
                      {item.stato_slot === "occupato" && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Occupato / Recuperato</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}