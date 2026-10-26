import crypto from 'crypto';

// Chiave segreta proprietaria per salare gli hash (impedisce il reverse-engineering dei log)
const ENGINE_SECRET = process.env.DATABASE_URL || 'reverse-cup-sovereign-salt-2026';

export interface CandidatoMatch {
    id_ricetta: number;
    id_paziente: number;
    nome: string;
    telefono: string;
    priorita_clinica: number; // 1=U, 2=B, 3=D, 4=P
    data_inserimento: string | Date;
    affidabilita_score?: number; // 0-100 (Indice Bayesiano di risposta)
    distanza_km?: number; // Distanza stimata dall'ospedale
}

export interface RisultatoScoring {
    candidato: CandidatoMatch;
    dycus_score: number;
    probabilita_conversione: number;
    motivazione_algoritmo: string;
    firma_crittografica: string;
}

/**
 * MOTORE PROPRIETARIO DYCUS (Dynamic Yield & Clinical Urgency Score)
 * Calcola il rendimento clinico-economico di ogni assegnazione last-minute.
 * Eseguito esclusivamente lato server (Invisibile al client).
 */
export function calcolaClassificaDYCUS(
    candidati: CandidatoMatch[],
    dataOraSlot: string | Date,
    hashPrecedente: string = 'GENESIS_BLOCK_SSN_0000000000000000'
): RisultatoScoring[] {
    const oraAttuale = new Date().getTime();
    const oraSlot = new Date(dataOraSlot).getTime();
    
    // Ore rimanenti prima che lo slot vada sprecato (minimo 1h)
    const oreAlloSlot = Math.max(1, (oraSlot - oraAttuale) / (1000 * 60 * 60));

    // Pesi clinici non lineari (Classe 1=Urgente ha priorità strutturale)
    const pesiClinici: Record<number, number> = {
        1: 100.0, // Classe U (Urgente - 72h)
        2: 72.5,  // Classe B (Breve - 10gg)
        3: 48.0,  // Classe D (Differibile - 30/60gg)
        4: 25.0   // Classe P (Programmata)
    };

    const classificati = candidati.map((c) => {
        const pesoBase = pesiClinici[c.priorita_clinica] || 25.0;

        // 1. Fattore Aging (Degrado Temporale d'Attesa):
        // Evita lo stallo dei codici minori aumentando il punteggio col passare delle ore in lista
        const oreInAttesa = Math.max(1, (oraAttuale - new Date(c.data_inserimento).getTime()) / (1000 * 60 * 60));
        const bonusAging = Math.log1p(oreInAttesa) * 6.4;

        // 2. Indice Predittivo di Affidabilità e Risposta (Propensity Score 0.1 - 1.0)
        const affidabilita = (c.affidabilita_score ?? 88) / 100;

        // 3. Fattore di Pressione Last-Minute (Yield Urgency):
        // Se mancano meno di 12h alla visita, il peso dell'affidabilità e vicinanza raddoppia
        // per azzerare il rischio di "No-Show" (mancata presentazione).
        const urgenzaSlotMultiplier = oreAlloSlot < 12 ? 1.85 : 1.15;
        const penalitaDistanza = (c.distanza_km ?? 5) * (oreAlloSlot < 6 ? 1.8 : 0.4);

        // Formula proprietaria DYCUS
        const rawScore =
            (pesoBase + bonusAging) * (0.65 + 0.35 * affidabilita * urgenzaSlotMultiplier) -
            penalitaDistanza;

        const dycus_score = Math.round(rawScore * 100) / 100;
        const probabilita_conversione = Math.min(99, Math.round(affidabilita * (oreAlloSlot < 12 ? 92 : 98)));

        // Generazione Hash Crittografico Immutabile (HMAC-SHA256)
        const payloadCrittografico = `${hashPrecedente}|REC:${c.id_ricetta}|PAZ:${c.id_paziente}|SCORE:${dycus_score}|TTL:${Math.round(oreAlloSlot)}h`;
        const firma_crittografica = crypto
            .createHmac('sha256', ENGINE_SECRET)
            .update(payloadCrittografico)
            .digest('hex')
            .substring(0, 24)
            .toUpperCase();

        return {
            candidato: c,
            dycus_score,
            probabilita_conversione,
            motivazione_algoritmo: `Priorità RAO C${c.priorita_clinica} + Aging ${Math.round(oreInAttesa)}h | Affidabilità ${Math.round(affidabilita * 100)}% | Finestra ${Math.round(oreAlloSlot)}h`,
            firma_crittografica
        };
    });

    // Ordina per DYCUS Score decrescente (il valore clinico/economico più alto vince)
    return classificati.sort((a, b) => b.dycus_score - a.dycus_score);
}