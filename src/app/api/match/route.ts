import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { calcolaClassificaDYCUS } from '@/lib/engine';

export async function GET() {
    try {
        // 1. Cerchiamo 1 slot 'libero' last-minute
        const slotQuery = await sql`
            SELECT * FROM agende 
            WHERE stato_slot = 'libero' 
            AND data_ora <= NOW() + INTERVAL '48 hours'
            AND data_ora > NOW()
            ORDER BY data_ora ASC
            LIMIT 1
        `;

        if (slotQuery.length === 0) {
            return NextResponse.json({ message: "Nessuno slot last-minute disponibile al momento." });
        }
        const slot = slotQuery[0];

        // 2. Estraiamo TUTTI i pazienti in attesa per questa prestazione (non solo il primo)
        const pazientiQuery = await sql`
            SELECT r.id as id_ricetta, p.id as id_paziente, p.nome, p.telefono, r.priorita_clinica, r.data_inserimento
            FROM ricette r
            JOIN pazienti p ON r.id_paziente = p.id
            WHERE r.prestazione = ${slot.prestazione}
            AND r.stato = 'in_attesa'
        `;

        if (pazientiQuery.length === 0) {
            return NextResponse.json({ message: "Slot disponibile, ma nessuna ricetta in attesa per questa prestazione." });
        }

        // 3. Applichiamo l'Algoritmo Proprietario DYCUS (Black-Box)
        // In un sistema reale, l'hash precedente verrebbe letto dall'ultima transazione a database
        const hashPrecedente = 'BLOCK_SSN_PREV_0001'; 
        
        const classifica = calcolaClassificaDYCUS(
            pazientiQuery.map(p => ({
                id_ricetta: p.id_ricetta,
                id_paziente: p.id_paziente,
                nome: p.nome,
                telefono: p.telefono,
                priorita_clinica: p.priorita_clinica,
                data_inserimento: p.data_inserimento,
                // Dati simulati per l'MVP (nella realtà proverrebbero da un DB anagrafico)
                affidabilita_score: 80 + Math.random() * 20, 
                distanza_km: Math.random() * 15
            })),
            slot.data_ora,
            hashPrecedente
        );

        // 4. Selezioniamo il vincitore assoluto e blocchiamo lo slot
        const vincitore = classifica[0];
        const match = vincitore.candidato;

        await sql`
            UPDATE agende 
            SET stato_slot = 'in_attesa_conferma' 
            WHERE id = ${slot.id}
        `;

        // 5. Risposta Zero-Trust: Esponiamo solo il certificato crittografico e la motivazione, mai la formula
        return NextResponse.json({ 
            success: true, 
            message: "Match algoritmico effettuato con successo.",
            dettagli: {
                slot_id: slot.id,
                paziente: match.nome,
                telefono: match.telefono,
                sms_text: `SSN Informa: Posto per ${slot.prestazione}. Rispondi SI o NO.`,
                metriche_govtech: {
                    dycus_score: vincitore.dycus_score,
                    probabilita_conversione: `${vincitore.probabilita_conversione}%`,
                    motivazione_pubblica: vincitore.motivazione_algoritmo,
                    certificato_hash_sha256: vincitore.firma_crittografica
                }
            }
        });

    } catch (error) {
        console.error("Errore nel motore di matching DYCUS:", error);
        return NextResponse.json({ error: "Errore interno al server" }, { status: 500 });
    }
}