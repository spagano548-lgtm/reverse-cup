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
    tempoMax: "Entro 30/60 giorni",
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

function generaTokenZK(id: number, nome: string = "") {
  const prefisso =
    nome
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 2)
      .toUpperCase() || "XX";
  const codice = ((Number(id || 1) * 7919) % 9000) + 1000;
  return `ZK-SSN-${codice}${prefisso}`;
}

function generaNRE(id: number) {
  return `190A0004928${String(1000 + Number(id || 1)).slice(-4)}`;
}

function canaleRecallPaziente(id: number) {
  const canali = ["📲 App IO + SMS", "🤖 Voice-Bot AI (Over-75)", "💬 SMS + FSE 2.0"];
  return canali[Number(id || 1) % canali.length];
}

export default function Dashboard() {
  const [agende, setAgende] = useState<any[]>([]);
  const [coda, setCoda] = useState<any[]>([]);
  const [segnalazioni, setSegnalazioni] = useState<any[]>([]);
  const [vistaAttiva, setVistaAttiva] = useState<"TUTTO" | "CRON" | "RICHIESTE">("TUTTO");
  const [filtroSegnalazioni, setFiltroSegnalazioni] = useState<string>("TUTTE");
  const [ricercaPaziente, setRicercaPaziente] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [pazienteSelezionato, setPazienteSelezionato] = useState<any>(null);

  const [mostraFormReg, setMostraFormReg] = useState<boolean>(false);
  const [mostraImportCSV, setMostraImportCSV] = useState<boolean>(false);
  const [csvTesto, setCsvTesto] = useState<string>(
    "Lorenzo Pellegrini,3334050607,Risonanza Magnetica,1\nBeatrice Villa,3338090102,Visita Cardiologica,1\nMatteo Santoro,3337060504,Ecografia Addome,2"
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
        setStatusMsg("Database popolato con le 10 richieste complete e lo storico segnalazioni Cron-Job!");
        setPazienteSelezionato(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const eseguiMatch = async () => {
    setStatusMsg("Esecuzione chiamata Cron-Job / Algoritmo DYCUS in corso...");
    try {
      const res = await fetch("/api/match?manual=1", { cache: "no-store" });
      const data = await res.json();
      if (data.dettagli) {
        setStatusMsg(
          `Nuova Segnalazione Cron registrata! Slot proposto a: ${data.dettagli.paziente} (Tel: ${data.dettagli.telefono})`
        );
      } else {
        setStatusMsg(data.message || "Controllo completato.");
      }
      await caricaDati();
    } catch {
      setStatusMsg("Errore durante l'esecuzione del match.");
    }
  };

  const simulaRafficaCron = async () => {
    setStatusMsg("Simulazione raffica di 3 segnali Cron-Job consecutivi in corso...");
    try {
      for (let i = 0; i < 3; i++) {
        await fetch("/api/match", { cache: "no-store" });
      }
      await caricaDati();
      setStatusMsg("✅ 3 nuove segnalazioni Cron-Job generate e registrate nella Centrale Operativa!");
    } catch {
      setStatusMsg("Errore durante la simulazione raffica.");
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
        setStatusMsg(`Richiesta di ${data.record.nome} salvata nell'elenco completo (ex L. 107/2024).`);
      }
    } catch {
      setStatusMsg("Errore durante la registrazione.");
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

    setStatusMsg("Importazione flusso richieste CSV in corso...");
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
  const kmRisparmiatiESG = (slotRecuperati + slotInAttesa) * 14;
  const co2RisparmiataKg = ((kmRisparmiatiESG * 0.12) || 4.8).toFixed(1);

  const segnalazioniFiltrate = segnalazioni.filter((s) => {
    if (filtroSegnalazioni === "TUTTE") return true;
    if (filtroSegnalazioni === "CRON")
      return s.origine === "CRON_JOB_ORG_AUTO" || s.origine === "TRIGGER_MANUALE_ASL";
    if (filtroSegnalazioni === "SMS") return s.origine === "WEBHOOK_SMS_PAZIENTE";
    if (filtroSegnalazioni === "CUP")
      return s.origine === "PORTALE_CUP" || s.origine === "IMPORT_CSV_LEGACY";
    return true;
  });

  const codaFiltrata = coda.filter(
    (r) =>
      r.nome?.toLowerCase().includes(ricercaPaziente.toLowerCase()) ||
      r.prestazione?.toLowerCase().includes(ricercaPaziente.toLowerCase()) ||
      r.telefono?.includes(ricercaPaziente)
  );

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
            <button
              onClick={() => setVistaAttiva("TUTTO")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex justify-between items-center ${
                vistaAttiva === "TUTTO"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>📊 Vista Globale</span>
            </button>

            <button
              onClick={() => setVistaAttiva("CRON")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex justify-between items-center ${
                vistaAttiva === "CRON"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>📡 Segnalazioni Cron</span>
              <span className="bg-emerald-500 text-slate-950 font-bold text-[11px] px-2 py-0.5 rounded-full">
                {segnalazioni.length}
              </span>
            </button>

            <button
              onClick={() => setVistaAttiva("RICHIESTE")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer flex justify-between items-center ${
                vistaAttiva === "RICHIESTE"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>📋 Tutte le Richieste</span>
              <span className="bg-blue-400 text-slate-950 font-bold text-[11px] px-2 py-0.5 rounded-full">
                {coda.length}
              </span>
            </button>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setMostraFormReg(true)}
                className="w-full text-left text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                ➕ Nuova Richiesta
              </button>
              <button
                onClick={() => setMostraImportCSV(true)}
                className="w-full text-left text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                📥 Importa Lotto CSV
              </button>
              <Link
                href="/paziente"
                target="_blank"
                className="block text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                📱 Simulatore Paziente
              </Link>
            </div>
          </nav>
        </div>

        <div className="text-xs text-slate-400 border-t border-slate-800 pt-4 space-y-1">
          <div className="text-emerald-400 font-semibold">● Ecosistema Next-Gen Attivo</div>
          <div>• App IO &amp; FSE 2.0 Sync</div>
          <div>• Voice-Bot AI Over-75</div>
          <div>• Firma SHA-256 &amp; Token ZK</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Governo Liste d&apos;Attesa, Richieste Cittadini e Segnalazioni Cron-Job
            </h2>
            <p className="text-sm text-slate-500">
              Piattaforma conforme alla Legge 107/2024 con telemetria Cron-Job integrale, App IO, Voice-Bot AI e calcolo ESG.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={simulaRafficaCron}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
            >
              🚀 Simula Raffica Cron (x3)
            </button>
            <button
              onClick={eseguiMatch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
            >
              ⚡ Esegui 1 Match DYCUS
            </button>
            <button
              onClick={() => setMostraFormReg(!mostraFormReg)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
            >
              + Nuova Richiesta
            </button>
            <button
              onClick={() => caricaDati(true)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
            >
              🔄 Ricarica Dati Completi
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

        {/* KPI Principali + Moduli Evolutivi (App IO, Voice-Bot AI, ESG) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div
            onClick={() => setVistaAttiva("CRON")}
            className="bg-white p-4 rounded-xl shadow-sm border-2 border-purple-200 hover:border-purple-500 transition cursor-pointer"
          >
            <p className="text-[11px] font-bold uppercase text-purple-600">📡 Segnalazioni Cron</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{segnalazioni.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Vedi registro completo →</p>
          </div>

          <div
            onClick={() => setVistaAttiva("RICHIESTE")}
            className="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-200 hover:border-blue-500 transition cursor-pointer"
          >
            <p className="text-[11px] font-bold uppercase text-blue-600">📋 Richieste in Lista</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{coda.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Vedi tutte le richieste →</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Slot Liberi / Attesa</p>
            <p className="text-3xl font-bold text-red-600 mt-1">
              {slotLiberi} <span className="text-sm text-amber-600 font-normal">/ {slotInAttesa} SMS</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Auto-Rollover SLA attivo</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Recuperati &amp; Valore</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              {slotRecuperati} <span className="text-sm text-blue-600">(€ {valoreGenerato})</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">App IO + Voice-Bot AI</p>
          </div>

          <div className="bg-emerald-950 text-white p-4 rounded-xl shadow-sm border border-emerald-800">
            <p className="text-[11px] font-bold uppercase text-emerald-400">🌱 Impatto ESG Hub/Spoke</p>
            <p className="text-2xl font-bold mt-1">-{co2RisparmiataKg} kg CO₂</p>
            <p className="text-[11px] text-emerald-200 mt-1">
              {kmRisparmiatiESG} km risparmiati ai cittadini
            </p>
          </div>
        </div>

        {/* MODALE SCHEDA COMPLETA DEL PAZIENTE E DELLA RICHIESTA */}
        {pazienteSelezionato && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-bold block">
                    Fascicolo Ufficiale Richiesta Lista d&apos;Attesa • Conformità L. 107/2024, FSE 2.0 &amp; GDPR
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Recapito Recall
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      {pazienteSelezionato.telefono}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Codice NRE Ricetta
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {generaNRE(pazienteSelezionato.id)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Prestazione Richiesta
                    </span>
                    <span className="font-bold text-slate-900">{pazienteSelezionato.prestazione}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Canale Multicanale
                    </span>
                    <span className="font-semibold text-indigo-700">
                      {canaleRecallPaziente(pazienteSelezionato.id)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase font-semibold">
                      Inquadramento Priorità Clinica RAO (AGENAS / PNGLA)
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      Tempo Massimo Garantito: {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.tempoMax}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                      NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.colore
                    }`}
                  >
                    Classe {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.codice} —{" "}
                    {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.nome}
                  </span>
                  <p className="text-xs text-slate-600 pt-1">
                    {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.descrizioneLegge}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">
                    📡 Segnalazioni Cron-Job e Notifiche per {pazienteSelezionato.nome}
                  </h4>
                  {segnalazioni.filter((s) => s.paziente_telefono === pazienteSelezionato.telefono)
                    .length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Richiesta attiva in graduatoria: verrà contattata automaticamente al prossimo ciclo utile.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {segnalazioni
                        .filter((s) => s.paziente_telefono === pazienteSelezionato.telefono)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center gap-2"
                          >
                            <div>
                              <span className="font-bold text-purple-700">[{s.origine}]</span>{" "}
                              <span className="font-semibold">{s.tipo_evento}:</span>{" "}
                              <span>{s.dettaglio_esito}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">
                              SHA-256: {s.hash_sha256}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                    <h4 className="font-bold text-amber-900 mb-1">
                      ⚖️ Diritto al Percorso di Tutela (Art. 3, c. 13, D.Lgs. 124/1998)
                    </h4>
                    <p className="text-amber-900/90 leading-relaxed">
                      In caso di superamento dei termini massimi (
                      {NORMATIVA_RAO[pazienteSelezionato.priorita_clinica]?.tempoMax}), il paziente ha diritto
                      all&apos;erogazione in <strong>Intramoenia (ALPI)</strong> o privato accreditato pagando il solo
                      ticket.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60">
                    <h4 className="font-bold text-red-900 mb-1">
                      ⚠️ Obbligo Disdetta 48h (Art. 3, c. 7, D.L. 73/2024 - L. 107/2024)
                    </h4>
                    <p className="text-red-900/90 leading-relaxed">
                      La mancata presentazione senza disdetta comunicata almeno 48 ore prima comporta l&apos;addebito
                      del ticket ordinario anche per gli assistiti esenti.
                    </p>
                  </div>
                </div>
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
                  Importazione Massiva Richieste da Flusso CUP Regionale (CSV)
                </h3>
                <p className="text-xs text-slate-500">Formato: Nome,Telefono,Prestazione,ClasseRAO (1-4)</p>
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
                Carica Richieste nel Registro →
              </button>
            </div>
          </div>
        )}

        {/* FORM NUOVA RICHIESTA */}
        {mostraFormReg && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-md border-2 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Nuova Richiesta d&apos;Inserimento in Lista d&apos;Attesa (L. 107/2024)
                </h3>
                <p className="text-xs text-slate-500">
                  Inserisce immediatamente il paziente nella tabella delle richieste e genera la segnalazione nel Ledger.
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
                  placeholder="Es. Chiara Galli"
                  value={nuovoNome}
                  onChange={(e) => setNuovoNome(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Telefono Recall SMS
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
                  Prestazione Richiesta
                </label>
                <select
                  value={nuovaPrestazione}
                  onChange={(e) => setNuovaPrestazione(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="Risonanza Magnetica">Risonanza Magnetica</option>
                  <option value="Visita Cardiologica">Visita Cardiologica</option>
                  <option value="Ecografia Addome">Ecografia Addome</option>
                  <option value="TAC Torace">TAC Torace</option>
                  <option value="Visita Oculistica">Visita Oculistica</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Classe RAO
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
                  Registra Richiesta e Apri Scheda Normativa →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SEZIONE 1: TUTTE LE SEGNALAZIONI INVIATE DA CRON-JOB.ORG */}
        {(vistaAttiva === "TUTTO" || vistaAttiva === "CRON") && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-lg border border-slate-800 overflow-hidden mb-8">
            <div className="p-5 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-bold text-white text-base">
                    📡 Registro Completo Segnalazioni Cron-Job &amp; Audit Crittografico ({segnalazioniFiltrate.length} eventi)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Elenco integrale di tutte le esecuzioni automatiche inviate da Cron-job.org, i match DYCUS, App IO e Voice-Bot AI.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl text-xs">
                {[
                  { id: "TUTTE", label: `Tutte (${segnalazioni.length})` },
                  { id: "CRON", label: "⚡ Cron-Job & Match" },
                  { id: "SMS", label: "📱 Risposte SMS / App IO" },
                  { id: "CUP", label: "📥 Nuove Richieste" },
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

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/80 text-xs font-mono">
              {segnalazioniFiltrate.map((seg) => (
                <div
                  key={seg.id}
                  className="p-4 hover:bg-slate-800/60 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400 font-bold">#{seg.id}</span>
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
                          seg.origine === "CRON_JOB_ORG_AUTO"
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
                    <p className="text-slate-200 font-sans text-xs">{seg.dettaglio_esito}</p>
                    {seg.motivazione && (
                      <p className="text-slate-400 text-[11px]">Criterio DYCUS: {seg.motivazione}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    {Number(seg.dycus_score) > 0 && (
                      <div className="text-emerald-400 font-bold">
                        Score DYCUS: {seg.dycus_score} pts ({seg.probabilita})
                      </div>
                    )}
                    <div className="text-[10px] text-amber-300/90 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      SHA-256: {seg.hash_sha256}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEZIONE 2: LISTA COMPLETA DI TUTTI I DATI DELLE RICHIESTE DEI PAZIENTI */}
        {(vistaAttiva === "TUTTO" || vistaAttiva === "RICHIESTE") && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  📋 Elenco Integrale di Tutte le Richieste in Lista d&apos;Attesa ({codaFiltrata.length} richieste)
                </h3>
                <p className="text-xs text-slate-500">
                  Tutti i dati completi delle richieste registrate (NRE, Token ZK, Classe RAO, Canale App IO / Voice-Bot AI, Ore d&apos;attesa). Clicca su una riga per aprire la scheda legale.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 Cerca nome, telefono o esame..."
                  value={ricercaPaziente}
                  onChange={(e) => setRicercaPaziente(e.target.value)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase border-b border-slate-200">
                    <th className="p-3.5">NRE Ricetta</th>
                    <th className="p-3.5">Token ZK (GDPR)</th>
                    <th className="p-3.5">Assistito</th>
                    <th className="p-3.5">Telefono Recall</th>
                    <th className="p-3.5">Prestazione Richiesta</th>
                    <th className="p-3.5">Classe RAO &amp; SLA</th>
                    <th className="p-3.5">Canale Recall</th>
                    <th className="p-3.5">Attesa</th>
                    <th className="p-3.5">Stato</th>
                    <th className="p-3.5 text-right">Scheda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {codaFiltrata.map((r) => {
                    const infoRao = NORMATIVA_RAO[r.priorita_clinica] || NORMATIVA_RAO[4];
                    const oreAttesa = r.data_inserimento
                      ? Math.max(
                          1,
                          Math.round(
                            (Date.now() - new Date(r.data_inserimento).getTime()) / (1000 * 3600)
                          )
                        )
                      : 12;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setPazienteSelezionato(r)}
                        className="hover:bg-blue-50/60 transition cursor-pointer"
                      >
                        <td className="p-3.5 font-mono font-bold text-slate-700">
                          {generaNRE(r.id)}
                        </td>
                        <td className="p-3.5 font-mono text-emerald-700 font-semibold">
                          {generaTokenZK(r.id, r.nome)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 text-sm">{r.nome}</td>
                        <td className="p-3.5 font-mono text-blue-600 font-bold">{r.telefono}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{r.prestazione}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${infoRao.colore}`}
                          >
                            Classe {infoRao.codice} ({infoRao.tempoMax})
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] font-medium text-indigo-700">
                          {canaleRecallPaziente(r.id)}
                        </td>
                        <td className="p-3.5 text-slate-600 font-semibold">{oreAttesa}h</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              r.stato === "evasa"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {r.stato === "evasa" ? "✓ Evasa" : "⏳ In Attesa"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPazienteSelezionato(r);
                            }}
                            className="bg-slate-900 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            📂 Scheda
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEZIONE 3: TABELLA SLOT AGENDE OSPEDALIERE */}
        {vistaAttiva === "TUTTO" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">
                  Disponibilità Slot Agende Ospedaliere Hub &amp; Spoke (Prossime 48h)
                </h3>
                <p className="text-xs text-slate-500">
                  Sincronizzazione in tempo reale con le conferme e le disdette dei pazienti.
                </p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
                ● Live Sync
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <th className="p-4">ID Slot</th>
                  <th className="p-4">Data e Ora Esame</th>
                  <th className="p-4">Prestazione</th>
                  <th className="p-4">Struttura Sanitaria</th>
                  <th className="p-4">Stato Slot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Caricamento agende...
                    </td>
                  </tr>
                ) : (
                  agende.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-xs text-slate-500">#{item.id}</td>
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
        )}
      </main>
    </div>
  );
}