require('dotenv').config();

const initSqlJs = require('sql.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbDir = path.resolve('../database');
const dbFile = path.join(dbDir, 'hostbygdeall.sqlite');

fs.mkdirSync(dbDir, { recursive: true });

async function main() {
    const SQL = await initSqlJs({
        locateFile: file =>
            path.join(__dirname, 'node_modules/sql.js/dist', file)
    });

    let db;

    if (fs.existsSync(dbFile)) {
        db = new SQL.Database(fs.readFileSync(dbFile));
    } else {
        db = new SQL.Database();
    }

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

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    if (!email) {
        console.error('ADMIN_EMAIL não foi definida no .env');
        process.exit(1);
    }

    const result = db.exec(
        'SELECT id FROM users WHERE email = ?',
        [email]
    );

    if (result.length === 0 || result[0].values.length === 0) {
        const password = process.env.ADMIN_PASSWORD;

        if (!password) {
            console.error('ADMIN_PASSWORD não foi definida.');
            process.exit(1);
        }

        const hash = await bcrypt.hash(password, 12);

        db.run(`
            INSERT INTO users
            (email, password_hash, name, role, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            email,
            hash,
            'Administrador',
            'super_admin',
            1,
            new Date().toISOString()
        ]);

        console.log('Administrador criado com sucesso!');
    } else {
        console.log('Administrador já existe.');
    }

    const data = db.export();
    fs.writeFileSync(dbFile, Buffer.from(data));

    db.close();

    console.log(`Banco criado em: ${dbFile}`);
}

main().catch(error => {
    console.error('Erro:', error);
    process.exit(1);
});
