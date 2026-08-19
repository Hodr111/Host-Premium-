require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const initSqlJs = require('sql.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const multer = require('multer');

const {
    gerarCodigo,
    hashCodigo,
    enviarCodigo
} = require('./otp');

const { ensureSchema } = require('./schema');
const { notify, logAdminAction, publicUser } = require('./helpers');

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : true; // dev: permite qualquer origem se não configurado

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
}));

const PORT = process.env.PORT || 3000;
const DB_FILE = path.resolve('../database/hostbygdeall.sqlite');

const UPLOADS_DIR = path.resolve('../storage/avatars');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const avatarUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOADS_DIR),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${req.user.id}-${crypto.randomUUID()}${ext}`);
        }
    }),
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowed.includes(ext)) {
            return cb(new Error('Formato de imagem não suportado'));
        }

        cb(null, true);
    }
});

let db;

app.use('/uploads/avatars', express.static(UPLOADS_DIR));

function saveDatabase() {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function authRequired(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Não autenticado'
            });
        }

        const token = header.substring(7);

        req.user = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        next();
    } catch {
        res.status(401).json({
            error: 'Sessão inválida ou expirada'
        });
    }
}


function passwordSetupRequired(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Sessão de configuração inválida' });
        }

        const token = header.substring(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (payload.type !== 'password_setup') {
            return res.status(401).json({ error: 'Token de configuração inválido' });
        }

        req.setup = payload;
        next();
    } catch {
        res.status(401).json({ error: 'Token de configuração expirado ou inválido' });
    }
}

function adminRequired(req, res, next) {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            error: 'Acesso administrativo negado'
        });
    }

    next();
}

// Permite 'admin' e 'super_admin' — usado em telas de operação
// (tickets, dashboard) que não alteram permissões de usuários.
function staffRequired(req, res, next) {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            error: 'Acesso administrativo negado'
        });
    }

    next();
}

/*
 * SOLICITAR CÓDIGO
 */
async function requestCode(req, res) {
    try {
        const email = String(
            req.body.email || ''
        ).trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: 'Digite um e-mail válido'
            });
        }

        const agora = Date.now();

        const existing = db.exec(
            `SELECT id, blocked
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (
            existing.length &&
            existing[0].values.length &&
            existing[0].values[0][1]
        ) {
            return res.status(403).json({
                error: 'Esta conta está bloqueada'
            });
        }

        if (
            existing.length &&
            existing[0].values.length &&
            existing[0].values[0][0]
        ) {
            const passwordResult = db.exec(
                `SELECT password_hash FROM users WHERE email = ? LIMIT 1`,
                [email]
            );

            if (
                passwordResult.length &&
                passwordResult[0].values.length &&
                passwordResult[0].values[0][0]
            ) {
                return res.status(409).json({
                    error: 'Esta conta já tem senha. Entre com sua senha ou use “Esqueci minha senha”.'
                });
            }
        }

        /*
         * Remove códigos antigos desse e-mail.
         */
        db.run(
            `UPDATE otp_codes
             SET used = 1
             WHERE email = ? AND used = 0 AND purpose = 'login'`,
            [email]
        );

        const codigo = gerarCodigo();
        const codigoHash = hashCodigo(codigo);

        const criado = new Date(agora);
        const expiracao = new Date(
            agora + 10 * 60 * 1000
        );

        db.run(`
            INSERT INTO otp_codes
            (email, code_hash, expires_at, attempts, used, purpose, created_at)
            VALUES (?, ?, ?, 0, 0, 'login', ?)
        `, [
            email,
            codigoHash,
            expiracao.toISOString(),
            criado.toISOString()
        ]);

        saveDatabase();

        await enviarCodigo(email, codigo);

        res.json({
            success: true,
            message: 'Código enviado para seu e-mail'
        });

    } catch (error) {
        console.error('OTP:', error);

        res.status(500).json({
            error: 'Não foi possível enviar o código'
        });
    }
}

/*
 * VERIFICAR CÓDIGO
 */
