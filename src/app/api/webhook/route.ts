import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function popolaDatiCompleti() {
  await sql`
    CREATE TABLE IF NOT EXISTS pazienti (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefono TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS ricette (
      id SERIAL PRIMARY KEY,
      id_paziente INTEGER REFERENCES pazienti(id),
      prestazione TEXT NOT NULL,
      priorita_clinica INTEGER NOT NULL,
      data_inserimento TIMESTAMP DEFAULT NOW(),
      stato TEXT DEFAULT 'in_attesa'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS agende (
      id SERIAL PRIMARY KEY,
      data_ora TIMESTAMP NOT NULL,
      prestazione TEXT NOT NULL,
      ospedale TEXT NOT NULL,
      stato_slot TEXT DEFAULT 'libero'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS segnalazioni_cron (
      id SERIAL PRIMARY KEY,
      data_ora TIMESTAMP DEFAULT NOW(),
      origine TEXT NOT NULL,
      tipo_evento TEXT NOT NULL,
      prestazione TEXT,
      ospedale TEXT,
      paziente_nome TEXT,
      paziente_telefono TEXT,
      dycus_score NUMERIC,
      probabilita TEXT,
      motivazione TEXT,
      hash_sha256 TEXT NOT NULL,
      dettaglio_esito TEXT NOT NULL
    )
  `;

  await sql`DELETE FROM ricette`;
  await sql`DELETE FROM agende`;
  await sql`DELETE FROM pazienti`;
  await sql`DELETE FROM segnalazioni_cron`;

  // 10 Richieste Pazienti pre-caricate (Classi U, B, D, P)
  const listaIniziale = [
    { nome: "Mario Rossi", tel: "3331234567", prest: "Risonanza Magnetica", prio: 1, stato: "in_attesa", oreAttesa: 48 },
    { nome: "Giuseppe Verdi", tel: "3335556677", prest: "Visita Cardiologica", prio: 1, stato: "in_attesa", oreAttesa: 36 },
    { nome: "Laura Bianchi", tel: "3339876543", prest: "Risonanza Magnetica", prio: 2, stato: "in_attesa", oreAttesa: 96 },
    { nome: "Anna Russo", tel: "3334455889", prest: "Ecografia Addome", prio: 1, stato: "in_attesa", oreAttesa: 28 },
    { nome: "Francesco Esposito", tel: "3332211445", prest: "TAC Torace", prio: 1, stato: "in_attesa", oreAttesa: 52 },
    { nome: "Elena Greco", tel: "3337788990", prest: "Risonanza Magnetica", prio: 2, stato: "in_attesa", oreAttesa: 120 },
    { nome: "Marco Conti", tel: "3331122334", prest: "Visita Cardiologica", prio: 2, stato: "in_attesa", oreAttesa: 84 },
    { nome: "Sofia Marino", tel: "3336655443", prest: "Ecografia Addome", prio: 3, stato: "in_attesa", oreAttesa: 210 },
    { nome: "Alessandro Bruno", tel: "3338899001", prest: "Visita Oculistica", prio: 3, stato: "in_attesa", oreAttesa: 180 },
    { nome: "Giulia Lombardi", tel: "3339900112", prest: "Visita Cardiologica", prio: 4, stato: "evasa", oreAttesa: 300 },
  ];

  for (const item of listaIniziale) {
    const p: any = await sql`INSERT INTO pazienti (nome, telefono) VALUES (${item.nome}, ${item.tel}) RETURNING id`;
    const dataIns = new Date(Date.now() - item.oreAttesa * 3600 * 1000).toISOString();
    await sql`
      INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, data_inserimento, stato)
      VALUES (${p[0].id}, ${item.prest}, ${item.prio}, ${dataIns}, ${item.stato})
    `;
  }

  // 6 Slot Ospedali Hub & Spoke nelle prossime 48h
  const ora = Date.now();
  const agendeIniziali = [
    { ore: 6, prest: "Risonanza Magnetica", osp: "Ospedale Centrale (Hub)", stato: "libero" },
    { ore: 12, prest: "Visita Cardiologica", osp: "Poliambulatorio Nord (Spoke)", stato: "libero" },
    { ore: 18, prest: "Ecografia Addome", osp: "Ospedale San Marco", stato: "libero" },
    { ore: 24, prest: "TAC Torace", osp: "Ospedale Centrale (Hub)", stato: "in_attesa_conferma" },
    { ore: 30, prest: "Risonanza Magnetica", osp: "Presidio Territoriale Sud (Spoke)", stato: "libero" },
    { ore: 36, prest: "Visita Cardiologica", osp: "Ospedale San Marco", stato: "occupato" },
  ];

  for (const a of agendeIniziali) {
    const dataSlot = new Date(ora + a.ore * 3600 * 1000).toISOString();
    await sql`
      INSERT INTO agende (data_ora, prestazione, ospedale, stato_slot)
      VALUES (${dataSlot}, ${a.prest}, ${a.osp}, ${a.stato})
    `;
  }

  // Segnalazioni Cron-Job + Evoluzioni pre-caricate
  const segnalazioniIniziali = [
    {
      origine: "CRON_JOB_ORG_AUTO",
      evento: "SCANSIONE_RETE_HUB_SPOKE",
      prest: "Tutte le Agende",
      osp: "Rete ASL Integrata",
      nome: "Motore Automatico",
      tel: "-",
      score: 100,
      prob: "99%",
      mot: "Monitoraggio 5 min (D.L. 73/2024 - L. 107/2024) | FSE 2.0 Sync",
      hash: "9F86D081884C7D659A2FEAA0",
      esito: "Cron-Job attivo: 10 richieste in lista d attesa analizzate, 4 slot liberi rilevati nelle prossime 48h.",
    },
    {
      origine: "CRON_JOB_ORG_AUTO",
      evento: "SEGNALAZIONE_MATCH_CRON",
      prest: "Visita Cardiologica",
      osp: "Ospedale San Marco",
      nome: "Giulia Lombardi",
      tel: "3339900112",
      score: 118.4,
      prob: "96%",
      mot: "Classe RAO + Aging 300h | Canale: SMS + App IO (FSE 2.0)",
      hash: "4A7B9012C3E58D11F0A876E2",
      esito: "Slot #6 assegnato dal Cron-Job a Giulia Lombardi e confermato (+45€ valore SSN recuperato).",
    },
    {
      origine: "WEBHOOK_SMS_PAZIENTE",
      evento: "CONFERMA_SI_RICEVUTA",
      prest: "Visita Cardiologica",
      osp: "Ospedale San Marco",
      nome: "Giulia Lombardi",
      tel: "3339900112",
      score: 118.4,
      prob: "100%",
      mot: "Conferma ricevuta via SMS / App IO entro SLA 15 min",
      hash: "7C21F8890B14E672A33D9011",
      esito: "Appuntamento confermato dal cittadino. Impegnativa NRE aggiornata su Fascicolo Sanitario FSE 2.0.",
    },
    {
      origine: "CRON_JOB_ORG_AUTO",
      evento: "SEGNALAZIONE_MATCH_CRON",
      prest: "TAC Torace",
      osp: "Ospedale Centrale (Hub)",
      nome: "Francesco Esposito",
      tel: "3332211445",
      score: 142.8,
      prob: "94%",
      mot: "Classe RAO C1 (Urgente 72h) + Aging 52h | Voice-Bot AI + SMS",
      hash: "E3B0C44298FC1C149AFBF4C8",
      esito: "Slot #4 (TAC Torace) proposto a Francesco Esposito (3332211445) tramite SMS e Voice-Bot AI.",
    },
    {
      origine: "CRON_JOB_ORG_AUTO",
      evento: "PRE_ALLERTA_STANDBY_ESG",
      prest: "Risonanza Magnetica",
      osp: "Ospedale Centrale (Hub)",
      nome: "Mario Rossi",
      tel: "3331234567",
      score: 146.2,
      prob: "97%",
      mot: "Classe RAO C1 (Urgente 72h) | Ottimizzazione ESG (-12km mobilità)",
      hash: "D4735E3A265E16EEE03F5971",
      esito: "Candidato prioritario Mario Rossi (3331234567) pronto per lo slot #1 delle prossime 6h.",
    },
  ];

  for (const s of segnalazioniIniziali) {
    await sql`
      INSERT INTO segnalazioni_cron (
        origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
        dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
      ) VALUES (
        ${s.origine}, ${s.evento}, ${s.prest}, ${s.osp}, ${s.nome}, ${s.tel},
        ${s.score}, ${s.prob}, ${s.mot}, ${s.hash}, ${s.esito}
      )
    `;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reset = searchParams.get("reset");

    let agende: any = [];
    let coda: any = [];
    let segnalazioni: any = [];

    try {
      agende = await sql`SELECT * FROM agende ORDER BY data_ora ASC`;
      coda = await sql`
        SELECT r.id, r.prestazione, r.priorita_clinica, r.stato, r.data_inserimento, p.nome, p.telefono
        FROM ricette r
        JOIN pazienti p ON r.id_paziente = p.id
        ORDER BY r.priorita_clinica ASC, r.data_inserimento ASC
      `;
      segnalazioni = await sql`SELECT * FROM segnalazioni_cron ORDER BY id DESC LIMIT 100`;
    } catch {
      await popolaDatiCompleti();
    }

    if (reset === "1" || coda.length <= 3 || segnalazioni.length === 0) {
      await popolaDatiCompleti();
      agende = await sql`SELECT * FROM agende ORDER BY data_ora ASC`;
      coda = await sql`
        SELECT r.id, r.prestazione, r.priorita_clinica, r.stato, r.data_inserimento, p.nome, p.telefono
        FROM ricette r
        JOIN pazienti p ON r.id_paziente = p.id
        ORDER BY r.priorita_clinica ASC, r.data_inserimento ASC
      `;
      segnalazioni = await sql`SELECT * FROM segnalazioni_cron ORDER BY id DESC LIMIT 100`;
    }

    return NextResponse.json({ agende, coda, segnalazioni });
  } catch (error) {
    console.error("Errore GET webhook:", error);
    return NextResponse.json({ agende: [], coda: [], segnalazioni: [], error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Nuova richiesta singolo paziente
    if (body.azione === "registra") {
      const { nome, telefono, prestazione, priorita_clinica } = body;
      const nuovoPaz: any = await sql`
        INSERT INTO pazienti (nome, telefono)
        VALUES (${String(nome).trim()}, ${String(telefono).trim()})
        RETURNING id
      `;
      const nuovaRic: any = await sql`
        INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato)
        VALUES (${nuovoPaz[0].id}, ${prestazione}, ${Number(priorita_clinica)}, 'in_attesa')
        RETURNING id, data_inserimento
      `;

      await sql`
        INSERT INTO segnalazioni_cron (
          origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
          dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
        ) VALUES (
          'PORTALE_CUP', 'NUOVA_RICHIESTA_LISTA', ${prestazione}, 'Sportello / App IO',
          ${String(nome).trim()}, ${String(telefono).trim()}, 0, '-',
          ${"Inserimento Classe RAO " + priorita_clinica + " (ex L. 107/2024)"},
          ${"REG_SHA_" + Date.now().toString(16).toUpperCase()},
          ${"Nuova richiesta registrata con attivazione fascicolo FSE 2.0 e diritti PNGLA."}
        )
      `;

      return NextResponse.json({
        success: true,
        record: {
          id: nuovaRic[0].id,
          nome: String(nome).trim(),
          telefono: String(telefono).trim(),
          prestazione,
          priorita_clinica: Number(priorita_clinica),
          stato: "in_attesa",
          data_inserimento: nuovaRic[0].data_inserimento,
        },
      });
    }

    // 2. Importazione Massiva CSV
    if (body.azione === "importa_batch" && Array.isArray(body.pazienti)) {
      let importati = 0;
      for (const item of body.pazienti) {
        if (!item.nome || !item.telefono || !item.prestazione) continue;
        const p: any = await sql`
          INSERT INTO pazienti (nome, telefono)
          VALUES (${String(item.nome).trim()}, ${String(item.telefono).trim()})
          RETURNING id
        `;
        await sql`
          INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato)
          VALUES (${p[0].id}, ${String(item.prestazione).trim()}, ${Number(item.priorita_clinica) || 2}, 'in_attesa')
        `;
        importati++;
      }

      await sql`
        INSERT INTO segnalazioni_cron (
          origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
          dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
        ) VALUES (
          'IMPORT_CSV_LEGACY', 'FLUSSO_MASSIVO_CUP', 'Multi-Prestazione', 'CUP Regionale HL7',
          ${importati + " Richieste Importate"}, '-', 0, '-',
          'Ingestione batch da gestionale ospedaliero',
          ${"BATCH_SHA_" + Date.now().toString(16).toUpperCase()},
          ${"Acquisite " + importati + " nuove richieste nella lista d attesa generale."}
        )
      `;

      return NextResponse.json({
        success: true,
        message: `Importate con successo ${importati} richieste nel registro.`,
      });
    }

    // 3. Risposta SI/NO dal Simulatore Paziente
    const { telefono, risposta } = body;
    if (!telefono || !risposta) {
      return NextResponse.json({ message: "Dati mancanti" }, { status: 400 });
    }

    const telPulito = String(telefono).trim();
    const pazienteQuery: any = await sql`SELECT id, nome FROM pazienti WHERE telefono = ${telPulito} LIMIT 1`;
    if (pazienteQuery.length === 0) {
      return NextResponse.json({ message: "Numero non trovato. Usa uno dei numeri presenti nella tabella Richieste!" });
    }
    const idPaziente = pazienteQuery[0].id;
    const nomePaziente = pazienteQuery[0].nome;

    let matchQuery: any = await sql`
      SELECT a.id as id_slot, r.id as id_ricetta, a.prestazione, a.ospedale
      FROM agende a
      JOIN ricette r ON a.prestazione = r.prestazione
      WHERE r.id_paziente = ${idPaziente} 
        AND r.stato = 'in_attesa' 
        AND a.stato_slot = 'in_attesa_conferma'
      LIMIT 1
    `;

    if (matchQuery.length === 0) {
      matchQuery = await sql`
        SELECT a.id as id_slot, r.id as id_ricetta, a.prestazione, a.ospedale
        FROM agende a
        JOIN ricette r ON a.prestazione = r.prestazione
        WHERE r.id_paziente = ${idPaziente} 
          AND r.stato = 'in_attesa'
        LIMIT 1
      `;
    }

    if (matchQuery.length === 0) {
      return NextResponse.json({ message: "Nessuna richiesta in attesa per questo numero." });
    }
    const match = matchQuery[0];

    if (risposta === "SI") {
      await sql`UPDATE agende SET stato_slot = 'occupato' WHERE id = ${match.id_slot}`;
      await sql`UPDATE ricette SET stato = 'evasa' WHERE id = ${match.id_ricetta}`;

      await sql`
        INSERT INTO segnalazioni_cron (
          origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
          dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
        ) VALUES (
          'WEBHOOK_SMS_PAZIENTE', 'CONFERMA_SI', ${match.prestazione}, ${match.ospedale},
          ${nomePaziente}, ${telPulito}, 100, '100%',
          'Conferma SMS / App IO ricevuta dal cittadino',
          ${"ACK_SHA_" + Date.now().toString(16).toUpperCase()},
          ${"Slot #" + match.id_slot + " confermato da " + nomePaziente + " (+45€ valore SSN generato)."}
        )
      `;

      return NextResponse.json({
        message: "✅ Appuntamento CONFERMATO! Ricorda: ai sensi dell'Art. 3 c. 7 D.L. 73/2024 (L. 107/2024), eventuale disdetta va comunicata almeno 48h prima.",
      });
    } else {
      await sql`UPDATE agende SET stato_slot = 'libero' WHERE id = ${match.id_slot}`;

      await sql`
        INSERT INTO segnalazioni_cron (
          origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
          dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
        ) VALUES (
          'WEBHOOK_SMS_PAZIENTE', 'RIFIUTO_NO_ROLLOVER', ${match.prestazione}, ${match.ospedale},
          ${nomePaziente}, ${telPulito}, 0, '-',
          'Cessione turno last-minute (conservazione diritti PNGLA)',
          ${"NACK_SHA_" + Date.now().toString(16).toUpperCase()},
          ${"Slot #" + match.id_slot + " liberato da " + nomePaziente + " e rimesso subito in circolo."}
        )
      `;

      return NextResponse.json({
        message: "🔄 Hai ceduto lo slot last-minute. Conservi la tua posizione ordinaria entro i tempi della tua classe RAO (PNGLA).",
      });
    }
  } catch (error) {
    console.error("Errore POST webhook:", error);
    return NextResponse.json({ message: "Errore interno al server" }, { status: 500 });
  }
}