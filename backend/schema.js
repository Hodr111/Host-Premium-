/*
 * SCHEMA / MIGRAÇÕES
 *
 * sql.js não suporta "ADD COLUMN IF NOT EXISTS", então
 * verificamos a existência da coluna antes de alterar.
 */

function columnExists(db, table, column) {
    const info = db.exec(`PRAGMA table_info(${table})`);

    if (info.length === 0) return false;

    return info[0].values.some(row => row[1] === column);
}

function ensureSchema(db) {
    // Tabelas já existentes (users, otp_codes, applications, audit_logs)
    // são criadas pelo setup-admin.js. Garantimos aqui também, para o
    // caso de banco novo criado só pelo server.js.
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            name TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            verified INTEGER NOT NULL DEFAULT 0,
            blocked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login TEXT,
            recovery_email TEXT
        );

        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used INTEGER NOT NULL DEFAULT 0,
            purpose TEXT NOT NULL DEFAULT 'login',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            path TEXT NOT NULL,
            port INTEGER,
            status TEXT DEFAULT 'offline',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            ip TEXT,
            created_at TEXT NOT NULL
        );
    `);

    // Novas colunas em users (perfil/autenticação)
    if (!columnExists(db, 'users', 'recovery_email')) {
        db.run(`ALTER TABLE users ADD COLUMN recovery_email TEXT`);
    }

    if (!columnExists(db, 'otp_codes', 'purpose')) {
        db.run(`ALTER TABLE otp_codes ADD COLUMN purpose TEXT NOT NULL DEFAULT 'login'`);
    }

    if (!columnExists(db, 'users', 'avatar_url')) {
        db.run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
    }

    if (!columnExists(db, 'users', 'pending_email')) {
        db.run(`ALTER TABLE users ADD COLUMN pending_email TEXT`);
    }

    // Tickets de suporte
    db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            subject TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'aberto',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS ticket_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            author_role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id),
            FOREIGN KEY (author_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT,
            read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS admin_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            resource TEXT,
            resource_id TEXT,
            result TEXT NOT NULL DEFAULT 'success',
            created_at TEXT NOT NULL
        );
    `);
}

module.exports = { ensureSchema, columnExists };