async function verifyCode(req, res) {
    try {
        const email = String(
            req.body.email || ''
        ).trim().toLowerCase();

        const code = String(
            req.body.code || ''
        ).trim();

        if (!email || !/^\d{6}$/.test(code)) {
            return res.status(400).json({
                error: 'E-mail ou código inválido'
            });
        }

        const result = db.exec(
            `SELECT id, code_hash, expires_at, attempts
             FROM otp_codes
             WHERE email = ?
               AND used = 0
               AND purpose = 'login'
             ORDER BY id DESC
             LIMIT 1`,
            [email]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(400).json({
                error: 'Código não encontrado ou expirado'
            });
        }

        const row = result[0].values[0];

        const otpId = row[0];
        const codeHash = row[1];
        const expiresAt = row[2];
        const attempts = row[3];

        if (Date.now() > new Date(expiresAt).getTime()) {
            db.run(
                'UPDATE otp_codes SET used = 1 WHERE id = ?',
                [otpId]
            );

            saveDatabase();

            return res.status(400).json({
                error: 'Código expirado'
            });
        }

        if (attempts >= 5) {
            db.run(
                'UPDATE otp_codes SET used = 1 WHERE id = ?',
                [otpId]
            );

            saveDatabase();

            return res.status(429).json({
                error: 'Número máximo de tentativas atingido'
            });
        }

        const submittedHash = hashCodigo(code);

        if (
            !crypto.timingSafeEqual(
                Buffer.from(codeHash),
                Buffer.from(submittedHash)
            )
        ) {
            db.run(
                `UPDATE otp_codes
                 SET attempts = attempts + 1
                 WHERE id = ?`,
                [otpId]
            );

            saveDatabase();

            return res.status(401).json({
                error: 'Código incorreto'
            });
        }

        db.run(
            'UPDATE otp_codes SET used = 1 WHERE id = ?',
            [otpId]
        );

        /*
         * Cria o usuário se ainda não existir.
         */
        let userResult = db.exec(
            `SELECT id,email,name,role,blocked
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        let user;

        if (
            userResult.length === 0 ||
            userResult[0].values.length === 0
        ) {
            db.run(`
                INSERT INTO users
                (email, name, role, verified, blocked, created_at)
                VALUES (?, ?, 'user', 1, 0, ?)
            `, [
                email,
                email.split('@')[0],
                new Date().toISOString()
            ]);

            userResult = db.exec(
                `SELECT id,email,name,role,blocked
                 FROM users
                 WHERE email = ?
                 LIMIT 1`,
                [email]
            );
        }

        const values = userResult[0].values[0];

        user = {
            id: values[0],
            email: values[1],
            name: values[2],
            role: values[3],
            blocked: Boolean(values[4])
        };

        if (user.blocked) {
            return res.status(403).json({
                error: 'Esta conta está bloqueada'
            });
        }

        db.run(
            `UPDATE users
             SET last_login = ?, verified = 1
             WHERE id = ?`,
            [
                new Date().toISOString(),
                user.id
            ]
        );

        db.run(
            `INSERT INTO audit_logs
             (user_id, action, created_at)
             VALUES (?, ?, ?)`,
            [
                user.id,
                'otp_login',
                new Date().toISOString()
            ]
        );

        saveDatabase();

        const setupToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                type: 'password_setup'
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '15m'
            }
        );

        res.json({
            success: true,
            setup_required: true,
            setup_token: setupToken,
            user
        });

    } catch (error) {
        console.error('VERIFY OTP:', error);

        res.status(500).json({
            error: 'Erro ao verificar código'
        });
    }
}


/*
 * LOGIN NORMAL POR E-MAIL + SENHA
 */
async function userLogin(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        }

        const result = db.exec(
            `SELECT id,email,password_hash,name,role,blocked
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos' });
        }

        const row = result[0].values[0];
        const [id, userEmail, passwordHash, name, role, blocked] = row;

        if (blocked) {
            return res.status(403).json({ error: 'Esta conta está bloqueada' });
        }

        if (!passwordHash) {
            return res.status(409).json({
                error: 'Esta conta ainda não tem senha. Use “Criar conta” para receber o código no seu e-mail.'
            });
        }

        const valid = await bcrypt.compare(password, passwordHash);

        if (!valid) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos' });
        }

        db.run(
            `UPDATE users SET last_login = ?, verified = 1 WHERE id = ?`,
            [new Date().toISOString(), id]
        );

        db.run(
            `INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)`,
            [id, 'password_login', new Date().toISOString()]
        );

        saveDatabase();

        const token = jwt.sign(
            { id, email: userEmail, role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id,
                email: userEmail,
                name,
                role,
                blocked: Boolean(blocked)
            }
        });
    } catch (error) {
        console.error('USER LOGIN:', error);
        res.status(500).json({ error: 'Não foi possível entrar' });
    }
}

/*
 * CRIAR SENHA APÓS O PRIMEIRO CÓDIGO
 */
