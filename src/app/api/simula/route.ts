import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        // 1. Prende tutti gli slot 'libero' o 'in_attesa_conferma' e li porta a 'occupato' (simulando accettazioni di massa)
        const slotLiberi = await sql`
            SELECT id, prestazione, ospedale FROM agende 
            WHERE stato_slot IN ('libero', 'in_attesa_conferma')
            LIMIT 5
        `;

        let conteggio = 0;
        for (const slot of slotLiberi) {
            // Segna lo slot come occupato
            await sql`UPDATE agende SET stato_slot = 'occupato' WHERE id = ${slot.id}`;
            
            // Trova una ricetta in attesa per quella prestazione e la segna come evasa
            const ricetta = await sql`
                SELECT id FROM ricette 
                WHERE prestazione = ${slot.prestazione} AND stato = 'in_attesa' 
                LIMIT 1
            `;

            if (ricetta.length > 0) {
                await sql`UPDATE ricette SET stato = 'evasa' WHERE id = ${ricetta[0].id}`;
            }

            // Registra l'evento nel ledger delle segnalazioni
            await sql`
                INSERT INTO segnalazioni_cron (
                    origine, tipo_evento, prestazione, ospedale, paziente_nome, paziente_telefono,
                    dycus_score, probabilita, motivazione, hash_sha256, dettaglio_esito
                ) VALUES (
                    'SIMULATORE_BATCH', 'ACCETTAZIONE_MASSA', ${slot.prestazione}, ${slot.ospedale},
                    'Cittadino Simulato (Batch)', '3330000000', 125.0, '100%',
                    'Simulazione rapida accettazione simultanea slot last-minute',
                    ${'BATCH_SIM_' + Date.now().toString(16).toUpperCase()},
                    ${'Slot #' + slot.id + ' recuperato con successo in modalità simulazione batch.'}
                )
            `;
            conteggio++;
        }

        return NextResponse.json({
            success: true,
            message: `Simulazione completata con successo! Accettati in blocco ${conteggio} slot last-minute.`
        });
    } catch (error) {
        console.error("Errore simulazione batch:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}