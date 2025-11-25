import { HttpStatus } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { beforeAll, describe, expect, test } from 'vitest';
import { type BuchDtoOhneRef } from '../../../src/buch/controller/buch-dto.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    PUT,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';
import { FirmaDtoOhneRef } from '../../../src/firma/controller/firma-dto.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaenderteFirma: Omit<FirmaDtoOhneRef, 'gruendungsjahr' | 'umsatz'> & {
    gruendungsjahr: number;
    umsatz: number;
} = {
    name: 'TechVision AG',
    gruendungsjahr: 2024,
    umsatz: 2500000.0,
    branche: "Softwareentwicklung/ Consulting",
    mitarbeiteranzahl: 60,
    homepage: 'https://software-gmbh.de'
};
const idVorhanden = '30';

const geaenderteFirmaIdNichtVorhanden: Omit<FirmaDtoOhneRef, 'gruendungsjahr' | 'umsatz'> & {
    gruendungsjahr: number;
    umsatz: number;
} = {
    name: 'TechVision GmbH',
    gruendungsjahr: 2024,
    umsatz: 2500000.0,
    branche: "Softwareentwicklung/ Consulting",
    mitarbeiteranzahl: 60,
    homepage: 'https://software-gmbh.de'
};
const idNichtVorhanden = '999999';

const geaenderteFirmaInvalid: Record<string, unknown> = {
    name: 'A', // zu kurz
    branche: 'vielzulangerbranchennamederfirmaistdasaufjedenfalldeinfintinininfini', // zu lang
    mitarbeiteranzahl: -2,
    homepage: 'not valid url', // keine URL
    gruendungsjahr: 1700, // zu alt
    umsatz: -1000
};

const veralteteFirma: FirmaDtoOhneRef = {
    name: 'TechVision AG',
    branche: "Softwareentwicklung/ Consulting",
    mitarbeiteranzahl: 60,
    homepage: 'https://software-gmbh.de',
    gruendungsjahr: 2022,
    umsatz: 100000
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandene Firma aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteFirma),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
    });

    test('Nicht-vorhandene Firma aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteFirmaIdNichtVorhanden),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test('Vorhandene Frima aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);
        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^gruendungsjahr /u),
            expect.stringMatching(/^homepage /u),
            expect.stringMatching(/^branche /u),
            expect.stringMatching(/^umsatz /u),
            expect.stringMatching(/^mitarbeiteranzahl /u),
        ];

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteFirmaInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);

        const body = (await response.json()) as { message: string[] };
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test('Vorhande Firma aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteFirma),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.PRECONDITION_REQUIRED);

        const body = await response.text();

        expect(body).toBe(`Header "${IF_MATCH}" fehlt`);
    });

    test('Vorhandene Firma aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"-1"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(veralteteFirma),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.PRECONDITION_FAILED);

        const { message, statusCode } = (await response.json()) as {
            message: string;
            statusCode: number;
        };

        expect(message).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(HttpStatus.PRECONDITION_FAILED);
    });

    test('Vorhandene Firma aendern, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteFirma),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Vorhandene Firma aendern, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderteFirma),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });
});
