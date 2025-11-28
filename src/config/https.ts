/**
 * Das Modul enthält die Konfiguration für den _Node_-basierten Server.
 * @packageDocumentation
 */

import { type HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { RESOURCES_DIR } from './app.js';

// https://nodejs.org/api/path.html
// https://nodejs.org/api/fs.html
// http://2ality.com/2017/11/import-meta.html

const tlsDir = path.resolve(RESOURCES_DIR, 'tls');
console.debug('tlsDir = %s', tlsDir);

// public/private keys und Zertifikat fuer TLS
export const httpsOptions: HttpsOptions = {
    key: await readFile(path.resolve(tlsDir, 'key.pem')), // eslint-disable-line security/detect-non-literal-fs-filename
    cert: await readFile(path.resolve(tlsDir, 'certificate.crt')), // eslint-disable-line security/detect-non-literal-fs-filename
};
