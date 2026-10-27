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
    descrizioneLegge:
      "Prestazione la cui tempestiva esecuzione condiziona in un arco di tempo brevissimo la prognosi a breve del paziente o influenza marcatamente il dolore, la disfunzione o la disabilità (PNGLA).",
  },
  2: {
    codice: "B",
    nome: "Breve",
    tempoMax: "Entro 10 giorni",
    colore: "bg-amber-100 text-amber-800 border-amber-300",
    descrizioneLegge:
      "Prestazione la cui tempestiva esecuzione condiziona in un arco di tempo breve la prognosi a breve del paziente o influenza marcatamente il dolore, la disfunzione o la disabilità (PNGLA).",
  },
  3: {
    codice: "D",
    nome: "Differibile",
    tempoMax: "Entro 30 gg (Visite) / 60 gg (Diagnostica)",
    colore: "bg-blue-100 text-blue-800 border-blue-300",
    descrizioneLegge:
      "Prestazione la cui tempestiva esecuzione non influenza significativamente la prognosi a breve ma è richiesta sulla base della presenza di dolore o di disfunzione o di disabilità (PNGLA).",
  },
  4: {
    codice: "P",
    nome: "Programmata",
    tempoMax: "Entro 120 giorni",
    colore: "bg-slate-100 text-slate-800 border-slate-300",
    descrizioneLegge:
      "Prestazione che può essere programmata in un maggiore arco di tempo in quanto non influenza la prognosi, il dolore, la disfunzione o la disabilità (PNGLA).",
  },
};

