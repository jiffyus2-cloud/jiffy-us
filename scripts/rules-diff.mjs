#!/usr/bin/env node
/**
 * Compara las reglas publicadas en Firebase con las de este repositorio.
 *
 * Existe porque las reglas se pueden editar desde la consola, y entonces el
 * repo deja de contar la verdad sin que nadie se entere. Este script pregunta a
 * la API de Firebase Rules qué hay publicado AHORA y lo enfrenta a
 * `firestore.rules` y `storage.rules`.
 *
 *   node scripts/rules-diff.mjs --key <ruta-al-service-account.json>
 *
 * También lee la ruta de GOOGLE_APPLICATION_CREDENTIALS o
 * FIREBASE_SERVICE_ACCOUNT_PATH. No instala nada: firma el token de acceso con
 * el módulo `crypto` de Node, para no meter una dependencia en la app por una
 * herramienta de mantenimiento.
 */

import fs from 'fs';
import crypto from 'crypto';

const RULES_API = 'https://firebaserules.googleapis.com/v1';
const SCOPE = 'https://www.googleapis.com/auth/firebase';

/** Ficheros del repo que se comparan, por servicio de reglas. */
const TRACKED = [
  { service: 'cloud.firestore', file: 'firestore.rules' },
  { service: 'firebase.storage', file: 'storage.rules' },
];

function resolveKeyPath() {
  const flagIndex = process.argv.indexOf('--key');
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) return process.argv[flagIndex + 1];
  return (
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    '../jiffy-backend/firebase-service-account.json'
  );
}

const base64url = buffer =>
  Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Token de acceso a partir de la cuenta de servicio (JWT firmado + intercambio OAuth). */
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(serviceAccount.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await response.json();
  if (!data.access_token) throw new Error(`No se pudo obtener el token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function apiGet(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} en ${url}`);
  return response.json();
}

/** Reglas publicadas de cada servicio, indexadas por prefijo de release. */
async function fetchPublishedRules(projectId, token) {
  const { releases = [] } = await apiGet(`${RULES_API}/projects/${projectId}/releases`, token);
  const published = [];

  for (const release of releases) {
    const name = release.name.split('/releases/')[1];
    const ruleset = await apiGet(`${RULES_API}/${release.rulesetName}`, token);
    for (const file of ruleset.data?.source?.files ?? ruleset.source?.files ?? []) {
      published.push({ service: name, content: file.content, updateTime: release.updateTime });
    }
  }

  return published;
}

/** Compara ignorando diferencias que no cambian el comportamiento. */
const normalize = text =>
  text
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, '').trimEnd())
    .filter(line => line.trim() !== '')
    .join('\n');

const main = async () => {
  const keyPath = resolveKeyPath();
  if (!fs.existsSync(keyPath)) {
    console.error(`No encuentro la cuenta de servicio en ${keyPath}.`);
    console.error('Pásala con --key <ruta> o define GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(2);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const token = await getAccessToken(serviceAccount);
  const published = await fetchPublishedRules(serviceAccount.project_id, token);

  let drift = false;

  for (const { service, file } of TRACKED) {
    const live = published.find(p => p.service === service || p.service.startsWith(`${service}/`));

    if (!live) {
      console.log(`⚠️  ${service}: no hay reglas publicadas.`);
      drift = true;
      continue;
    }
    if (!fs.existsSync(file)) {
      console.log(`⚠️  ${service}: publicado, pero ${file} no existe en el repo.`);
      drift = true;
      continue;
    }

    const repo = fs.readFileSync(file, 'utf8');
    if (normalize(repo) === normalize(live.content)) {
      console.log(`✅ ${service}: ${file} coincide con lo publicado (última publicación: ${live.updateTime}).`);
    } else {
      drift = true;
      console.log(`❌ ${service}: ${file} NO coincide con lo publicado (última publicación: ${live.updateTime}).`);
      const target = `${file}.live`;
      fs.writeFileSync(target, live.content, 'utf8');
      console.log(`   Lo publicado se guardó en ${target} para que puedas compararlo.`);
    }
  }

  if (drift) {
    console.log('\nSi manda el repo:  firebase deploy --only firestore:rules,storage');
    console.log('Si manda lo publicado: copia el .live encima del archivo y commitea.');
  }
  process.exit(drift ? 1 : 0);
};

main().catch(error => {
  console.error('Fallo al comparar las reglas:', error.message);
  process.exit(2);
});
