

import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/firma/controller/page.js';
import { CONTENT_TYPE, restURL } from '../constants.mjs';
import { Firma } from '../../../src/generated/prisma/client.js';
import { FirmaMitGeschaeftsfuehrer } from '../../../src/firma/service/firma-service.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geschaeftsfuehrerArray = ['a'];
const geschaeftsfuehrerNichtVorhanden = ['xererxx'];
const namen = ['AutoFuture GmbH', 'GreenFoods AG', 'TechVision GmbH'];
const umsatzMin = [8500.00, 85000.00];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GET /rest', () => {
    test.concurrent('Alle Firmen', async () => {
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
        'Firmen mit  geschaeftsfuehrer namen %s suchen',
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

            const body = (await response.json()) as Page<FirmaMitGeschaeftsfuehrer>;

            expect(body).toBeDefined();

           body.content
                .map((firma) => firma.geschaeftsfuehrer)
                .forEach((g) =>
                    expect(g?.name?.toLowerCase()).toStrictEqual(
                        expect.stringContaining(name),
                    ),
                );
        },
    );

    test.concurrent.each(geschaeftsfuehrerNichtVorhanden)(
        'Firmen zu nicht vorhandenem Teil Name %s suchen',
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

    test.concurrent.each(namen)('Firma mit Namen %s suchen', async (name) => {
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
    });

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
                console.log("typeof r:", typeof r, "typeof umsatz:", typeof umsatz, r, umsatz);

                expect(r).toBeGreaterThanOrEqual(umsatz);
        },
    );
});



    test.concurrent(
        'Keine Firmen zu einer nicht-vorhandenen Property',
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
