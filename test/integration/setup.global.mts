import { AUTHORIZATION, BEARER, POST, baseURL } from './constants.mjs';
import { getToken } from './token.mjs';

// selbst-signiertes Zertifikat beim Server
// https://nodejs.org/api/cli.html
// Alternative: "Undici" verwenden
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const dbPopulate = async (token: string) => {
    const url = `${baseURL}/dev/db_populate`;
    const headers = new Headers();
    headers.append(AUTHORIZATION, `${BEARER} ${token}`);

    const response = await fetch(url, {
        method: POST,
        headers,
    });

    const { db_populate } = (await response.json()) as { db_populate: string };
    if (db_populate !== 'success') {
        throw new Error('Fehler bei POST /dev/db_populate');
    }
    console.log('DB wurde neu geladen');
};

// https://vitest.dev/config/#globalsetup
export default async function setup() {
    const token = await getToken('admin', 'p');
    console.log(`setup: token=${token}`);
    await dbPopulate(token);
}
