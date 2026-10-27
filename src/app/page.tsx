"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NORMATIVA_RAO: Record<
  number,
  { codice: string; nome: string; tempoMax: string; colore: string; descrizioneLegge: string }
> = {
  1: {
    codice: "U",
    nome: "Urgente",
    tempoMax: "Entro 72 ore",
    colore: "bg-red-100 text-red-800 border-red-300",
    descrizioneLegge: "Prestazione indifferibile in condizioni di particolare gravità clinica (PNGLA).",
  },
  2: {
    codice: "B",
    nome: "Breve",
    tempoMax: "Entro 10 giorni",
    colore: "bg-amber-100 text-amber-800 border-amber-300",
    descrizioneLegge: "Prestazione la cui tempestiva esecuzione condiziona la prognosi a breve (PNGLA).",
  },
  3: {
    codice: "D",
    nome: "Differibile",
    tempoMax: "Entro 30 gg (Visite) / 60 gg (Diagnostica)",
    colore: "bg-blue-100 text-blue-800 border-blue-300",
    descrizioneLegge: "Prestazione richiesta per dolore, disfunzione o disabilità non immediata (PNGLA).",
  },
  4: {
    codice: "P",
    nome: "Programmata",
    tempoMax: "Entro 120 giorni",
    colore: "bg-slate-100 text-slate-800 border-slate-300",
    descrizioneLegge: "Prestazione programmabile in arco di tempo maggiore (PNGLA).",
  },
};

