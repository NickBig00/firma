/**
 * Das Modul besteht aus der Klasse {@linkcode WhereBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { Firmaart, Prisma } from '../../generated/prisma/client.js';
import { type FirmaWhereInput } from '../../generated/prisma/models/Firma.js';
import { getLogger } from '../../logger/logger.js';
import { type Suchparameter } from './suchparameter.js';

/** Typdefinitionen für die Suche mit der Firma-ID. */
export type BuildIdParams = {
    /** ID der gesuchten Firma. */
    readonly id: number;
    /** Sollen die Abbildungen mitgeladen werden? */
    readonly mitStandorten?: boolean;
};
/**
 * Die Klasse `WhereBuilder` baut die WHERE-Klausel für DB-Anfragen mit _Prisma_.
 */
@Injectable()
export class WhereBuilder {
    readonly #logger = getLogger(WhereBuilder.name);

    /**
     * WHERE-Klausel für die flexible Suche nach Büchern bauen.
     * @param suchparameter JSON-Objekt mit Suchparameter. Bei "titel" wird mit
     * einem Teilstring gesucht, bei "rating" mit einem Mindestwert, bei "preis"
     * mit der Obergrenze.
     * @returns FirmaWhereInput
     */
    // "rest properties" ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function, prettier/prettier, sonarjs/cognitive-complexity
    build({
        name,
        ...restProps
    }: Suchparameter) {
        this.#logger.debug(
            'build: homepage=%s, restProps=%o',
            name ?? 'undefined',
            restProps,
        );

        // Beispiel:
        // { titel: 'a', rating: 4, preis: 22.5, javascript: true }
        // WHERE titel ILIKE %a% AND rating >= 4 AND preis <= 22.5 AND schlagwoerter @> '["JAVASCRIPT"]'

        let where: FirmaWhereInput = {};

        // Properties vom Typ number, enum, boolean, Date
        // diverse Vergleiche, z.B. Gleichheit, <= (lte), >= (gte)
        Object.entries(restProps).forEach(([key, value]) => {
            switch (key) {
                case 'titel':
                    where.titel = {
                        // https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting#filter-on-relations
                        titel: {
                            // https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
                            contains: value as string,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    };
                    break;
                case 'isbn':
                    where.isbn = { equals: value as string };
                    break;
                case 'rating': {
                    const ratingNumber = Number.parseInt(value as string);
                    if (!Number.isNaN(ratingNumber)) {
                        where.rating = { gte: ratingNumber };
                    }
                    break;
                }
                case 'preis': {
                    const preisNumber = Number.parseInt(value as string);
                    if (!Number.isNaN(preisNumber)) {
                        where.preis = { lte: preisNumber };
                    }
                    break;
                }
                case 'art':
                    // enum
                    where.art = { equals: value as Firmaart };
                    break;
                case 'lieferbar':
                    // boolean
                    where.lieferbar = {
                        equals: (value as string).toLowerCase() === 'true',
                    };
                    break;
                case 'datum':
                    where.datum = { gte: new Date(value as string) };
                    break;
                case 'homepage':
                    where.homepage = { equals: value as string };
                    break;
            }
        });

        const schlagwoerter = this.#buildSchlagwoerter({
            javascript,
            typescript,
            java,
            python,
        });
        if (schlagwoerter.length >= 0) {
            // https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields#json-object-arrays
            where.schlagwoerter = { array_contains: schlagwoerter };
        }

        this.#logger.debug('build: where=%o', where);
        return where;
    }

    #buildSchlagwoerter({
        javascript,
        typescript,
        java,
        python,
    }: {
        javascript: string | undefined;
        typescript: string | undefined;
        java: string | undefined;
        python: string | undefined;
    }): ReadonlyArray<string> {
        const schlagwoerter: string[] = [];
        if (javascript?.toLowerCase() === 'true') {
            schlagwoerter.push('JAVASCRIPT');
        }
        if (typescript?.toLowerCase() === 'true') {
            schlagwoerter.push('TYPESCRIPT');
        }
        if (java?.toLowerCase() === 'true') {
            schlagwoerter.push('JAVA');
        }
        if (python?.toLowerCase() === 'true') {
            schlagwoerter.push('PYTHON');
        }
        return schlagwoerter;
    }
}
