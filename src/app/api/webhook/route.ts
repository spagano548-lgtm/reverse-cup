import { sql } from '@/lib/db';

export async function POST(req: Request) {
    try {
        // 1. Twilio invia i dati del messaggio in formato form-urlencoded
        const text = await req.text();
        const params = new URLSearchParams(text);
        
        const fromNumber = params.get('From'); // Es. +393331234567
        const body = params.get('Body')?.trim().toUpperCase(); // Estraiamo "SI" o "NO"

        if (!fromNumber || !body) {
            return new Response('Parametri mancanti', { status: 400 });
        }

        // 2. Troviamo il paziente usando il suo numero di telefono
        const pazienteQuery = await sql`
            SELECT id FROM pazienti WHERE telefono = ${fromNumber} LIMIT 1
        `;
        
        if (pazienteQuery.length === 0) {
            return inviaRispostaTwiML("Paziente non trovato nel sistema.");
        }
        const idPaziente = pazienteQuery[0].id;

        // 3. Cerchiamo lo slot 'in_attesa_conferma' e la rispettiva ricetta 'in_attesa'
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
            return inviaRispostaTwiML("Nessun appuntamento in attesa di conferma trovato.");
        }

        const match = matchQuery[0];
        let messaggioRisposta = "";

        // 4. Logica di Routing (Yield Management)
        if (body === 'SI') {
            // Caso Accettazione: Fissiamo l'appuntamento ed evadiamo la ricetta
            await sql`UPDATE agende SET stato_slot = 'occupato' WHERE id = ${match.id_slot}`;
            await sql`UPDATE ricette SET stato = 'evasa' WHERE id = ${match.id_ricetta}`;
            messaggioRisposta = "Appuntamento confermato con successo. Grazie!";
            
        } else if (body === 'NO') {
            // Caso Rifiuto: Liberiamo lo slot e rimettiamo in circolo la risorsa
            await sql`UPDATE agende SET stato_slot = 'libero' WHERE id = ${match.id_slot}`;
            messaggioRisposta = "Hai ceduto il turno. Rimarrai in lista per le prossime disponibilità.";
            
            // Inneschiamo di nuovo l'API di match per chiamare SUBITO il prossimo in lista
            const host = req.headers.get('host');
            const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
            fetch(`${protocol}://${host}/api/match`).catch(err => console.error("Errore re-innesco match:", err));
            
        } else {
            // Caso Errore di battitura
            messaggioRisposta = "Rispondi solo SI per confermare o NO per rifiutare.";
        }

        // 5. Restituiamo la risposta a Twilio
        return inviaRispostaTwiML(messaggioRisposta);

    } catch (error) {
        console.error("Errore nel Webhook Twilio:", error);
        return new Response('Errore interno al server', { status: 500 });
    }
}

// Helper per generare la risposta XML (TwiML) richiesta da Twilio
function inviaRispostaTwiML(messaggio: string) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${messaggio}</Message>
</Response>`;

    return new Response(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
    });
}