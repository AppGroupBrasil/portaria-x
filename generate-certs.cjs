/**
 * Gera certificados SSL auto-assinados para desenvolvimento local.
 * Usado pelo Vite (HTTPS) e pelos WebSocket servers (WSS).
 * 
 * Uso: node generate-certs.cjs
 */
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir);

const certPath = path.join(certsDir, 'cert.pem');
const keyPath = path.join(certsDir, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificados já existem em certs/');
  process.exit(0);
}

console.log('Gerando certificados SSL auto-assinados...');

const attrs = [{ name: 'commonName', value: 'Portaria X Dev' }];

(async () => {
  const pems = await selfsigned.generate(attrs, {
    algorithm: 'sha256',
    days: 365,
    keySize: 2048,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '192.168.1.30' },
          { type: 7, ip: '10.0.0.1' },
        ]
      }
    ]
  });

  console.log('Keys:', Object.keys(pems));
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.key || pems.private || pems.privateKey);
  console.log('✅ Certificados gerados em certs/cert.pem e certs/key.pem');
})();
