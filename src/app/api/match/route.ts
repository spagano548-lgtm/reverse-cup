import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
    try {
        // 1. Cerchiamo 1 slot 'libero' nelle prossime 48 ore
        const slotQuery = await sql`
            SELECT * FROM agende 
            WHERE stato_slot = 'libero' 
            AND data_ora <= NOW() + INTERVAL '48 hours'
            AND data_ora > NOW()
            LIMIT 1
        `;

        if (slotQuery.length === 0) {
            return NextResponse.json({ message: "Nessuno slot last-minute disponibile al momento." });
        }
        const slot = slotQuery[0];

        // 2. Troviamo il paziente con la priorità clinica più alta in attesa
        const pazienteQuery = await sql`
            SELECT r.id as id_ricetta, p.id as id_paziente, p.nome, p.telefono
            FROM ricette r
            JOIN pazienti p ON r.id_paziente = p.id
            WHERE r.prestazione = ${slot.prestazione}
            AND r.stato = 'in_attesa'
            ORDER BY r.priorita_clinica ASC, r.data_inserimento ASC
            LIMIT 1
        `;

        if (pazienteQuery.length === 0) {
            return NextResponse.json({ message: "Slot disponibile, ma nessuna ricetta in attesa per questa prestazione." });
        }
        const match = pazienteQuery[0];

        // 3. Blocchiamo temporaneamente lo slot per evitare overbooking
        await sql`
            UPDATE agende 
            SET stato_slot = 'in_attesa_conferma' 
            WHERE id = ${slot.id}
        `;

        // 4. Prepariamo il testo della notifica (per il log e per il simulatore)
        const dataFormat = new Date(slot.data_ora).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const testoSMS = `SSN Informa: Si è liberato un posto per ${slot.prestazione} il ${dataFormat} al ${slot.ospedale}. Rispondi SI per confermare o NO per cedere il turno.`;

        // Risposta per scopi di debug e log manageriale
        return NextResponse.json({ 
            success: true, 
            message: "Match effettuato con successo. Slot bloccato.",
            dettagli: {
                slot_id: slot.id,
                paziente: match.nome,
                telefono: match.telefono,
                sms_text: testoSMS
            }
        });

    } catch (error) {
        console.error("Errore nel motore di matching:", error);
        return NextResponse.json({ error: "Errore interno al server" }, { status: 500 });
    }
}