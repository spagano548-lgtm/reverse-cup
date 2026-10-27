import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function popolaDatiDemo() {
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

    await sql`DELETE FROM ricette`;
    await sql`DELETE FROM agende`;
    await sql`DELETE FROM pazienti`;

    const p1 = await sql`INSERT INTO pazienti (nome, telefono) VALUES ('Mario Rossi', '3331234567') RETURNING id`;
    const p2 = await sql`INSERT INTO pazienti (nome, telefono) VALUES ('Laura Bianchi', '3339876543') RETURNING id`;
    const p3 = await sql`INSERT INTO pazienti (nome, telefono) VALUES ('Giuseppe Verdi', '3335556677') RETURNING id`;

    await sql`INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato) VALUES (${p1[0].id}, 'Risonanza Magnetica', 1, 'in_attesa')`;
    await sql`INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato) VALUES (${p2[0].id}, 'Risonanza Magnetica', 2, 'in_attesa')`;
    await sql`INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato) VALUES (${p3[0].id}, 'Visita Cardiologica', 1, 'in_attesa')`;

    await sql`INSERT INTO agende (data_ora, prestazione, ospedale, stato_slot) VALUES (NOW() + INTERVAL '12 hours', 'Risonanza Magnetica', 'Ospedale Centrale', 'libero')`;
    await sql`INSERT INTO agende (data_ora, prestazione, ospedale, stato_slot) VALUES (NOW() + INTERVAL '24 hours', 'Visita Cardiologica', 'Poliambulatorio Nord', 'libero')`;
    await sql`INSERT INTO agende (data_ora, prestazione, ospedale, stato_slot) VALUES (NOW() + INTERVAL '36 hours', 'Ecografia Addome', 'Ospedale San Marco', 'occupato')`;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const reset = searchParams.get('reset');

        let agende = [];
        try {
            agende = await sql`SELECT * FROM agende ORDER BY data_ora ASC`;
        } catch {
            await popolaDatiDemo();
            agende = await sql`SELECT * FROM agende ORDER BY data_ora ASC`;
        }

        if (agende.length === 0 || reset === '1') {
            await popolaDatiDemo();
            agende = await sql`SELECT * FROM agende ORDER BY data_ora ASC`;
        }

        const coda = await sql`
            SELECT r.id, r.prestazione, r.priorita_clinica, r.stato, r.data_inserimento, p.nome, p.telefono
            FROM ricette r
            JOIN pazienti p ON r.id_paziente = p.id
            ORDER BY r.priorita_clinica ASC, r.data_inserimento ASC
        `;

        return NextResponse.json({ agende, coda });
    } catch (error) {
        console.error("Errore lettura dati:", error);
        return NextResponse.json({ agende: [], coda: [], error: "Errore DB" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Caso 1: Nuova registrazione paziente in lista d'attesa (Presa in Carico ex L. 107/2024)
        if (body.azione === 'registra') {
            const { nome, telefono, prestazione, priorita_clinica } = body;
            if (!nome || !telefono || !prestazione || !priorita_clinica) {
                return NextResponse.json({ message: "Campi obbligatori mancanti" }, { status: 400 });
            }

            const nuovoPaz = await sql`
                INSERT INTO pazienti (nome, telefono)
                VALUES (${nome.trim()}, ${telefono.trim()})
                RETURNING id
            `;
            const nuovaRic = await sql`
                INSERT INTO ricette (id_paziente, prestazione, priorita_clinica, stato)
                VALUES (${nuovoPaz[0].id}, ${prestazione}, ${Number(priorita_clinica)}, 'in_attesa')
                RETURNING id, data_inserimento
            `;

            return NextResponse.json({
                success: true,
                message: "Cittadino registrato ufficialmente in lista d'attesa.",
                record: {
                    id: nuovaRic[0].id,
                    nome: nome.trim(),
                    telefono: telefono.trim(),
                    prestazione,
                    priorita_clinica: Number(priorita_clinica),
                    stato: 'in_attesa',
                    data_inserimento: nuovaRic[0].data_inserimento
                }
            });
        }

        // Caso 2: Risposta SI/NO del paziente dal Simulatore
        const { telefono, risposta } = body;
        if (!telefono || !risposta) {
            return NextResponse.json({ message: "Dati mancanti" }, { status: 400 });
        }

        const telPulito = telefono.trim();
        const pazienteQuery = await sql`SELECT id, nome FROM pazienti WHERE telefono = ${telPulito} LIMIT 1`;
        if (pazienteQuery.length === 0) {
            return NextResponse.json({ message: "Numero non trovato in lista. Usa es. 3331234567 o 3339876543." });
        }
        const idPaziente = pazienteQuery[0].id;

        const matchQuery = await sql`
            SELECT a.id as id_slot, r.id as id_ricetta, a.prestazione, a.ospedale, a.data_ora
            FROM agende a
            JOIN ricette r ON a.prestazione = r.prestazione
            WHERE r.id_paziente = ${idPaziente} 
              AND r.stato = 'in_attesa' 
              AND a.stato_slot = 'in_attesa_conferma'
            LIMIT 1
        `;

        if (matchQuery.length === 0) {
            return NextResponse.json({ message: "Nessuno slot in attesa di conferma per questo numero. Avvia prima il Match sulla Dashboard!" });
        }
        const match = matchQuery[0];

        if (risposta === 'SI') {
            await sql`UPDATE agende SET stato_slot = 'occupato' WHERE id = ${match.id_slot}`;
            await sql`UPDATE ricette SET stato = 'evasa' WHERE id = ${match.id_ricetta}`;
            return NextResponse.json({
                message: "✅ Appuntamento CONFERMATO! Ricorda: ai sensi dell'Art. 3 c. 7 D.L. 73/2024 (L. 107/2024), eventuale disdetta va comunicata almeno 48h prima per evitare l'addebito del ticket (anche se esente)."
            });
        } else {
            await sql`UPDATE agende SET stato_slot = 'libero' WHERE id = ${match.id_slot}`;
            return NextResponse.json({
                message: "🔄 Hai ceduto lo slot last-minute al paziente successivo. Conservi intatto il tuo diritto in lista d'attesa entro i tempi massimi della tua classe RAO (PNGLA)."
            });
        }
    } catch (error) {
        console.error("Errore nel Webhook:", error);
        return NextResponse.json({ message: "Errore interno al server" }, { status: 500 });
    }
}