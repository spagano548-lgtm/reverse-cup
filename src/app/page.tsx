"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [agende, setAgende] = useState<any[]>([]);
  const [coda, setCoda] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const caricaDati = async (reset = false) => {
    try {
      const url = reset ? "/api/webhook?reset=1" : "/api/webhook";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.agende) setAgende(data.agende);
      if (data.coda) setCoda(data.coda);
      if (reset) setStatusMsg("Database ripristinato con i dati demo iniziali!");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const eseguiMatch = async () => {
    setStatusMsg("Scansione liste d'attesa in corso...");
    try {
      const res = await fetch("/api/match", { cache: "no-store" });
      const data = await res.json();
      if (data.dettagli) {
        setStatusMsg(`Match trovato! Paziente: ${data.dettagli.paziente} (Tel: ${data.dettagli.telefono})`);
      } else {
        setStatusMsg(data.message || "Controllo completato.");
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
            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
              Dashboard Yield
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
          Reverse-CUP MVP v1.0 <br /> Motore Auto-Sync Attivo
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Monitoraggio Rese (Yield Management)
            </h2>
            <p className="text-sm text-slate-500">
              Panoramica in tempo reale sull&apos;ottimizzazione delle liste d&apos;attesa.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={eseguiMatch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              ⚡ Forza Match Ora
            </button>
            <button
              onClick={() => caricaDati(true)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              🔄 Reset Dati Demo
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-sm font-medium flex justify-between items-center">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg("")} className="text-xs underline ml-4">
              Chiudi
            </button>
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
            <p className="text-xs font-semibold uppercase text-slate-400">Valore Generato</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">€ {valoreGenerato}</p>
            <p className="text-xs text-slate-500 mt-1">Basato su media rimborsi SSN (45€)</p>
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
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Caricamento dati dal database...
                  </td>
                </tr>
              ) : (
                agende.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">
                      {new Date(item.data_ora).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">{item.prestazione}</td>
                    <td className="p-4 text-slate-600">{item.ospedale}</td>
                    <td className="p-4">
                      {item.stato_slot === "libero" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Libero (Da Assegnare)
                        </span>
                      )}
                      {item.stato_slot === "in_attesa_conferma" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          ⏳ In Attesa Conferma SMS
                        </span>
                      )}
                      {item.stato_slot === "occupato" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          ✓ Occupato / Recuperato
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Coda Pazienti per facilitare il test sul Simulatore */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">
              Coda Ricette Pazienti (Numeri da usare nel Simulatore `/paziente`)
            </h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Paziente</th>
                <th className="p-4">Telefono (Copia per Test)</th>
                <th className="p-4">Prestazione Richiesta</th>
                <th className="p-4">Priorità</th>
                <th className="p-4">Stato Ricetta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {coda.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium">{r.nome}</td>
                  <td className="p-4 font-mono text-blue-600 font-semibold">{r.telefono}</td>
                  <td className="p-4">{r.prestazione}</td>
                  <td className="p-4">Classe {r.priorita_clinica}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        r.stato === "evasa"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.stato}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}