import twilio from 'twilio';

// Recuperiamo le credenziali di Twilio dal file .env.local
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

// Inizializziamo il client Twilio
const client = twilio(accountSid, authToken);

/**
 * Invia un SMS a un numero specifico
 * @param to Numero di telefono del destinatario (incluso prefisso internazionale, es. +39...)
 * @param body Testo del messaggio
 */
export async function sendSMS(to: string, body: string) {
    try {
        const message = await client.messages.create({
            body: body,
            from: fromNumber,
            to: to
        });
        
        console.log(`SMS inviato con successo a ${to}. SID: ${message.sid}`);
        return message;
    } catch (error) {
        console.error("Errore nell'invio dell'SMS con Twilio:", error);
        throw error; // Rilanciamo l'errore per gestirlo nelle API route
    }
}