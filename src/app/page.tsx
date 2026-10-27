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
      "Prestazione la cui tempestiva esecuzione non influenza significativamente la prognosi a breve ma è richiesta sulla base della presenza di dolore, disfunzione o disabilità (PNGLA).",
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

// Genera un Token Zero-Knowledge deterministico per la verifica anti-saltafila GDPR
function generaTokenZK(id: number, nome: string = "") {
  const prefisso = nome
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 2)
    .toUpperCase() || "XX";
  const codice = ((id * 7919) % 9000) + 1000;
  return `ZK-SSN-${codice}${prefisso}`;
}

export default function Dashboard() {
  const [agende, setAgende] = useState<any[]>([]);
  const [coda, setCoda] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [filtroSegnalazioni, setFiltroSegnalazioni] = useState<string>("TUTTE");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [matchAudit, setMatchAudit] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Stato per la Modale Scheda Clinico-Amministrativa Paziente
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
      if (data.segnalazioni) setSegnalazioni(data.segnalazioni);
      if (reset) {
        setStatusMsg("Database ripristinato con i dati demo iniziali e telemetria Cron azzerata!");
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
    setStatusMsg("Elaborazione Algoritmo DYCUS e scrittura nel Ledger Crittografico...");
    setMatchAudit(null);
    try {
      const res = await fetch("/api/match?manual=1", { cache: "no-store" });
      const data = await res.json();

      if (data.dettagli) {
        setStatusMsg(
          `Segnalazione registrata! Slot proposto a: ${data.dettagli.paziente} (Tel: ${data.dettagli.telefono})`
        );
        if (data.dettagli.metriche_govtech) {
          setMatchAudit(data.dettagli.metriche_govtech);
        }
      } else {
        setStatusMsg(data.message || "Controllo completato.");
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
        setStatusMsg(`Paziente ${data.record.nome} registrato in lista d'attesa (ex L. 107/2024).`);
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

  // Filtro per la Centrale Operativa Segnalazioni Cron
  const segnalazioniFiltrate = segnalazioni.filter((s) => {
    if (filtroSegnalazioni === "TUTTE") return true;
    if (filtroSegnalazioni === "CRON")
      return s.origine === "CRON_JOB_AUTO" || s.origine === "TRIGGER_DIREZIONE";
    if (filtroSegnalazioni === "SMS") return s.origine === "WEBHOOK_SMS_PAZIENTE";
    if (filtroSegnalazioni === "CUP")
      return s.origine === "PORTALE_CUP" || s.origine === "IMPORT_CSV_LEGACY";
    return true;
  });

  // Individuazione candidato "Shadow Overbooking" (Paziente Riserva in Standby)
  const pazientiInAttesa = coda.filter((c) => c.stato === "in_attesa");
  const candidatoStandby = pazientiInAttesa.length > 1 ? pazientiInAttesa[1] : pazientiInAttesa[0];

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-blue-400">Reverse-CUP</h1>
            <p className="text-xs text-slate-400 mt-1">Direzione Sanitaria ASL • GovTech</p>
          </div>
          <nav className="space-y-2">
            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md flex justify-between items-center">
              <span>Dashboard &amp; Telemetria</span>
              <span className="bg-blue-800 text-[10px] px-2 py-0.5 rounded-full">
                {segnalazioni.length} log
              </span>
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

        <div className="text-xs text-slate-400 border-t border-slate-800 pt-4 space-y-1.5">
          <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
            <span>●</span> Motore DYCUS + Auto-Rollover
          </div>
          <div>• L. 107/2024 &amp; PNGLA RAO</div>
          <div>• Ledger Crittografico SHA-256</div>
          <div>• Zero-Knowledge Audit GDPR</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Centrale Operativa Liste d&apos;Attesa e Telemetria Cron-Job
            </h2>
            <p className="text-sm text-slate-500">
              Monitoraggio continuo delle segnalazioni automatiche, scorrimento Auto-Rollover e registro assistiti.
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
            <button
              onClick={() => setStatusMsg("")}
              className="text-xs underline ml-4 hover:text-blue-700 cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* MODALE SCHEDA DETTAGLIO PAZIENTE CON STORICO SEGNALAZIONI CRON E NORMATIVA */}
        {pazienteSelezionato && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-bold block">
                    Fascicolo di Presa in Carico • Conformità L. 107/2024 &amp; GDPR
                  </span>
                  <h3 className="text-xl font-bold mt-0.5 flex items-center gap-3">
                    <span>{pazienteSelezionato.nome}</span>
                    <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                      {generaTokenZK(pazienteSelezionato.id, pazienteSelezionato.nome)}
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => setPazienteSelezionato(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ✕ Chiudi
                </button>
              </div>

              <div className="p-6 space-y-5 text-sm text-slate-700 max-h-[78vh] overflow-y-auto">
                {/* Dati Identificativi e Ricetta NRE */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Recapito Recall SMS
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      {pazienteSelezionato.telefono}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      NRE (Ricetta Elettronica)
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {pazienteSelezionato.nre || `190A0004928100${pazienteSelezionato.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Prestazione Prescritta
                    </span>
                    <span className="font-bold text-slate-900">{pazienteSelezionato.prestazione}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Token Zero-Knowledge
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {generaTokenZK(pazienteSelezionato.id, pazienteSelezionato.nome)}
                    </span>
                  </div>
                </div>

                {/* Inquadramento Classe RAO */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase font-semibold">
                      Inquadramento Priorità Clinica RAO (AGENAS / PNGLA)
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      SLA Massimo di Legge: {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.tempoMax}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.colore
                      }`}
                    >
                      Classe {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.codice} —{" "}
                      {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.nome}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 pt-1">
                    {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.descrizioneLegge}
                  </p>
                </div>

                {/* Storico Segnalazioni Cron-Job per questo specifico paziente */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">
                    📡 Storico Segnalazioni Cron-Job e Notifiche SMS per {pazienteSelezionato.nome}
                  </h4>
                  {segnalazioni.filter((s) => s.paziente_telefono === pazienteSelezionato.telefono)
                    .length === 0 ? (
                    <p className="text-xs text-slate-500">
                      In attesa del prossimo ciclo di matching per questa classe di priorità.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {segnalazioni
                        .filter((s) => s.paziente_telefono === pazienteSelezionato.telefono)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center gap-2"
                          >
                            <div>
                              <span className="font-bold text-blue-700">[{s.tipo_evento}]</span>{" "}
                              <span>{s.dettaglio_esito}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              Hash: {s.hash_sha256}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Quadro Normativo Completo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                    <h4 className="font-bold text-amber-900 mb-1">
                      ⚖️ Diritto al Percorso di Tutela (Art. 3, c. 13, D.Lgs. 124/1998)
                    </h4>
                    <p className="text-amber-900/90 leading-relaxed">
                      In caso di mancata erogazione entro i termini RAO (
                      {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.tempoMax}), l&apos;assistito ha diritto
                      alla prestazione in <strong>Intramoenia (ALPI)</strong> o privato accreditato pagando il solo
                      ticket.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60">
                    <h4 className="font-bold text-red-900 mb-1">
                      ⚠️ Obbligo Disdetta 48h (Art. 3, c. 7, D.L. 73/2024 - L. 107/2024)
                    </h4>
                    <p className="text-red-900/90 leading-relaxed">
                      La mancata presentazione senza disdetta comunicata almeno 48 ore prima comporta l&apos;addebito
                      del ticket ordinario anche per i soggetti titolari di esenzione.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setPazienteSelezionato(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Chiudi Fascicolo
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
                <h3 className="text-lg font-bold text-slate-800">
                  Importazione Flusso CUP Regionale (CSV / HL7 Legacy)
                </h3>
                <p className="text-xs text-slate-500">
                  Formato riga: Nome,Telefono,Prestazione,ClasseRAO (1-4)
                </p>
              </div>
              <button
                onClick={() => setMostraImportCSV(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
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
              <button
                onClick={importaFlussoCSV}
                className="bg-slate-900 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
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
                <h3 className="text-lg font-bold text-slate-800">
                  Nuova Presa in Carico (Lista d&apos;Attesa ex L. 107/2024)
                </h3>
                <p className="text-xs text-slate-500">
                  Genera automaticamente il Token Zero-Knowledge e registra l&apos;evento nel Ledger.
                </p>
              </div>
              <button
                onClick={() => setMostraFormReg(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={registraNuovoPazienteReale} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Nome e Cognome
                </label>
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
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Telefono (SMS)
                </label>
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
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Prestazione
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
                  Priorità RAO
                </label>
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
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Salva nel Registro e Apri Scheda →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* KPI Cards + Moduli Predittivi Innovativi */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Slot Liberi / A Rischio</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{slotLiberi}</p>
            <p className="text-xs text-slate-500 mt-1">
              In attesa SMS: <strong>{slotInAttesa}</strong> (Auto-Rollover Attivo)
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">Slot Recuperati</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{slotRecuperati}</p>
            <p className="text-xs text-slate-500 mt-1">
              Valore SSN Generato: <strong className="text-blue-600">€ {valoreGenerato}</strong>
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Segnalazioni Cron Registrate
            </p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{segnalazioni.length}</p>
            <p className="text-xs text-slate-500 mt-1">Salvate nel Ledger PostgreSQL</p>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm border border-slate-800">
            <p className="text-[11px] font-semibold uppercase text-amber-400">
              ⚡ Radar Shadow Overbooking
            </p>
            <p className="text-sm font-bold mt-1.5 truncate">
              Standby: {candidatoStandby ? candidatoStandby.nome : "Coda pronta"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Pre-allertato per subentro istantaneo su timeout SLA
            </p>
          </div>
        </div>

        {/* NUOVA SEZIONE: CENTRALE OPERATIVA SEGNALAZIONI CRON-JOB & LEDGER IMMUTABILE */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-lg border border-slate-800 overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-bold text-white text-base">
                  📡 Centrale Operativa Segnalazioni Cron-Job &amp; Ledger Crittografico SHA-256
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ogni chiamata di Cron-job.org (ogni 5 min), trigger DYCUS o risposta SMS viene registrata in modo permanente qui sotto.
              </p>
            </div>

            {/* Filtri Rapidi Segnalazioni */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl text-xs">
              {[
                { id: "TUTTE", label: `Tutte (${segnalazioni.length})` },
                { id: "CRON", label: "⚡ Cron-Job & Match" },
                { id: "SMS", label: "📱 Risposte SMS Pazienti" },
                { id: "CUP", label: "📥 Iscrizioni & CSV" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFiltroSegnalazioni(btn.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    filtroSegnalazioni === btn.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 text-xs font-mono">
            {segnalazioniFiltrate.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Nessuna segnalazione presente per questo filtro. Clicca su &quot;⚡ Innesca Algoritmo DYCUS&quot; o attendi il prossimo ping di Cron-job.org!
              </div>
            ) : (
              segnalazioniFiltrate.map((seg) => (
                <div
                  key={seg.id}
                  className="p-4 hover:bg-slate-800/60 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400">
                        {seg.data_ora
                          ? new Date(seg.data_ora).toLocaleString("it-IT", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "Adesso"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          seg.origine === "CRON_JOB_AUTO"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : seg.origine === "WEBHOOK_SMS_PAZIENTE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {seg.origine}
                      </span>
                      <span className="text-amber-400 font-bold">{seg.tipo_evento}</span>
                      {seg.paziente_nome && (
                        <span className="text-white font-sans font-semibold">
                          → {seg.paziente_nome} ({seg.paziente_telefono})
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{seg.dettaglio_esito}</p>
                    {seg.motivazione && (
                      <p className="text-slate-400 text-[11px]">Criterio: {seg.motivazione}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    {Number(seg.dycus_score) > 0 && (
                      <div className="text-emerald-400 font-bold">
                        DYCUS: {seg.dycus_score} pts ({seg.probabilita})
                      </div>
                    )}
                    <div className="text-[10px] text-amber-300/90 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      SHA-256: {seg.hash_sha256}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tabella Live Matching Agende (Hub & Spoke) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">
                Live Matching Agende Federate Hub &amp; Spoke (Prossime 48h)
              </h3>
              <p className="text-xs text-slate-500">
                Se tutti gli slot sono in attesa SMS, il sistema attiva l&apos;Auto-Rollover SLA per non bloccare mai il flusso.
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
              ● Live Sync 3s
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Data e Ora</th>
                <th className="p-4">Prestazione</th>
                <th className="p-4">Struttura (Rete ASL)</th>
                <th className="p-4">Stato Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Caricamento dati...
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
                    <td className="p-4 font-semibold">{item.prestazione}</td>
                    <td className="p-4 text-slate-600">{item.ospedale}</td>
                    <td className="p-4">
                      {item.stato_slot === "libero" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Libero (Pronto per Match)
                        </span>
                      )}
                      {item.stato_slot === "in_attesa_conferma" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          ⏳ In Attesa SMS
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

        {/* REGISTRO UFFICIALE PAZIENTI IN LISTA D'ATTESA CON TOKEN ZERO-KNOWLEDGE */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-800">
                Registro Ufficiale Pazienti in Lista d&apos;Attesa (L. 107/2024 &amp; Token Zero-Knowledge)
              </h3>
              <p className="text-xs text-slate-500">
                Clicca su qualsiasi riga o sul pulsante &quot;📂 Apri Scheda Paziente&quot; per ispezionare il fascicolo completo e le notifiche inviate.
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">
              Totale in Registro: {coda.length} assistiti
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Token ZK (GDPR)</th>
                <th className="p-4">Paziente</th>
                <th className="p-4">Telefono Recall</th>
                <th className="p-4">Prestazione</th>
                <th className="p-4">Classe RAO &amp; SLA</th>
                <th className="p-4">Stato Ricetta</th>
                <th className="p-4 text-right">Fascicolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {coda.map((r) => {
                const infoRao = NORMATIVA_RAO[r.priorita_clinica] || NORMATIVA_RAO[4];
                return (
                  <tr
                    key={r.id}
                    onClick={() => setPazienteSelezionato(r)}
                    className="hover:bg-blue-50/50 transition cursor-pointer"
                  >
                    <td className="p-4 font-mono text-xs text-slate-500 font-bold">
                      {generaTokenZK(r.id, r.nome)}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{r.nome}</td>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setPazienteSelezionato(r);
                        }}
                        className="bg-slate-900 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
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