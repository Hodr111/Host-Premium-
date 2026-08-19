/*
 * Redefine a senha de um admin/super_admin existente.
 * Uso: node reset-admin-password.js email@exemplo.com NovaSenha123
 */
require('dotenv').config();
const initSqlJs = require('sql.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
    console.error('Uso: node reset-admin-password.js email@exemplo.com NovaSenha123');
    process.exit(1);
}

if (newPassword.length < 8) {
    console.error('A senha precisa ter pelo menos 8 caracteres.');
    process.exit(1);
}

const dbFile = path.resolve('../database/hostbygdeall.sqlite');

(async () => {
    const SQL = await initSqlJs({
        locateFile: f => path.join(__dirname, 'node_modules/sql.js/dist', f)
    });

    const db = new SQL.Database(fs.readFileSync(dbFile));

    const result = db.exec(
        `SELECT id, role FROM users WHERE email = ?`,
        [email.trim().toLowerCase()]
    );

    if (!result.length || !result[0].values.length) {
        console.error('Nenhum usuário encontrado com esse e-mail.');
        process.exit(1);
    }

    const [id, role] = result[0].values[0];

    if (!['admin', 'super_admin'].includes(role)) {
        console.error(`Este usuário tem função "${role}", não "admin"/"super_admin".`);
        process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 12);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);

    fs.writeFileSync(dbFile, Buffer.from(db.export()));

    console.log(`Senha redefinida para ${email} (id ${id}, role ${role}).`);
})();
