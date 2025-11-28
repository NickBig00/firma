import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/firma/controller/page.js';
import { CONTENT_TYPE, restURL } from '../constants.mjs';
import { Firma } from '../../../src/generated/prisma/client.js';
import { FirmaMitGeschaeftsfuehrer } from '../../../src/firma/service/firma-service.js';

// Testdaten
const geschaeftsfuehrerArray = ['a'];
const geschaeftsfuehrerNichtVorhanden = ['xererxx'];
const namen = ['AutoFuture GmbH', 'GreenFoods AG', 'TechVision GmbH'];
const umsatzMin = [8500.0, 85000.0];

// Tests für GET /rest
describe('GET /rest', () => {
    test.concurrent('Alle Firmen abrufen', async () => {
        // given

        // when
        const response = await fetch(restURL);
        const { status, headers } = response;

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<Firma>;

        body.content
            .map((firma) => firma.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent.each(geschaeftsfuehrerArray)(
        'Firmen nach Geschäftsführer-Teilnamen %s suchen',
        async (geschaeftsfuehrer) => {
            // given
            const params = new URLSearchParams({ geschaeftsfuehrer });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body =
                (await response.json()) as Page<FirmaMitGeschaeftsfuehrer>;

            expect(body).toBeDefined();

            body.content
                .map((firma) => firma.geschaeftsfuehrer)
                .forEach((g) =>
                    expect(g?.name?.toLowerCase()).toStrictEqual(
                        expect.stringContaining(geschaeftsfuehrer),
                    ),
                );
        },
    );

    test.concurrent.each(geschaeftsfuehrerNichtVorhanden)(
        'Keine Firmen bei unbekanntem Geschäftsführer-Teilnamen %s',
        async (geschaeftsfuehrer) => {
            // given
            const params = new URLSearchParams({ geschaeftsfuehrer });
            const url = `${restURL}?${params}`;

            // when
            const { status } = await fetch(url);

            // then
            expect(status).toBe(HttpStatus.NOT_FOUND);
        },
    );

    test.concurrent.each(namen)(
        'Firma mit exaktem Namen %s finden',
        async (name) => {
            // given
            const params = new URLSearchParams({ name });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Firma>;

            expect(body).toBeDefined();

            const firmen = body.content;

            expect(firmen).toHaveLength(1);

            const [firma] = firmen;
            const nameFound = firma?.name;

            expect(nameFound).toBe(name);
        },
    );

    test.concurrent.each(umsatzMin)(
        'Firmen mit Mindest-"Umsatz" %i suchen',
        async (umsatz) => {
            // given
            const params = new URLSearchParams({ umsatz: umsatz.toString() });
            const url = `${restURL}?${params}`;

            // when
            const response = await fetch(url);
            const { status, headers } = response;

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<Firma>;
            body.content
                .map((firma) => firma.umsatz)
                .forEach((r) => {
                    console.log(
                        'typeof r:',
                        typeof r,
                        'typeof umsatz:',
                        typeof umsatz,
                        r,
                        umsatz,
                    );

                    expect(Number(r)).toBeGreaterThanOrEqual(umsatz);
                });
        },
    );

    test.concurrent(
        'Keine Firmen bei unbekanntem Query-Parameter',
        async () => {
            // given
            const params = new URLSearchParams({ foo: 'bar' });
            const url = `${restURL}?${params}`;

            // when
            const { status } = await fetch(url);

            // then
            expect(status).toBe(HttpStatus.NOT_FOUND);
        },
    );
});