async function setInitialPassword(req, res) {
    try {
        const password = String(req.body.password || '');
        const recoveryEmail = String(req.body.recovery_email || '').trim().toLowerCase();
        const userId = Number(req.setup.id);

        if (password.length < 8) {
            return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
            return res.status(400).json({ error: 'Digite um Gmail/e-mail de recuperação válido' });
        }

        const result = db.exec(
            `SELECT id,email,password_hash,name,role,blocked FROM users WHERE id = ? LIMIT 1`,
            [userId]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        const row = result[0].values[0];

        if (row[5]) {
            return res.status(403).json({ error: 'Esta conta está bloqueada' });
        }

        if (row[2]) {
            return res.status(409).json({ error: 'Esta conta já possui uma senha' });
        }

        const hash = await bcrypt.hash(password, 12);

        db.run(
            `UPDATE users
             SET password_hash = ?, recovery_email = ?, verified = 1
             WHERE id = ?`,
            [hash, recoveryEmail, userId]
        );

        db.run(
            `INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)`,
            [userId, 'password_created', new Date().toISOString()]
        );

        saveDatabase();

        const token = jwt.sign(
            {
                id: userId,
                email: row[1],
                role: row[4]
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: userId,
                email: row[1],
                name: null,
                role: 'user',
                blocked: false
            }
        });
    } catch (error) {
        console.error('SET INITIAL PASSWORD:', error);
        res.status(500).json({ error: 'Não foi possível criar sua senha' });
    }
}

/*
 * ESQUECI A SENHA — envia código ao e-mail de recuperação
 */
async function requestPasswordReset(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Digite um e-mail válido' });
        }

        const result = db.exec(
            `SELECT id,blocked,recovery_email FROM users WHERE email = ? LIMIT 1`,
            [email]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(404).json({ error: 'Não encontramos uma conta com esse e-mail' });
        }

        const [userId, blocked, recoveryEmail] = result[0].values[0];

        if (blocked) {
            return res.status(403).json({ error: 'Esta conta está bloqueada' });
        }

        if (!recoveryEmail) {
            return res.status(400).json({
                error: 'Esta conta não possui e-mail de recuperação cadastrado'
            });
        }

        db.run(
            `UPDATE otp_codes SET used = 1
             WHERE email = ? AND used = 0 AND purpose = 'reset'`,
            [email]
        );

        const codigo = gerarCodigo();
        const codigoHash = hashCodigo(codigo);
        const agora = Date.now();

        db.run(
            `INSERT INTO otp_codes
             (email, code_hash, expires_at, attempts, used, purpose, created_at)
             VALUES (?, ?, ?, 0, 0, 'reset', ?)`,
            [
                email,
                codigoHash,
                new Date(agora + 10 * 60 * 1000).toISOString(),
                new Date(agora).toISOString()
            ]
        );

        saveDatabase();

        await enviarCodigo(recoveryEmail, codigo);

        res.json({
            success: true,
            message: 'Código enviado para o seu e-mail de recuperação',
            recovery_hint: recoveryEmail.replace(/^(.{2}).*(@.*)$/, '$1***$2')
        });
    } catch (error) {
        console.error('PASSWORD RESET REQUEST:', error);
        res.status(500).json({ error: 'Não foi possível enviar o código de recuperação' });
    }
}

/*
 * REDEFINIR SENHA COM CÓDIGO DE RECUPERAÇÃO
 */
async function resetPassword(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const code = String(req.body.code || '').trim();
        const password = String(req.body.password || '');

        if (!email || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ error: 'E-mail ou código inválido' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres' });
        }

        const result = db.exec(
            `SELECT id,code_hash,expires_at,attempts
             FROM otp_codes
             WHERE email = ? AND used = 0 AND purpose = 'reset'
             ORDER BY id DESC LIMIT 1`,
            [email]
        );

        if (!result.length || !result[0].values.length) {
            return res.status(400).json({ error: 'Código não encontrado ou expirado' });
        }

        const [otpId, codeHash, expiresAt, attempts] = result[0].values[0];

        if (Date.now() > new Date(expiresAt).getTime()) {
            db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpId]);
            saveDatabase();
            return res.status(400).json({ error: 'Código expirado' });
        }

        if (attempts >= 5) {
            db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpId]);
            saveDatabase();
            return res.status(429).json({ error: 'Número máximo de tentativas atingido' });
        }

        const submittedHash = hashCodigo(code);

        if (
            !crypto.timingSafeEqual(
                Buffer.from(codeHash),
                Buffer.from(submittedHash)
            )
        ) {
            db.run('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otpId]);
            saveDatabase();
            return res.status(401).json({ error: 'Código incorreto' });
        }

        const userResult = db.exec(
            `SELECT id,email,name,role,blocked FROM users WHERE email = ? LIMIT 1`,
            [email]
        );

        if (!userResult.length || !userResult[0].values.length) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        const [userId, userEmail, name, role, blocked] = userResult[0].values[0];

        if (blocked) {
            return res.status(403).json({ error: 'Esta conta está bloqueada' });
        }

        const hash = await bcrypt.hash(password, 12);

        db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpId]);
        db.run(
            `UPDATE users SET password_hash = ?, last_login = ?, verified = 1 WHERE id = ?`,
            [hash, new Date().toISOString(), userId]
        );

        db.run(
            `INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)`,
            [userId, 'password_reset', new Date().toISOString()]
        );

        saveDatabase();

        const token = jwt.sign(
            { id: userId, email: userEmail, role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: userId,
                email: userEmail,
                name,
                role,
                blocked: Boolean(blocked)
            }
        });
    } catch (error) {
        console.error('PASSWORD RESET:', error);
        res.status(500).json({ error: 'Não foi possível redefinir sua senha' });
    }
}

