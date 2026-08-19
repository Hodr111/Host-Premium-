require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
    console.log('Testando conexão com Gmail...');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    await transporter.verify();

    console.log('SMTP conectado com sucesso!');
    console.log('Conta:', process.env.SMTP_USER);
}

main().catch(error => {
    console.error('Erro SMTP:', error.message);
    process.exit(1);
});
