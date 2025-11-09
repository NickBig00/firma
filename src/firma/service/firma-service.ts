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
    readonly #includeGeschaeftsfuehrer: FirmaInclude = { titel: true };
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
    }: FindByIdParams): Promise<Readonly<FirmaMitGeschaeftsfuehrerundStandorten>> {
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
            this.#logger.debug('Es gibt kein Buch mit der ID %d', id);
            throw new NotFoundException(`Es gibt kein Buch mit der ID ${id}.`);
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
            await this.#prisma.buchFile.findUnique({ where: { firmaId } });
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

        // als Datei im Wurzelverzeichnis des Projekts speichern:
        // import { writeFile } from 'node:fs/promises';
        // await writeFile(buchFile.filename, buchFile.data);

        return firmaFile;
    }
}
