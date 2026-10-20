import { neon } from '@neondatabase/serverless';

// Inizializza la connessione serverless tramite DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || '';

// Esportiamo la funzione tagged-template 'sql' per eseguire query PostgreSQL
export const sql = neon(databaseUrl);