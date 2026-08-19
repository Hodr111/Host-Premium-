const crypto = require('crypto');
const nodemailer = require('nodemailer');

function gerarCodigo() {
    return String(
        crypto.randomInt(100000, 1000000)
    );
}

function hashCodigo(code) {
    return crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');
}

function criarTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
}

async function enviarCodigo(email, codigo) {
    const transporter = criarTransporter();

    await transporter.sendMail({
        from: `"HostBygdeall" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Seu código de acesso — HostBygdeall',
        text: `Seu código de acesso é: ${codigo}

Esse código expira em 10 minutos.

Se você não solicitou esse código, ignore este e-mail.`,
        html: `
            <div style="font-family:Arial;background:#08090d;color:white;padding:30px">
                <div style="max-width:500px;margin:auto;background:#101116;padding:30px;border-radius:18px">
                    <h1>HOST<span style="opacity:.45">BYGDEALL</span></h1>

                    <p>Seu código de acesso é:</p>

                    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#191b22;border-radius:12px">
                        ${codigo}
                    </div>

                    <p style="color:#999">
                        O código expira em 10 minutos.
                    </p>

                    <p style="color:#777">
                        Se você não solicitou esse código, ignore este e-mail.
                    </p>
                </div>
            </div>
        `
    });
}

module.exports = {
    gerarCodigo,
    hashCodigo,
    enviarCodigo
};
