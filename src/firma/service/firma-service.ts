import { Injectable, NotFoundException } from '@nestjs/common';
import {
    FirmaFile,
    Prisma,
    PrismaClient,
} from '../../generated/prisma/client.js';
import { type FirmaInclude } from '../../generated/prisma/models/Firma.js';
import { getLogger } from '../../logger/logger.js';
import { type Pageable } from './pageable.js';
import { PrismaService } from './prisma-service.js';
import { type Slice } from './slice.js';
import { type Suchparameter, suchparameterNamen } from './suchparameter.js';
import { WhereBuilder } from './where-builder.js';

type FindByIdParams = {
    readonly id: number;
    readonly mitStandorten?: boolean;
};

export type FirmaMitGeschaeftsfuehrer = Prisma.FirmaGetPayload<{
    include: { geschaeftsfuehrer: true };
}>;

export type FirmaMitGeschaeftsfuehrerundStandorten = Prisma.FirmaGetPayload<{
    include: {
        geschaeftsfuehrer: true;
        standorte: true;
    };
}>;

@Injectable()
export class FirmaService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #prisma: PrismaClient;
    readonly #whereBuilder: WhereBuilder;
    readonly #includeGeschaeftsfuehrer: FirmaInclude = {
        geschaeftsfuehrer: true,
    };
    readonly #includeGeschaeftsfuehrerundStandorte: FirmaInclude = {
        geschaeftsfuehrer: true,
        standorte: true,
    };

    readonly #logger = getLogger(FirmaService.name);

    constructor(prisma: PrismaService, whereBuilder: WhereBuilder) {
        this.#prisma = prisma.client;
        this.#whereBuilder = whereBuilder;
    }

    /**
     * Eine Firma asynchron anhand seiner ID suchen
     * @param id ID der gesuchten Firma
     * @returns Die gefundene Firma in einem Promise aus ES2015.
     * @throws NotFoundException falls keine Firma mit der ID existiert
     */
    async findById({
        id,
        mitStandorten = false,
    }: FindByIdParams): Promise<
        Readonly<FirmaMitGeschaeftsfuehrerundStandorten>
    > {
        this.#logger.debug('findById: id=%d', id);

        const include = mitStandorten
            ? this.#includeGeschaeftsfuehrerundStandorte
            : this.#includeGeschaeftsfuehrer;
        const firma: FirmaMitGeschaeftsfuehrerundStandorten | null =
            await this.#prisma.firma.findUnique({
                where: { id },
                include,
            });
        if (firma === null) {
            this.#logger.debug('Es gibt keine Firma mit der ID %d', id);
            throw new NotFoundException(
                `Es gibt keine FIrma mit der ID ${id}.`,
            );
        }

        this.#logger.debug('findById: firma=%o', firma);
        return firma;
    }

    /**
     * Binärdatei zu einer Firma suchen.
     * @param firmaId ID der zugehörigen Firma.
     * @returns Binärdatei oder undefined als Promise.
     */
    async findFileByFirmaId(
        firmaId: number,
    ): Promise<Readonly<FirmaFile> | undefined> {
        this.#logger.debug('findFileByFirmaId: firmaId=%d', firmaId);
        const firmaFile: FirmaFile | null =
            await this.#prisma.firmaFile.findUnique({ where: { firmaId } });
        if (firmaFile === null) {
            this.#logger.debug('findFileByFirmaId: Keine Datei gefunden');
            return;
        }

        this.#logger.debug(
            'findFileByFirmaId: id=%s, byteLength=%d, filename=%s, mimetype=%s, firmaId=%d',
            firmaFile.id,
            firmaFile.data.byteLength,
            firmaFile.filename,
            firmaFile.mimetype ?? 'undefined',
            firmaFile.firmaId,
        );

        return firmaFile;
    }

    /**
     * Firmen asynchron suchen.
     * @param suchparameter JSON-Objekt mit Suchparameter.
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
     * @returns Ein JSON-Array mit den gefundenen Firmen.
     * @throws NotFoundException falls keine Firmen gefunden wurden.
     */
    async find(
        suchparameter: Suchparameter | undefined,
        pageable: Pageable,
    ): Promise<Readonly<Slice<Readonly<FirmaMitGeschaeftsfuehrer>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(suchparameter),
            pageable,
        );

        if (suchparameter === undefined) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(suchparameter);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        // Falsche Namen fuer Suchparameter?
        if (!this.#checkKeys(keys)) {
            this.#logger.debug('Ungueltige Suchparameter');
            throw new NotFoundException('Ungueltige Suchparameter');
        }

        const where = this.#whereBuilder.build(suchparameter);
        const { number, size } = pageable;
        const firmen: FirmaMitGeschaeftsfuehrer[] =
            await this.#prisma.firma.findMany({
                where,
                skip: number * size,
                take: size,
                include: this.#includeGeschaeftsfuehrer,
            });
        if (firmen.length === 0) {
            this.#logger.debug('find: Keine Firmen gefunden');
            throw new NotFoundException(
                `Keine Firmen gefunden: ${JSON.stringify(suchparameter)}, Seite ${pageable.number}}`,
            );
        }
        const totalElements = await this.count();
        return this.#createSlice(firmen, totalElements);
    }

    /**
     * Anzahl aller Firmen zurückliefern.
     * @returns Anzahl der gefundenen Firmen.
     */
    async count() {
        this.#logger.debug('count');
        const count = await this.#prisma.firma.count();
        this.#logger.debug('count: %d', count);
        return count;
    }

    async #findAll(
        pageable: Pageable,
    ): Promise<Readonly<Slice<FirmaMitGeschaeftsfuehrer>>> {
        const { number, size } = pageable;
        const firmen: FirmaMitGeschaeftsfuehrer[] =
            await this.#prisma.firma.findMany({
                skip: number * size,
                take: size,
                include: this.#includeGeschaeftsfuehrer,
            });
        if (firmen.length === 0) {
            this.#logger.debug('#findAll: Keine Firmen gefunden');
            throw new NotFoundException(`Ungueltige Seite "${number}"`);
        }
        const totalElements = await this.count();
        return this.#createSlice(firmen, totalElements);
    }

    #createSlice(
        firmen: FirmaMitGeschaeftsfuehrer[],
        totalElements: number,
    ): Readonly<Slice<FirmaMitGeschaeftsfuehrer>> {
        const firmaSlice: Slice<FirmaMitGeschaeftsfuehrer> = {
            content: firmen,
            totalElements,
        };
        this.#logger.debug('createSlice: firmaSlice=%o', firmaSlice);
        return firmaSlice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%o', keys);
        // Ist jeder Suchparameter auch eine Property von Firma oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (!suchparameterNamen.includes(key)) {
                this.#logger.debug(
                    '#checkKeys: ungueltiger Suchparameter "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