/*
 * LOGIN ADMIN
 */
async function adminLogin(req, res) {
    try {
        const email = String(
            req.body.email || ''
        ).trim().toLowerCase();

        const password = String(
            req.body.password || ''
        );

        if (!email || !password) {
            return res.status(400).json({
                error: 'E-mail e senha são obrigatórios'
            });
        }

        const result = db.exec(
            `SELECT id,email,password_hash,name,role,blocked
             FROM users
             WHERE email = ?
               AND role IN ('admin', 'super_admin')
             LIMIT 1`,
            [email]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(401).json({
                error: 'E-mail ou senha inválidos'
            });
        }

        const row = result[0].values[0];

        const id = row[0];
        const userEmail = row[1];
        const passwordHash = row[2];
        const name = row[3];
        const role = row[4];
        const blocked = row[5];

        if (blocked) {
            return res.status(403).json({
                error: 'Administrador bloqueado'
            });
        }

        if (!passwordHash) {
            // Conta promovida a admin/super_admin mas sem senha
            // definida ainda (usuários comuns entram só por OTP).
            return res.status(401).json({
                error: 'Esta conta ainda não tem senha de administrador configurada'
            });
        }

        const valid = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!valid) {
            return res.status(401).json({
                error: 'E-mail ou senha inválidos'
            });
        }

        const token = jwt.sign(
            {
                id,
                email: userEmail,
                role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        db.run(
            `UPDATE users
             SET last_login = ?
             WHERE id = ?`,
            [
                new Date().toISOString(),
                id
            ]
        );

        db.run(
            `INSERT INTO audit_logs
             (user_id, action, created_at)
             VALUES (?, ?, ?)`,
            [
                id,
                'admin_login',
                new Date().toISOString()
            ]
        );

        saveDatabase();

        res.json({
            success: true,
            token,
            user: {
                id,
                email: userEmail,
                name,
                role
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
}

/*
 * ================= PERFIL =================
 */

function getUserRow(id) {
    const result = db.exec(
        `SELECT id,email,name,role,verified,blocked,created_at,last_login,avatar_url
         FROM users WHERE id = ? LIMIT 1`,
        [id]
    );

    if (result.length === 0 || result[0].values.length === 0) return null;

    return publicUser(result[0].values[0]);
}

function meSummary(req, res) {
    const ticketsOpen = db.exec(
        `SELECT COUNT(*) FROM tickets WHERE user_id = ? AND status NOT IN ('resolvido','fechado')`,
        [req.user.id]
    );
    const servicesTotal = db.exec(
        `SELECT COUNT(*) FROM applications WHERE user_id = ?`,
        [req.user.id]
    );

    res.json({
        summary: {
            tickets_open: ticketsOpen.length ? ticketsOpen[0].values[0][0] : 0,
            services_total: servicesTotal.length ? servicesTotal[0].values[0][0] : 0
        }
    });
}

function me(req, res) {
    const user = getUserRow(req.user.id);

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json({ user });
}

function updateMe(req, res) {
    const name = String(req.body.name || '').trim();

    if (!name || name.length > 80) {
        return res.status(400).json({ error: 'Nome inválido' });
    }

    db.run('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
    saveDatabase();

    res.json({ success: true, user: getUserRow(req.user.id) });
}

function uploadAvatar(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const url = `/uploads/avatars/${req.file.filename}`;

    db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
    saveDatabase();

    res.json({ success: true, avatar_url: url });
}

/*
 * Troca de e-mail: exige verificação por código no e-mail NOVO
 * antes de aplicar a troca. Reaproveita a tabela otp_codes usando
 * um prefixo especial no campo email para não colidir com login.
 */
async function requestEmailChange(req, res) {
    const newEmail = String(req.body.new_email || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ error: 'Digite um e-mail válido' });
    }

    const existing = db.exec('SELECT id FROM users WHERE email = ?', [newEmail]);

    if (existing.length && existing[0].values.length) {
        return res.status(409).json({ error: 'Este e-mail já está em uso' });
    }

    const scopedKey = `change:${req.user.id}:${newEmail}`;
    const codigo = gerarCodigo();
    const codigoHash = hashCodigo(codigo);
    const expiracao = new Date(Date.now() + 10 * 60 * 1000);

    db.run(
        `UPDATE otp_codes SET used = 1 WHERE email = ? AND used = 0`,
        [scopedKey]
    );

    db.run(`
        INSERT INTO otp_codes (email, code_hash, expires_at, attempts, used, created_at)
        VALUES (?, ?, ?, 0, 0, ?)
    `, [scopedKey, codigoHash, expiracao.toISOString(), new Date().toISOString()]);

    db.run('UPDATE users SET pending_email = ? WHERE id = ?', [newEmail, req.user.id]);

    saveDatabase();

    await enviarCodigo(newEmail, codigo);

    res.json({ success: true, message: 'Código enviado para o novo e-mail' });
}

function confirmEmailChange(req, res) {
    const code = String(req.body.code || '').trim();

    const userRow = db.exec('SELECT pending_email FROM users WHERE id = ?', [req.user.id]);

    if (!userRow.length || !userRow[0].values[0][0]) {
        return res.status(400).json({ error: 'Nenhuma troca de e-mail pendente' });
    }

    const newEmail = userRow[0].values[0][0];
    const scopedKey = `change:${req.user.id}:${newEmail}`;

    const result = db.exec(
        `SELECT id, code_hash, expires_at, attempts FROM otp_codes
         WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1`,
        [scopedKey]
    );

    if (!result.length || !result[0].values.length) {
        return res.status(400).json({ error: 'Código não encontrado ou expirado' });
    }

    const [otpId, codeHash, expiresAt, attempts] = result[0].values[0];

    if (Date.now() > new Date(expiresAt).getTime()) {
        db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpId]);
        saveDatabase();
        return res.status(400).json({ error: 'Código expirado' });
    }

    if (attempts >= 5) {
        return res.status(429).json({ error: 'Número máximo de tentativas atingido' });
    }

    if (!crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hashCodigo(code)))) {
        db.run('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otpId]);
        saveDatabase();
        return res.status(401).json({ error: 'Código incorreto' });
    }

    db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpId]);
    db.run('UPDATE users SET email = ?, pending_email = NULL WHERE id = ?', [newEmail, req.user.id]);

    db.run(
        `INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)`,
        [req.user.id, 'email_changed', new Date().toISOString()]
    );

    saveDatabase();

    res.json({ success: true, user: getUserRow(req.user.id) });
}

