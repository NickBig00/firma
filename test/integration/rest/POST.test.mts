import { HttpStatus } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { beforeAll, describe, expect, test } from 'vitest';
import { type FirmaDTO } from '../../../src/firma/controller/firma-dto.js';
import { FirmaService } from '../../../src/firma/service/firma-service.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neueFirma: Omit<FirmaDTO, 'gruendungsjahr' | 'umsatz'> & {
    gruendungsjahr: number;
    umsatz: number;
} = {
    name: 'Software GmbH & CO KG',
    gruendungsjahr: 2024,
    umsatz: 1500000.0,
    branche: "Softwareentwicklung",
    mitarbeiteranzahl: 30,
    homepage: 'https://software-gmbh.de',
    geschaeftsfuehrer: {
        name: 'Max Mustermann',
        email: 'max@mustermann.com',
        telefon: '123456789',
    },
    standorte: [
        {
            adresse: 'Max Muster Straße 33',
            plz: '78713',
            ort: 'Schramberg',
            land: 'Deutschland',
        },
    ]
};
const neueFirmaInvalid: Record<string, unknown> = {
    name: 'A', // zu kurz
    gruendungsjahr: 1800, // zu alt
    umsatz: -1000.0, // negativ
    branche: '',
    mitarbeiteranzahl: -5, // negativ
    homepage: 'not-a-valid-url', // keine URL
    geschaeftsfuehrer: {
        name: '', // leer
        email: 'invalid-email', // kein Email-Format
        telefon: '123', // zu kurz
    },
    standorte: [
        {
            adresse: '', // leer
            plz: '12', // zu kurz
            ort: '', // leer
            land: '', // leer
        },
    ]
};
const neueFirmaNameExistiert: FirmaDTO = {
    name: 'TechVision GmbH', // existiert bereits
    gruendungsjahr: 2020,
    umsatz: 500000.0,
    branche: "Technologie",
    mitarbeiteranzahl: 100,
    homepage: 'https://techvision.de',
    geschaeftsfuehrer: {
        name: 'petermeier',
        email: 'petermeier@gmx.de',
        telefon: '12eee3',
    },
    standorte: [
        {
            adresse: 'Beispielweg 1',
            plz: '12',
            ort: 'Stadt',
            land: 'Land',
        },
    ]
};

type MessageType = { message: string };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neue Firma', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueFirma),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(FirmaService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    test.concurrent('Neue Firma mit ungueltigen Daten', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^email /u),
            expect.stringMatching(/^gruendungsjahr /u),
            expect.stringMatching(/^homepage /u),
            expect.stringMatching(/^branche /u),
            expect.stringMatching(/^umsatz /u),
            expect.stringMatching(/^mitarbeiteranzahl /u),
            expect.stringMatching(/^geschaeftsfuehrer.name /u),
        ];

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueFirmaInvalid),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const body = (await response.json()) as MessageType;
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test.concurrent('Neue Firma, aber ohne Token', async () => {
        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueFirma),
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Neue Firma, aber mit falschem Token', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neueFirma),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent.todo('Abgelaufener Token');
});
