"use client";

import { useState } from "react";

export default function SimulatorePaziente() {
  const [telefono, setTelefono] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"sms" | "normativa">("sms");

  const inviaRisposta = async (risposta: "SI" | "NO") => {
    if (!telefono) {
      setMessaggio("⚠️ Inserisci il tuo numero di telefono (es. 3331234567).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, risposta }),
      });
      const data = await res.json();
      setMessaggio(data.message);
    } catch {
      setMessaggio("Errore di connessione col server ASL.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4 font-sans">
      {/* Cornice Smartphone */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-900 flex flex-col min-h-[680px] max-h-[88vh]">
        {/* Header Smartphone */}
        <div className="bg-blue-600 p-4 text-white text-center shadow-md shrink-0">
          <h1 className="font-bold text-lg">Portale Cittadino SSN</h1>
          <p className="text-xs opacity-90">Notifiche Reverse-CUP &amp; Tutele Legge 107/2024</p>

          {/* Selettore Scheda interna allo Smartphone */}
          <div className="grid grid-cols-2 gap-2 mt-3 bg-blue-700 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTab("sms")}
              className={`py-2 rounded-lg transition cursor-pointer ${
                tab === "sms" ? "bg-white text-blue-700 shadow" : "text-blue-100 hover:text-white"
              }`}
            >
              💬 Conferma Slot SMS
            </button>
            <button
              onClick={() => setTab("normativa")}
              className={`py-2 rounded-lg transition cursor-pointer ${
                tab === "normativa" ? "bg-white text-blue-700 shadow" : "text-blue-100 hover:text-white"
              }`}
            >
              ⚖️ Diritti &amp; Normativa
            </button>
          </div>
        </div>

        {/* Contenuto Tab 1: Risposta SMS */}
        {tab === "sms" ? (
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 text-xs text-slate-700 leading-relaxed space-y-2">
                <p className="font-bold text-slate-900 text-sm">📩 SSN Informa (Recall Last-Minute):</p>
                <p>
                  Si è liberato uno slot nelle prossime 48h per la tua prestazione in lista d&apos;attesa,
                  assegnato tramite algoritmo <strong>DYCUS</strong> in base alla tua classe di priorità RAO e
                  anzianità di attesa.
                </p>
                <p className="text-slate-500">
                  • Rispondi <strong>SI</strong> per confermare il posto.
                  <br />• Rispondi <strong>NO</strong> per cedere il turno senza perdere la tua posizione ordinaria
                  in lista (PNGLA).
                </p>
              </div>

              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                Il tuo numero di cellulare registrato
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Es. 3331234567"
                className="w-full p-3.5 border border-slate-300 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base"
              />

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-snug mb-4">
                <strong>Avviso legale (Art. 3, c. 7, D.L. 73/2024 - L. 107/2024):</strong> Una volta confermato
                l&apos;appuntamento, la mancata presentazione senza disdetta comunicata almeno 48 ore prima comporta
                l&apos;addebito del ticket anche per gli assistiti titolari di esenzione.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => inviaRisposta("NO")}
                disabled={loading}
                className="flex-1 bg-white border-2 border-red-500 text-red-600 font-bold py-3.5 rounded-xl hover:bg-red-50 transition cursor-pointer"
              >
                Rifiuta (NO)
              </button>
              <button
                onClick={() => inviaRisposta("SI")}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-md transition cursor-pointer"
              >
                Conferma (SI)
              </button>
            </div>
          </div>
        ) : (
          /* Contenuto Tab 2: Informativa Completa di Legge alla Registrazione */
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
              <h2 className="font-bold text-blue-900 text-sm mb-1">
                📜 Cosa prevede la legge quando vieni inserito in Lista d&apos;Attesa
              </h2>
              <p className="text-blue-800 text-[11px]">
                Informativa ufficiale ai sensi del D.Lgs. 124/1998, PNGLA, D.L. 73/2024 (conv. in L. 107/2024) e
                Regolamento UE 2016/679 (GDPR).
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <h3 className="font-bold text-slate-900">1. Classi di Priorità RAO e Tempi Massimi (PNGLA)</h3>
              <p>Al momento della registrazione della ricetta elettronica (NRE), ti è garantita l&apos;erogazione entro:</p>
              <ul className="list-disc pl-4 space-y-1 pt-1">
                <li>
                  <strong>Classe U (Urgente):</strong> entro <strong>72 ore</strong>.
                </li>
                <li>
                  <strong>Classe B (Breve):</strong> entro <strong>10 giorni</strong>.
                </li>
                <li>
                  <strong>Classe D (Differibile):</strong> entro <strong>30 giorni</strong> (visite) o{" "}
                  <strong>60 giorni</strong> (esami diagnostici).
                </li>
                <li>
                  <strong>Classe P (Programmata):</strong> entro <strong>120 giorni</strong>.
                </li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <h3 className="font-bold text-slate-900">
                2. Divieto di Chiusura delle Agende (Art. 3, c. 12, D.Lgs. 124/1998 e L. 107/2024)
              </h3>
              <p>
                Le ASL non possono mai rifiutare la prenotazione o chiudere le agende. Se al momento della richiesta
                non ci sono posti immediati, vieni inserito nel registro di <strong>Presa in Carico (Pre-Lista)</strong>{" "}
                con tracciamento della data di prima chiamata.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 space-y-1">
              <h3 className="font-bold text-amber-900">
                3. Diritto al &quot;Percorso di Tutela&quot; (Art. 3, c. 13, D.Lgs. 124/1998)
              </h3>
              <p className="text-amber-900">
                Se l&apos;ASL non riesce a garantirti l&apos;appuntamento entro il tempo massimo della tua classe RAO,
                hai diritto a ricevere la prestazione in <strong>Intramoenia (libera professione ALPI)</strong> o nel
                privato accreditato pagando <strong>solo l&apos;eventuale ticket</strong>, con differenza a carico
                dell&apos;ASL.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 space-y-1">
              <h3 className="font-bold text-red-900">
                4. Obbligo di Disdetta entro 48h (Art. 3, c. 7, D.L. 73/2024)
              </h3>
              <p className="text-red-900">
                Chi non si presenta all&apos;appuntamento confermato senza disdire almeno{" "}
                <strong>2 giorni lavorativi prima</strong> è tenuto per legge al pagamento del ticket della
                prestazione, <strong>anche se gode di esenzione</strong> per patologia o reddito.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 space-y-1">
              <h3 className="font-bold text-emerald-400">
                5. Trasparenza Algoritmica e Anticorruzione (Art. 22 GDPR &amp; L. 190/2012)
              </h3>
              <p className="text-[11px] text-slate-300">
                Lo scorrimento della lista d&apos;attesa è governato dal motore matematico{" "}
                <strong>DYCUS (Dynamic Yield &amp; Clinical Urgency Score)</strong> e certificato con firma
                crittografica <strong>SHA-256</strong>: nessun operatore può alterare manualmente la coda o favorire
                scavalcamenti.
              </p>
            </div>
          </div>
        )}

        {/* Area Feedback in basso */}
        {messaggio && (
          <div className="p-4 bg-slate-900 text-white text-center text-xs font-medium leading-relaxed shrink-0">
            {messaggio}
          </div>
        )}
      </div>
    </div>
  );
}