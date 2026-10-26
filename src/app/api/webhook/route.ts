import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
    try {
        // Riceviamo telefono e risposta dal nostro Simulatore Web
        const { telefono, risposta } = await req.json();

        if (!telefono || !risposta) {
            return NextResponse.json({ message: "Dati mancanti" }, { status: 400 });
        }

        // 1. Troviamo il paziente
        const pazienteQuery = await sql`SELECT id FROM pazienti WHERE telefono = ${telefono} LIMIT 1`;
        if (pazienteQuery.length === 0) {
            return NextResponse.json({ message: "Paziente non trovato nel sistema." });
        }
        const idPaziente = pazienteQuery[0].id;

        // 2. Cerchiamo il suo appuntamento in attesa
        const matchQuery = await sql`
            SELECT a.id as id_slot, r.id as id_ricetta
            FROM agende a
            JOIN ricette r ON a.prestazione = r.prestazione
            WHERE r.id_paziente = ${idPaziente} 
              AND r.stato = 'in_attesa' 
              AND a.stato_slot = 'in_attesa_conferma'
            LIMIT 1
        `;

        if (matchQuery.length === 0) {
            return NextResponse.json({ message: "Nessun appuntamento in attesa di conferma." });
        }
        const match = matchQuery[0];

        // 3. Logica di Routing (Yield Management)
        if (risposta === 'SI') {
            await sql`UPDATE agende SET stato_slot = 'occupato' WHERE id = ${match.id_slot}`;
            await sql`UPDATE ricette SET stato = 'evasa' WHERE id = ${match.id_ricetta}`;
            return NextResponse.json({ message: "Appuntamento confermato con successo!" });
            
        } else if (risposta === 'NO') {
            await sql`UPDATE agende SET stato_slot = 'libero' WHERE id = ${match.id_slot}`;
            
            // Re-inneschiamo il match per il prossimo in lista
            const host = req.headers.get('host');
            const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
            fetch(`${protocol}://${host}/api/match`).catch(e => console.error(e));
            
            return NextResponse.json({ message: "Hai ceduto il turno. Rimarrai in lista." });
        }

    } catch (error) {
        console.error("Errore nel Webhook:", error);
        return NextResponse.json({ message: "Errore interno al server" }, { status: 500 });
    }
}