/*
 * ================= TICKETS (USUÁRIO) =================
 */

const TICKET_CATEGORIES = ['Conta', 'Hospedagem', 'Site', 'Domínio', 'Pagamento', 'Erro técnico', 'Outro'];
const TICKET_STATUSES = ['aberto', 'em_atendimento', 'aguardando_usuario', 'resolvido', 'fechado'];

function createTicket(req, res) {
    const category = String(req.body.category || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();

    if (!TICKET_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Categoria inválida' });
    }

    if (!subject || subject.length > 150) {
        return res.status(400).json({ error: 'Assunto inválido' });
    }

    if (!message || message.length > 5000) {
        return res.status(400).json({ error: 'Mensagem inválida' });
    }

    const now = new Date().toISOString();

    db.run(
        `INSERT INTO tickets (user_id, category, subject, status, created_at, updated_at)
         VALUES (?, ?, ?, 'aberto', ?, ?)`,
        [req.user.id, category, subject, now, now]
    );

    const idResult = db.exec('SELECT last_insert_rowid()');
    const ticketId = idResult[0].values[0][0];

    db.run(
        `INSERT INTO ticket_messages (ticket_id, author_id, author_role, message, created_at)
         VALUES (?, ?, 'user', ?, ?)`,
        [ticketId, req.user.id, message, now]
    );

    saveDatabase();

    res.status(201).json({ success: true, ticket_id: ticketId });
}

function listMyTickets(req, res) {
    const result = db.exec(
        `SELECT id, category, subject, status, created_at, updated_at
         FROM tickets WHERE user_id = ? ORDER BY updated_at DESC`,
        [req.user.id]
    );

    const tickets = result.length ? result[0].values.map(r => ({
        id: r[0], category: r[1], subject: r[2], status: r[3], created_at: r[4], updated_at: r[5]
    })) : [];

    res.json({ tickets });
}

function getTicketMessages(ticketId) {
    const result = db.exec(
        `SELECT tm.id, tm.author_id, tm.author_role, tm.message, tm.created_at, u.name
         FROM ticket_messages tm
         JOIN users u ON u.id = tm.author_id
         WHERE tm.ticket_id = ?
         ORDER BY tm.id ASC`,
        [ticketId]
    );

    return result.length ? result[0].values.map(r => ({
        id: r[0], author_id: r[1], author_role: r[2], message: r[3], created_at: r[4], author_name: r[5]
    })) : [];
}

function getMyTicket(req, res) {
    const ticketId = Number(req.params.id);

    const result = db.exec(
        `SELECT id, category, subject, status, created_at, updated_at
         FROM tickets WHERE id = ? AND user_id = ? LIMIT 1`,
        [ticketId, req.user.id]
    );

    if (!result.length || !result[0].values.length) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const [id, category, subject, status, created_at, updated_at] = result[0].values[0];

    res.json({
        ticket: { id, category, subject, status, created_at, updated_at },
        messages: getTicketMessages(ticketId)
    });
}

function replyMyTicket(req, res) {
    const ticketId = Number(req.params.id);
    const message = String(req.body.message || '').trim();

    if (!message || message.length > 5000) {
        return res.status(400).json({ error: 'Mensagem inválida' });
    }

    const ticket = db.exec(
        `SELECT status FROM tickets WHERE id = ? AND user_id = ?`,
        [ticketId, req.user.id]
    );

    if (!ticket.length || !ticket[0].values.length) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    if (ticket[0].values[0][0] === 'fechado') {
        return res.status(400).json({ error: 'Este chamado está fechado' });
    }

    const now = new Date().toISOString();

    db.run(
        `INSERT INTO ticket_messages (ticket_id, author_id, author_role, message, created_at)
         VALUES (?, ?, 'user', ?, ?)`,
        [ticketId, req.user.id, message, now]
    );

    db.run(
        `UPDATE tickets SET status = 'aberto', updated_at = ? WHERE id = ?`,
        [now, ticketId]
    );

    saveDatabase();

    res.json({ success: true });
}

function closeMyTicket(req, res) {
    const ticketId = Number(req.params.id);

    const result = db.run(
        `UPDATE tickets SET status = 'fechado', updated_at = ?
         WHERE id = ? AND user_id = ?`,
        [new Date().toISOString(), ticketId, req.user.id]
    );

    saveDatabase();

    res.json({ success: true });
}

/*
 * ================= TICKETS (ADMIN) =================
 */

function adminListTickets(req, res) {
    const statusFilter = req.query.status;
    const search = req.query.q ? `%${String(req.query.q).trim()}%` : null;

    let sql = `
        SELECT t.id, t.category, t.subject, t.status, t.created_at, t.updated_at,
               u.id, u.name, u.email
        FROM tickets t
        JOIN users u ON u.id = t.user_id
        WHERE 1=1
    `;
    const params = [];

    if (statusFilter && TICKET_STATUSES.includes(statusFilter)) {
        sql += ' AND t.status = ?';
        params.push(statusFilter);
    }

    if (search) {
        sql += ' AND (t.subject LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
        params.push(search, search, search);
    }

    sql += ' ORDER BY t.updated_at DESC';

    const result = db.exec(sql, params);

    const tickets = result.length ? result[0].values.map(r => ({
        id: r[0], category: r[1], subject: r[2], status: r[3],
        created_at: r[4], updated_at: r[5],
        user: { id: r[6], name: r[7], email: r[8] } // e-mail visível só para admin
    })) : [];

    res.json({ tickets });
}

function adminGetTicket(req, res) {
    const ticketId = Number(req.params.id);

    const result = db.exec(`
        SELECT t.id, t.category, t.subject, t.status, t.created_at, t.updated_at,
               u.id, u.name, u.email, u.created_at, u.last_login
        FROM tickets t
        JOIN users u ON u.id = t.user_id
        WHERE t.id = ? LIMIT 1
    `, [ticketId]);

    if (!result.length || !result[0].values.length) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const r = result[0].values[0];

    res.json({
        ticket: {
            id: r[0], category: r[1], subject: r[2], status: r[3],
            created_at: r[4], updated_at: r[5],
            user: { id: r[6], name: r[7], email: r[8], created_at: r[9], last_login: r[10] }
        },
        messages: getTicketMessages(ticketId)
    });
}

function adminReplyTicket(req, res) {
    const ticketId = Number(req.params.id);
    const message = String(req.body.message || '').trim();

    if (!message || message.length > 5000) {
        return res.status(400).json({ error: 'Mensagem inválida' });
    }

    const ticket = db.exec('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);

    if (!ticket.length || !ticket[0].values.length) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const ownerId = ticket[0].values[0][0];
    const now = new Date().toISOString();

    db.run(
        `INSERT INTO ticket_messages (ticket_id, author_id, author_role, message, created_at)
         VALUES (?, ?, 'admin', ?, ?)`,
        [ticketId, req.user.id, message, now]
    );

    db.run(
        `UPDATE tickets SET status = 'aguardando_usuario', updated_at = ? WHERE id = ?`,
        [now, ticketId]
    );

    notify(db, ownerId, 'ticket_reply', 'Novo retorno no seu chamado', message.slice(0, 140));
    logAdminAction(db, req.user.id, 'ticket_reply', 'ticket', ticketId);

    saveDatabase();

    res.json({ success: true });
}

function adminUpdateTicketStatus(req, res) {
    const ticketId = Number(req.params.id);
    const status = String(req.body.status || '');

    if (!TICKET_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }

    const ticket = db.exec('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);

    if (!ticket.length || !ticket[0].values.length) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const ownerId = ticket[0].values[0][0];

    db.run(
        `UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`,
        [status, new Date().toISOString(), ticketId]
    );

    notify(db, ownerId, 'ticket_status', 'Status do chamado atualizado', status);
    logAdminAction(db, req.user.id, 'ticket_status_change', 'ticket', ticketId);

    saveDatabase();

    res.json({ success: true });
}

/*
 * ================= NOTIFICAÇÕES =================
 */

function listMyNotifications(req, res) {
    const result = db.exec(
        `SELECT id, type, title, message, read, created_at
         FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
        [req.user.id]
    );

    const items = result.length ? result[0].values.map(r => ({
        id: r[0], type: r[1], title: r[2], message: r[3], read: Boolean(r[4]), created_at: r[5]
    })) : [];

    res.json({ notifications: items });
}

function markNotificationRead(req, res) {
    db.run(
        'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
        [Number(req.params.id), req.user.id]
    );

    saveDatabase();

    res.json({ success: true });
}

/*
 * ================= ADMIN: DASHBOARD E USUÁRIOS =================
 */

function scalar(sql, params = []) {
    const result = db.exec(sql, params);

    if (!result.length || !result[0].values.length) return 0;

    return result[0].values[0][0];
}

function adminStats(req, res) {
    res.json({
        stats: {
            users_total: scalar('SELECT COUNT(*) FROM users'),
            users_verified: scalar('SELECT COUNT(*) FROM users WHERE verified = 1'),
            users_blocked: scalar('SELECT COUNT(*) FROM users WHERE blocked = 1'),
            services_total: scalar('SELECT COUNT(*) FROM applications'),
            services_online: scalar(`SELECT COUNT(*) FROM applications WHERE status = 'online'`),
            tickets_open: scalar(`SELECT COUNT(*) FROM tickets WHERE status IN ('aberto','em_atendimento')`),
            tickets_pending: scalar(`SELECT COUNT(*) FROM tickets WHERE status = 'aguardando_usuario'`),
            tickets_total: scalar('SELECT COUNT(*) FROM tickets')
        }
    });
}

function adminUserBlock(req, res) {
    const userId = Number(req.params.id);
    const blocked = req.body.blocked ? 1 : 0;

    if (userId === req.user.id) {
        return res.status(400).json({ error: 'Você não pode bloquear a própria conta' });
    }

    db.run('UPDATE users SET blocked = ? WHERE id = ?', [blocked, userId]);

    logAdminAction(db, req.user.id, blocked ? 'user_block' : 'user_unblock', 'user', userId);

    saveDatabase();

    res.json({ success: true });
}

function adminUserRole(req, res) {
    const userId = Number(req.params.id);
    const role = String(req.body.role || '');

    if (!['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ error: 'Função inválida' });
    }

    if (userId === req.user.id) {
        return res.status(400).json({ error: 'Você não pode alterar a própria função' });
    }

    db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    logAdminAction(db, req.user.id, 'user_role_change', 'user', userId, role);

    saveDatabase();

    res.json({ success: true });
}

// Ao promover alguém a admin/super_admin, a conta precisa de uma senha
// (login administrativo usa senha, não OTP). Só super_admin pode definir.
async function adminSetPassword(req, res) {
    const userId = Number(req.params.id);
    const password = String(req.body.password || '');

    if (password.length < 8) {
        return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres' });
    }

    const target = db.exec('SELECT role FROM users WHERE id = ?', [userId]);

    if (!target.length || !target[0].values.length) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!['admin', 'super_admin'].includes(target[0].values[0][0])) {
        return res.status(400).json({ error: 'Defina senha apenas para contas admin ou super_admin' });
    }

    const hash = await bcrypt.hash(password, 12);

    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    logAdminAction(db, req.user.id, 'admin_password_set', 'user', userId);

    saveDatabase();

    res.json({ success: true });
}

// E-mail privado: só o próprio admin autenticado enxerga via este endpoint.
function adminGetUserDetail(req, res) {
    const userId = Number(req.params.id);
    const user = getUserRow(userId);

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const tickets = db.exec(
        `SELECT id, subject, status, updated_at FROM tickets WHERE user_id = ? ORDER BY updated_at DESC`,
        [userId]
    );

    const services = db.exec(
        `SELECT id, name, type, status FROM applications WHERE user_id = ?`,
        [userId]
    );

    res.json({
        user,
        tickets: tickets.length ? tickets[0].values.map(r => ({
            id: r[0], subject: r[1], status: r[2], updated_at: r[3]
        })) : [],
        services: services.length ? services[0].values.map(r => ({
            id: r[0], name: r[1], type: r[2], status: r[3]
        })) : []
    });
}

async function start() {
    const SQL = await initSqlJs({
        locateFile: file =>
            path.join(
                __dirname,
                'node_modules/sql.js/dist',
                file
            )
    });

    db = new SQL.Database(
        fs.readFileSync(DB_FILE)
    );

    ensureSchema(db);
    saveDatabase();

    app.get('/api/health', (req, res) => {
        res.json({
            ok: true,
            service: 'HostBygdeall',
            version: '0.3.0',
            status: 'online'
        });
    });

    app.post(
        '/api/admin/login',
        adminLogin
    );

    app.post(
        '/api/auth/request-code',
        requestCode
    );

    app.post(
        '/api/auth/verify-code',
        verifyCode
    );

    app.post(
        '/api/auth/login',
        userLogin
    );

    app.post(
        '/api/auth/set-initial-password',
        passwordSetupRequired,
        setInitialPassword
    );

    app.post(
        '/api/auth/request-reset',
        requestPasswordReset
    );

    app.post(
        '/api/auth/reset-password',
        resetPassword
    );

    app.get(
        '/api/admin/me',
        authRequired,
        adminRequired,
        (req, res) => {
            res.json({
                authenticated: true,
                user: req.user
            });
        }
    );

    app.get(
        '/api/admin/users',
        authRequired,
        staffRequired,
        (req, res) => {
            const result = db.exec(`
                SELECT
                    id,
                    email,
                    name,
                    role,
                    verified,
                    blocked,
                    created_at,
                    last_login
                FROM users
                ORDER BY id DESC
            `);

            const users = [];

            if (result.length > 0) {
                for (const row of result[0].values) {
                    users.push({
                        id: row[0],
                        email: row[1],
                        name: row[2],
                        role: row[3],
                        verified: Boolean(row[4]),
                        blocked: Boolean(row[5]),
                        created_at: row[6],
                        last_login: row[7]
                    });
                }
            }

            res.json({ users });
        }
    );

    // ---- Perfil ----
    app.get('/api/me', authRequired, me);
    app.get('/api/me/summary', authRequired, meSummary);
    app.put('/api/me', authRequired, updateMe);
    app.post('/api/me/avatar', authRequired, avatarUpload.single('avatar'), uploadAvatar);
    app.post('/api/me/email/request-change', authRequired, requestEmailChange);
    app.post('/api/me/email/confirm-change', authRequired, confirmEmailChange);

    // ---- Notificações ----
    app.get('/api/me/notifications', authRequired, listMyNotifications);
    app.post('/api/me/notifications/:id/read', authRequired, markNotificationRead);

    // ---- Tickets (usuário) ----
    app.get('/api/tickets/meta', authRequired, (req, res) => {
        res.json({ categories: TICKET_CATEGORIES, statuses: TICKET_STATUSES });
    });
    app.post('/api/tickets', authRequired, createTicket);
    app.get('/api/tickets', authRequired, listMyTickets);
    app.get('/api/tickets/:id', authRequired, getMyTicket);
    app.post('/api/tickets/:id/messages', authRequired, replyMyTicket);
    app.post('/api/tickets/:id/close', authRequired, closeMyTicket);

    // ---- Admin: dashboard ----
    app.get('/api/admin/stats', authRequired, staffRequired, adminStats);

    // ---- Admin: usuários ----
    app.get('/api/admin/users/:id', authRequired, staffRequired, adminGetUserDetail);
    app.patch('/api/admin/users/:id/block', authRequired, adminRequired, adminUserBlock);
    app.patch('/api/admin/users/:id/role', authRequired, adminRequired, adminUserRole);
    app.post('/api/admin/users/:id/set-password', authRequired, adminRequired, adminSetPassword);

    // ---- Admin: tickets ----
    app.get('/api/admin/tickets', authRequired, staffRequired, adminListTickets);
    app.get('/api/admin/tickets/:id', authRequired, staffRequired, adminGetTicket);
    app.post('/api/admin/tickets/:id/messages', authRequired, staffRequired, adminReplyTicket);
    app.patch('/api/admin/tickets/:id/status', authRequired, staffRequired, adminUpdateTicketStatus);

    // Erro de upload (multer) formatado como JSON
    app.use((err, req, res, next) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Erro na requisição' });
        }
        next();
    });

    app.listen(
        PORT,
        '0.0.0.0',
        () => {
            console.log('');
            console.log('================================');
            console.log('        HOST BYGDEALL');
            console.log('================================');
            console.log(`Servidor: http://127.0.0.1:${PORT}`);
            console.log('Status: ONLINE');
            console.log('OTP: ATIVO');
            console.log('================================');
        }
    );
}

start().catch(error => {
    console.error('Falha ao iniciar:', error);
    process.exit(1);
});