export default function Dashboard() {
  const [agende, setAgende] = useState<any[]>([]);
  const [coda, setCoda] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [matchAudit, setMatchAudit] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Stati per la gestione della Modale Dettaglio Paziente
  const [pazienteSelezionato, setPazienteSelezionato] = useState<any>(null);

  // Stati per form nuova registrazione e import CSV
  const [mostraFormReg, setMostraFormReg] = useState<boolean>(false);
  const [mostraImportCSV, setMostraImportCSV] = useState<boolean>(false);
  const [csvTesto, setCsvTesto] = useState<string>(
    "Elena Greco,3337788990,Risonanza Magnetica,1\nMarco Conti,3331122334,Visita Cardiologica,2\nSofia Marino,3336655443,Risonanza Magnetica,3"
  );

  const [nuovoNome, setNuovoNome] = useState<string>("");
  const [nuovoTel, setNuovoTel] = useState<string>("");
  const [nuovaPrestazione, setNuovaPrestazione] = useState<string>("Risonanza Magnetica");
  const [nuovaPriorita, setNuovaPriorita] = useState<number>(1);

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
        setPazienteSelezionato(null);
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
          setMatchAudit(data.dettagli.metriche_govtech);
        }
      } else {
        setStatusMsg(data.message || "Controllo completato. Nessun match disponibile.");
      }
      await caricaDati();
    } catch {
      setStatusMsg("Errore durante l'esecuzione del match.");
    }
  };

  const registraNuovoPazienteReale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoNome || !nuovoTel) return;

    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "registra",
          nome: nuovoNome,
          telefono: nuovoTel,
          prestazione: nuovaPrestazione,
          priorita_clinica: nuovaPriorita,
        }),
      });
      const data = await res.json();
      if (data.record) {
        await caricaDati();
        setMostraFormReg(false);
        setNuovoNome("");
        setNuovoTel("");
        setPazienteSelezionato(data.record);
        setStatusMsg(`Paziente ${data.record.nome} registrato e preso in carico sul database.`);
      }
    } catch {
      setStatusMsg("Errore durante la registrazione del paziente.");
    }
  };

  const importaFlussoCSV = async () => {
    const righe = csvTesto.split("\n").map((r) => r.trim()).filter(Boolean);
    const pazienti = righe.map((riga) => {
      const [nome, telefono, prestazione, priorita] = riga.split(",");
      return { nome, telefono, prestazione, priorita_clinica: Number(priorita) || 2 };
    });

    setStatusMsg("Importazione flusso CUP Regionale in corso...");
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "importa_batch", pazienti }),
      });
      const data = await res.json();
      setStatusMsg(data.message || "Flusso importato!");
      setMostraImportCSV(false);
      await caricaDati();
    } catch {
      setStatusMsg("Errore durante l'importazione CSV.");
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
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-blue-400">Reverse-CUP</h1>
            <p className="text-xs text-slate-400 mt-1">Direzione Sanitaria ASL</p>
          </div>
          <nav className="space-y-2">
            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md">
              Dashboard &amp; Registro
            </div>
            <button
              onClick={() => setMostraFormReg(true)}
              className="w-full text-left text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              📝 Nuova Presa in Carico
            </button>
            <button
              onClick={() => setMostraImportCSV(true)}
              className="w-full text-left text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              📥 Importa CSV CUP
            </button>
            <Link
              href="/paziente"
              target="_blank"
              className="block text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
            >
              📱 Apri Simulatore Paziente
            </Link>
          </nav>
        </div>
        <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 space-y-1">
          <div className="text-slate-300 font-semibold">Standard GovTech:</div>
          <div>• Registro Prenotazioni L. 724/94</div>
          <div>• D.L. 73/2024 (L. 107/2024)</div>
          <div>• Firma SHA-256 Immutabile</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Registro Prenotazioni e Yield Management
            </h2>
            <p className="text-sm text-slate-500">
              Gestione attiva delle liste d&apos;attesa sanitarie con tracciabilità e tutele di legge.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setMostraImportCSV(!mostraImportCSV)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              📥 Importa CSV
            </button>
            <button
              onClick={() => setMostraFormReg(!mostraFormReg)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              + Registra Utente
            </button>
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
              🔄 Reset Dati
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-sm font-medium flex justify-between items-center shadow-sm">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg("")} className="text-xs underline ml-4 hover:text-blue-700 cursor-pointer">
              Chiudi
            </button>
          </div>
        )}

        {/* MODALE SCHEDA DETTAGLIO PAZIENTE (REGISTRO SANITARIO) */}
        {pazienteSelezionato && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-bold block">
                    Registro Sanitario Ufficiale • Scheda Assistito
                  </span>
                  <h3 className="text-lg font-bold mt-0.5">{pazienteSelezionato.nome}</h3>
                </div>
                <button
                  onClick={() => setPazienteSelezionato(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ✕ Chiudi
                </button>
              </div>

              <div className="p-6 space-y-5 text-sm text-slate-700 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Recapito Telefonico (SMS)</span>
                    <span className="font-mono font-bold text-blue-600">{pazienteSelezionato.telefono}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">NRE (Ricetta Elettronica)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {pazienteSelezionato.nre || `190A0004928100${pazienteSelezionato.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Prestazione Richiesta</span>
                    <span className="font-bold text-slate-900">{pazienteSelezionato.prestazione}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Data Presa in Carico</span>
                    <span className="font-medium text-slate-800">
                      {pazienteSelezionato.data_inserimento
                        ? new Date(pazienteSelezionato.data_inserimento).toLocaleString("it-IT")
                        : "Oggi"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold block">Inquadramento Priorità RAO</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.colore
                      }`}
                    >
                      Classe {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.codice} —{" "}
                      {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.nome}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      Tempo Massimo: {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.tempoMax}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 pt-1">
                    {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.descrizioneLegge}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1">
                  <h4 className="font-bold text-blue-900 text-xs uppercase">Diritti e Tutele Applicate (L. 107/2024)</h4>
                  <p className="text-xs text-blue-900/90 leading-relaxed">
                    L&apos;assistito è inserito nel registro attivo con divieto di chiusura agende (Art. 3 D.Lgs. 124/1998).
                    Ha diritto al richiamo last-minute tramite SMS e, in caso di superamento dei termini, all&apos;attivazione
                    del Percorso di Tutela in Intramoenia a carico dell&apos;ASL.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setPazienteSelezionato(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Chiudi Scheda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODULO IMPORTAZIONE CSV */}
        {mostraImportCSV && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-md border-2 border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Importazione Flusso CUP Regionale (CSV)</h3>
                <p className="text-xs text-slate-500">Formato riga: Nome,Telefono,Prestazione,ClasseRAO (1-4)</p>
              </div>
              <button onClick={() => setMostraImportCSV(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <textarea
              rows={3}
              value={csvTesto}
              onChange={(e) => setCsvTesto(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg font-mono text-xs mb-3 bg-slate-50"
            />
            <div className="flex justify-end">
              <button onClick={importaFlussoCSV} className="bg-slate-900 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer">
                Importa nel Database Neon →
              </button>
            </div>
          </div>
        )}

        {/* FORM REGISTRAZIONE NUOVO PAZIENTE */}
        {mostraFormReg && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-md border-2 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Nuova Presa in Carico (Lista d&apos;Attesa)</h3>
                <p className="text-xs text-slate-500">Inserimento anagrafica e ricetta sul database protetto.</p>
              </div>
              <button onClick={() => setMostraFormReg(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={registraNuovoPazienteReale} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome e Cognome</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Anna Rossi"
                  value={nuovoNome}
                  onChange={(e) => setNuovoNome(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Telefono (SMS)</label>
                <input
                  type="text"
                  required
                  placeholder="Es. 3331122334"
                  value={nuovoTel}
                  onChange={(e) => setNuovoTel(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Prestazione</label>
                <select
                  value={nuovaPrestazione}
                  onChange={(e) => setNuovaPrestazione(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="Risonanza Magnetica">Risonanza Magnetica</option>
                  <option value="Visita Cardiologica">Visita Cardiologica</option>
                  <option value="Ecografia Addome">Ecografia Addome</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Priorità RAO</label>
                <select
                  value={nuovaPriorita}
                  onChange={(e) => setNuovaPriorita(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={1}>Classe U - Urgente (72h)</option>
                  <option value={2}>Classe B - Breve (10 gg)</option>
                  <option value={3}>Classe D - Differibile (30/60 gg)</option>
                  <option value={4}>Classe P - Programmata (120 gg)</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end mt-2">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer">
                  Salva nel Registro e Apri Scheda →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AUDIT CRITTOGRAFICO SHA-256 */}
        {matchAudit && (
          <div className="mb-8 bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden font-mono text-sm">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                🔒 LOG ASSEGNAZIONE INCORRUTTIBILE (SHA-256)
              </span>
              <span className="text-xs text-slate-500">Zero-Trust Audit</span>
            </div>
            <div className="p-5 text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <span className="text-slate-500 text-xs block mb-1">CERTIFICATO CRITTOGRAFICO</span>
                <span className="text-amber-400 font-bold tracking-widest break-all">{matchAudit.certificato_hash_sha256}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block mb-1">SCORE YIELD (DYCUS)</span>
                <span className="text-white font-bold text-lg">{matchAudit.dycus_score} pts</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block mb-1">CRITERIO DI SCELTA</span>
                <span className="text-blue-300">{matchAudit.motivazione_pubblica}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block mb-1">PROBABILITÀ RISPOSTA</span>
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
            <p className="text-xs text-slate-500 mt-1">In attesa conferma: <strong>{slotInAttesa}</strong></p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Slot Recuperati</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">{slotRecuperati}</p>
            <p className="text-xs text-slate-500 mt-1">Tramite matching automatico</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Valore Generato (SSN)</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">€ {valoreGenerato}</p>
            <p className="text-xs text-slate-500 mt-1">Stima recupero (45€/slot)</p>
          </div>
        </div>

        {/* Tabella Live Matching Agende */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Live Matching Agende (Prossime 48h)</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">● Live Sync</span>
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
                  <td colSpan={4} className="p-6 text-center text-slate-400">Caricamento dati...</td>
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
                      {item.stato_slot === "libero" && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Libero</span>}
                      {item.stato_slot === "in_attesa_conferma" && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⏳ In Attesa SMS</span>}
                      {item.stato_slot === "occupato" && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Occupato</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* REGISTRO PAZIENTI E LISTA D'ATTESA (CLICCABILE) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">Registro Ufficiale Pazienti in Lista d&apos;Attesa</h3>
              <p className="text-xs text-slate-500">Clicca su qualsiasi assistito per aprire la scheda clinico-amministrativa completa.</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Totale: {coda.length} registrati</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Paziente</th>
                <th className="p-4">Telefono Recall</th>
                <th className="p-4">Prestazione</th>
                <th className="p-4">Classe RAO &amp; SLA</th>
                <th className="p-4">Stato Ricetta</th>
                <th className="p-4 text-right">Azione / Scheda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {coda.map((r) => {
                const infoRao = NORMATIVA_RAO[r.priorita_clinica] || NORMATIVA_RAO[4];
                return (
                  <tr key={r.id} className="hover:bg-blue-50/40 transition">
                    <td className="p-4 font-medium text-slate-900">{r.nome}</td>
                    <td className="p-4 font-mono text-blue-600 font-semibold">{r.telefono}</td>
                    <td className="p-4">{r.prestazione}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${infoRao.colore}`}>
                        Classe {infoRao.codice} ({infoRao.tempoMax})
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.stato === "evasa" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {r.stato}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setPazienteSelezionato(r)}
                        className="bg-slate-900 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        📂 Apri Scheda Paziente
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}