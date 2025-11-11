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
            'build: name=%s, restProps=%o',
            name ?? 'undefined',
            restProps,
        );

        let where: FirmaWhereInput = {};

        // Properties vom Typ number, enum, boolean, Date
        // diverse Vergleiche, z.B. Gleichheit, <= (lte), >= (gte)
        Object.entries(restProps).forEach(([key, value]) => {
            switch (key) {
                case 'geschaeftsfuehrer':
                    where.geschaeftsfuehrer = {
                        // https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting#filter-on-relations
                        name: {
                            // https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
                            contains: value as string,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    };
                    break;
                case 'email':
                    where.email = { equals: value as string };
                    break;
                case 'branche':
                    where.branche = { equals: value as string };
                    break;
                case 'umsatz': {
                    const umsatzNumber = Number.parseInt(value as string);
                    if (!Number.isNaN(umsatzNumber)) {
                        where.umsatz = umsatzNumber;
                    }
                    break;
                }
                case 'mitarbeiterzahl':
                    where.mitarbeiterzahl =  Number.parseInt(value as string);
                    break;
                case 'gruendungsjahr':
                    where.gruendungsjahr =  Number.parseInt(value as string);
                    break;
                case 'homepage':
                    where.homepage = { equals: value as string };
                    break;
            }
        });



        this.#logger.debug('build: where=%o', where);
        return where;
    }
}
