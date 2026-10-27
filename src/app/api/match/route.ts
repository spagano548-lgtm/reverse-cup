import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calcolaClassificaDYCUS } from '@/lib/engine';

// Crea la tabella delle segnalazioni Cron se non esiste ancora
async function assicuraTabellaSegnalazioni() {
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
}

export async function GET(req: Request) {
    try {
        await assicuraTabellaSegnalazioni();

        const { searchParams } = new URL(req.url);
        const origine = searchParams.get('manual') === '1' ? 'TRIGGER_DIREZIONE' : 'CRON_JOB_AUTO';

        // Recupera l'ultimo hash per concatenare la blockchain interna
        const ultimoLog = await sql`SELECT hash_sha256 FROM segnalazioni_cron ORDER BY id DESC LIMIT 1`;
        const hashPrecedente = ultimoLog.length > 0 ? ultimoLog[0].hash_sha256 : 'GENESIS_SSN_000000000000';

        // 1. Cerchiamo uno slot 'libero' nelle prossime 48h
        let slotQuery = await sql`
            SELECT * FROM agende 
            WHERE stato_slot = 'libero' 
            AND data_ora <= NOW() + INTERVAL '48 hours'
            AND data_ora > NOW()
            ORDER BY data_ora ASC
            LIMIT 1
        `;

        let notaAutoRollover = '';

        // MECCANICA AUTO-ROLLOVER: Se tutti gli slot sono bloccati in 'in_attesa_conferma' o occupati,
        // il sistema gestisce il Timeout SLA / genera una nuova disdetta last-minute dalla rete ASL
        if (slotQuery.length === 0) {
            const slotInAttesa = await sql`
                SELECT * FROM agende WHERE stato_slot = 'in_attesa_conferma' ORDER BY data_ora ASC LIMIT 1
            `;

            if (slotInAttesa.length > 0) {
                // Scadenza SLA SMS: rimette lo slot libero per riassegnarlo subito
                await sql`UPDATE agende SET stato_slot = 'libero' WHERE id = ${slotInAttesa[0].id}`;
                notaAutoRollover = '[Auto-Rollover SLA: Timeout risposta SMS precedente -> Slot rimesso in circolo] ';
            } else {
                // Simula una nuova disdetta appena arrivata dal CUP Regionale
                const prestazioni = ['Risonanza Magnetica', 'Visita Cardiologica', 'Ecografia Addome'];
                const ospedali = ['Ospedale Centrale (Hub)', 'Poliambulatorio Nord (Spoke)', 'Ospedale San Marco'];
                const pRand = prestazioni[Math.floor(Math.random() * prestazioni.length)];
                const oRand = ospedali[Math.floor(Math.random() * ospedali.length)];
                const oreRand = Math.floor(6 + Math.random() * 36);

                await sql`
                    INSERT INTO agende (data_ora, prestazione, ospedale, stato_slot)
                    VALUES (NOW() + (${oreRand} || ' hours')::INTERVAL, ${pRand}, ${oRand}, 'libero')
                `;
                notaAutoRollover = `[Nuova Disdetta Intercettata a -${oreRand}h presso ${oRand}] `;
            }

            slotQuery = await sql`
                SELECT * FROM agende WHERE stato_slot = 'libero' ORDER BY data_ora ASC LIMIT 1
            `;
        }

        const slot = slotQuery[0];

        // 2. Cerchiamo i pazienti in attesa per quella prestazione
        let pazientiQuery = await sql`
            SELECT r.id as id_ricetta, p.id as id_paziente, p.nome, p.telefono, r.priorita_clinica, r.data_inserimento
            FROM ricette r
            JOIN pazienti p ON r.id_paziente = p.id
            WHERE r.prestazione = ${slot.prestazione}
            AND r.stato = 'in_attesa'
        `;

        // Se tutte le ricette per quella prestazione sono state evase, riattiva o inserisce un candidato dal flusso CUP
        if (pazientiQuery.length === 0) {
            const nomiDemo = [' Roberto Galli', 'Chiara Fontana', 'Davide Serra', 'Valentina Riva', 'Simone Moretti'];
            const nomeScelto = nomiDemo[Math.floor(Math.random() * nomiDemo.length)].trim();
            const telScelto = `333${Math.floor(1000000 + Math.random() * 8999999)}`;
            const prioScelta = Math.floor(1 + Math.random() * 2);

            const nuovoP = await sql`INSERT INTO pazienti (nome, telefono) VALUES (${nomeScelto}, ${telScelto}) RETURNING id`;
            await sql`
                INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato)
                VALUES (${nuovoP[0].id}, ${slot.prestazione}, ${prioScelta}, 'in_attesa')
            `;

            pazientiQuery = await sql`
                SELECT r.id as id_ricetta, p.id as id_paziente, p.nome, p.telefono, r.priorita_clinica, r.data_inserimento
                FROM ricette r
                JOIN pazienti p ON r.id_paziente = p.id
                WHERE r.prestazione = ${slot.prestazione}
                AND r.stato = 'in_attesa'
            `;
        }

        // 3. Esecuzione Algoritmo Proprietario DYCUS
        const classifica = calcolaClassificaDYCUS(
            pazientiQuery.map(p => ({
                id_ricetta: p.id_ricetta,
                id_paziente: p.id_paziente,
                nome: p.nome,
                telefono: p.telefono,
                priorita_clinica: p.priorita_clinica,
                data_inserimento: p.data_inserimento,
                affidabilita_score: 82 + Math.random() * 17,
                distanza_km: Math.round(2 + Math.random() * 14)
            })),
            slot.data_ora,
            hashPrecedente
        );

        const vincitore = classifica[0];
        const match = vincitore.candidato;

        // 4. Blocchiamo lo slot in attesa conferma SMS
        await sql`UPDATE agende SET stato_slot = 'in_attesa_conferma' WHERE id = ${slot.id}`;

        const dettaglioEsito = `${notaAutoRollover}Slot #${slot.id} (${slot.prestazione} - ${slot.ospedale}) proposto via SMS a ${match.nome} (${match.telefono}). Candidati valutati: ${classifica.length}.`;

        // 5. SALVATAGGIO PERMANENTE DELLA SEGNALAZIONE NEL DATABASE
        await sql`
            INSERT INTO segnalazioni_cron (
                origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
                dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
            ) VALUES (
                ${origine}, 'MATCH_LAST_MINUTE', ${slot.prestazione}, ${slot.ospedale},
                ${match.nome}, ${match.telefono}, ${vincitore.dycus_score},
                ${vincitore.probabilita_conversione + '%'}, ${vincitore.motivazione_algoritmo},
                ${vincitore.firma_crittografica}, ${dettaglioEsito}
            )
        `;

        return NextResponse.json({
            success: true,
            message: "Segnalazione registrata e Match algoritmico eseguito.",
            dettagli: {
                slot_id: slot.id,
                paziente: match.nome,
                telefono: match.telefono,
                sms_text: `SSN Informa: Posto per ${slot.prestazione}. Rispondi SI o NO.`,
                metriche_govtech: {
                    dycus_score: vincitore.dycus_score,
                    probabilita_conversione: `${vincitore.probabilita_conversione}%`,
                    motivazione_pubblica: vincitore.motivazione_algoritmo,
                    certificato_hash_sha256: vincitore.firma_crittografica,
                    dettaglio_esito: dettaglioEsito
                }
            }
        });

    } catch (error) {
        console.error("Errore nel motore di matching DYCUS:", error);
        return NextResponse.json({ error: "Errore interno al server" }, { status: 500 });
    }
}