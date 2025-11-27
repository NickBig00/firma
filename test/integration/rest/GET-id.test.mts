
import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { CONTENT_TYPE, IF_NONE_MATCH, restURL } from '../constants.mjs';

// Testdaten
const ids = [10, 20];
const idNichtVorhanden = 999999;
const idsETag = [10, 20];
const idFalsch = 'xy';

// Tests für GET /rest/:id
describe('GET /rest/:id', () => {
    test.concurrent.each(ids)('Firma zu vorhandener ID %i', async (id) => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const response = await fetch(url);
        const { status, headers } = response;

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as { id: number };

        expect(body.id).toBe(id);
    });

    test.concurrent('Keine Firma zu nicht-vorhandener ID', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;

        // when
        const { status } = await fetch(url);

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test.concurrent('Keine Firma bei ungültigem ID-Format', async () => {
        // given
        const url = `${restURL}/${idFalsch}`;

        // when
        const { status } = await fetch(url);

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test.concurrent.each(idsETag)(
        'Firma zu ID %i – Not Modified bei If-None-Match',
        async (id) => {
            // given
            const url = `${restURL}/${id}`;
            const headers = new Headers();
            headers.append(IF_NONE_MATCH, '"0"'); // "0" erzwingt einen Vergleich, bei dem der ETag als identisch gilt → 304

            // when
            const response = await fetch(url, { headers });
            const { status } = response;

            // then
            expect(status).toBe(HttpStatus.NOT_MODIFIED);

            const body = await response.text();

            expect(body).toBe('');
        },
    );
});