export default function Dashboard() {
  const [agende, setAgende] = useState<any[]>([]);
  const [coda, setCoda] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [matchAudit, setMatchAudit] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [schedaPaziente, setSchedaPaziente] = useState<any>(null);

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
        setSchedaPaziente(null);
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
        setSchedaPaziente(data.record);
        setStatusMsg(`Paziente ${data.record.nome} salvato su DB e preso in carico (ex L. 107/2024).`);
      }
    } catch {
      setStatusMsg("Errore durante la registrazione del paziente.");
    }
  };

  const importaFlussoCSV = async () => {
    const righe = csvTesto
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    const pazienti = righe.map((riga) => {
      const [nome, telefono, prestazione, priorita] = riga.split(",");
      return {
        nome,
        telefono,
        prestazione,
        priorita_clinica: Number(priorita) || 2,
      };
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
              Dashboard Yield &amp; Audit
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
              📥 Importa CSV CUP Legacy
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
          <div className="text-slate-300 font-semibold">Conformità Normativa:</div>
          <div>• L. 107/2024 (D.L. 73/2024)</div>
          <div>• PNGLA &amp; Classi RAO AGENAS</div>
          <div>• Art. 3 D.Lgs. 124/1998</div>
          <div>• GDPR Reg. UE 2016/679</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Governo Liste d&apos;Attesa e Yield Management
            </h2>
            <p className="text-sm text-slate-500">
              Piattaforma conforme al PNGLA, Legge 107/2024 e registro crittografico SHA-256.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setMostraImportCSV(!mostraImportCSV)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              📥 Importa Flusso CSV
            </button>
            <button
              onClick={() => setMostraFormReg(!mostraFormReg)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              + Registra Utente in Lista
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
              🔄 Reset Dati Demo
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-sm font-medium flex justify-between items-center shadow-sm">
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-xs underline ml-4 hover:text-blue-700"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* MODULO IMPORTAZIONE MASSIVA CSV (PER OPERATIVITÀ DAL GIORNO 1) */}
        {mostraImportCSV && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-md border-2 border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Importazione Asincrona Flusso CUP Regionale (CSV / HL7 Legacy)
                </h3>
                <p className="text-xs text-slate-500">
                  Incolla o modifica il tracciato CSV esportato dal gestionale ospedaliero (Formato: Nome,Telefono,Prestazione,ClasseRAO).
                </p>
              </div>
              <button
                onClick={() => setMostraImportCSV(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕ Chiudi
              </button>
            </div>
            <textarea
              rows={4}
              value={csvTesto}
              onChange={(e) => setCsvTesto(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg font-mono text-xs mb-3 bg-slate-50"
            />
            <div className="flex justify-end">
              <button
                onClick={importaFlussoCSV}
                className="bg-slate-900 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Carica Lotto nel Database Neon PostgreSQL →
              </button>
            </div>
          </div>
        )}

        {/* FORM REGISTRAZIONE SINGOLO UTENTE */}
        {mostraFormReg && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-md border-2 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Inserimento Cittadino in Lista d&apos;Attesa (Presa in Carico ex L. 107/2024)
                </h3>
                <p className="text-xs text-slate-500">
                  Salva sul database PostgreSQL e genera immediatamente il Prospetto Normativo per il cittadino.
                </p>
              </div>
              <button
                onClick={() => setMostraFormReg(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕ Chiudi
              </button>
            </div>

            <form onSubmit={registraNuovoPazienteReale} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Nome e Cognome Assistito
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Giulia Neri"
                  value={nuovoNome}
                  onChange={(e) => setNuovoNome(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Cellulare per Recall SMS
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. 3334455667"
                  value={nuovoTel}
                  onChange={(e) => setNuovoTel(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Prestazione Prescritta
                </label>
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
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Classe Priorità RAO (Ricetta)
                </label>
                <select
                  value={nuovaPriorita}
                  onChange={(e) => setNuovaPriorita(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={1}>Classe U - Urgente (Max 72h)</option>
                  <option value={2}>Classe B - Breve (Max 10 gg)</option>
                  <option value={3}>Classe D - Differibile (Max 30/60 gg)</option>
                  <option value={4}>Classe P - Programmata (Max 120 gg)</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end mt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow transition cursor-pointer"
                >
                  Conferma Iscrizione e Genera Attestazione Normativa →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PROSPETTO INFORMATIVO E NORMATIVO DI PRESA IN CARICO */}
        {schedaPaziente && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl border-2 border-blue-600 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-blue-400 font-bold block">
                  Servizio Sanitario Nazionale • Attestazione Ufficiale di Presa in Carico
                </span>
                <h3 className="text-xl font-bold mt-1">
                  Prospetto Informativo Inserimento in Lista d&apos;Attesa — {schedaPaziente.nome}
                </h3>
              </div>
              <button
                onClick={() => setSchedaPaziente(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ✕ Chiudi Prospetto
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold block">
                    Assistito / Contatto Recall
                  </span>
                  <span className="font-bold text-slate-900">{schedaPaziente.nome}</span>
                  <span className="block text-xs font-mono text-blue-600">{schedaPaziente.telefono}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold block">
                    NRE (Numero Ricetta Elettronica)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {schedaPaziente.nre || `190A0004928100${schedaPaziente.id}`}
                  </span>
                  <span className="block text-xs text-slate-500">
                    Prestazione: <strong>{schedaPaziente.prestazione}</strong>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold block">
                    Classe di Priorità RAO (AGENAS)
                  </span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      NORMATIVA_RAO[schedaPaziente.priorita_clinica]?.colore
                    }`}
                  >
                    Codice {NORMATIVA_RAO[schedaPaziente.priorita_clinica]?.codice} —{" "}
                    {NORMATIVA_RAO[schedaPaziente.priorita_clinica]?.nome}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold block">
                    Tempo Massimo Garantito (PNGLA)
                  </span>
                  <span className="font-bold text-emerald-700 text-base">
                    {NORMATIVA_RAO[schedaPaziente.priorita_clinica]?.tempoMax}
                  </span>
                  <span className="block text-xs text-slate-500">Dalla data di prima richiesta</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="font-bold text-slate-900 mb-2">
                    1️⃣ Presa in Carico e Divieto di Chiusura Agende
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    Ai sensi dell&apos;<strong>Art. 3, c. 12 del D.Lgs. 124/1998</strong> e della{" "}
                    <strong>Legge 107/2024 (D.L. 73/2024)</strong>, è vietata qualsiasi chiusura delle agende.{" "}
                    {NORMATIVA_RAO[schedaPaziente.priorita_clinica]?.descrizioneLegge}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="font-bold text-slate-900 mb-2">
                    2️⃣ Funzionamento del Recall Dinamico (Reverse-CUP)
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    In attuazione del <strong>D.L. 73/2024, Art. 3</strong>, rispondendo <strong>SI</strong> confermi
                    lo slot last-minute; rispondendo <strong>NO</strong> cedi il turno senza perdere il diritto
                    all&apos;erogazione entro i termini ordinari della tua classe RAO.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                  <h4 className="font-bold text-amber-900 mb-2">
                    3️⃣ Diritto al &quot;Percorso di Tutela&quot; (Art. 3, c. 13, D.Lgs. 124/1998)
                  </h4>
                  <p className="text-xs leading-relaxed text-amber-900/90">
                    In caso di superamento dei tempi massimi (<strong>{NORMATIVA_RAO[schedaPaziente.priorita_clinica]?.tempoMax}</strong>),
                    hai diritto all&apos;erogazione in regime <strong>Intramoenia (ALPI)</strong> o privato accreditato
                    pagando esclusivamente l&apos;eventuale quota ticket.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                  <h4 className="font-bold text-red-900 mb-2">
                    4️⃣ Obbligo di Disdetta entro 48h e Sanzione No-Show
                  </h4>
                  <p className="text-xs leading-relaxed text-red-900/90">
                    Ai sensi dell&apos;<strong>Art. 3, c. 7 del D.L. 73/2024 (L. 107/2024)</strong>, la mancata
                    presentazione senza disdetta comunicata almeno <strong>2 giorni lavorativi (48 ore) prima</strong>{" "}
                    comporta l&apos;addebito del ticket <strong>anche per i titolari di esenzione</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs leading-relaxed">
                <div className="font-bold text-white mb-1 flex justify-between items-center">
                  <span>🔒 Garanzia di Trasparenza Algoritmica (Art. 22 GDPR) e Anticorruzione (L. 190/2012)</span>
                  <span className="font-mono text-emerald-400">Protocollo SHA-256 Verificato</span>
                </div>
                Ai sensi degli <strong>Artt. 9, 13, 14 e 22 del Regolamento UE 2016/679 (GDPR)</strong>, l&apos;ordine
                di chiamata è governato dal motore <strong>DYCUS</strong> e blindato con firma crittografica immutabile
                SHA-256 contro qualsiasi alterazione manuale.
              </div>
            </div>
          </div>
        )}

        {/* AUDIT CRITTOGRAFICO */}
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
            <p className="text-xs text-slate-500 mt-1">Stima recupero costi (45€/slot)</p>
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

        {/* Coda Ricette Pazienti */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-800">
                Registro Coda d&apos;Attesa e Tutele Normative (PNGLA / L. 107/2024)
              </h3>
              <p className="text-xs text-slate-500">
                Clicca su &quot;📜 Vedi Scheda Normativa&quot; per aprire l&apos;informativa legale completa dell&apos;assistito.
              </p>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Paziente</th>
                <th className="p-4">Telefono (Per Test)</th>
                <th className="p-4">Prestazione</th>
                <th className="p-4">Classe RAO &amp; SLA Legale</th>
                <th className="p-4">Stato</th>
                <th className="p-4 text-right">Attestazione Utente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {coda.map((r) => {
                const infoRao = NORMATIVA_RAO[r.priorita_clinica] || NORMATIVA_RAO[4];
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{r.nome}</td>
                    <td className="p-4 font-mono text-blue-600 font-semibold">{r.telefono}</td>
                    <td className="p-4">{r.prestazione}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${infoRao.colore}`}>
                        Classe {infoRao.codice} ({infoRao.tempoMax})
                      </span>
                    </td>
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
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSchedaPaziente(r)}
                        className="bg-slate-900 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        📜 Vedi Scheda Normativa
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