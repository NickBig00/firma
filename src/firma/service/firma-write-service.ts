import { Injectable, NotFoundException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import {
    FirmaFile,
    type Prisma,
    PrismaClient,
} from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail-service.js';
import { FirmaService } from './firma-service.js';
import {
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { PrismaService } from './prisma-service.js';

export type FirmaCreate = Prisma.FirmaCreateInput;
type FirmaCreated = Prisma.FirmaGetPayload<{
    include: {
        geschaeftsfuehrer: true;
        standorte: true;
    };
}>;

export type FirmaUpdate = Prisma.FirmaUpdateInput;
/** Typdefinitionen zum Aktualisieren einer Firma mit `update`. */
export type UpdateParams = {
    /** ID dee zu aktualisierenden Firma. */
    readonly id: number | undefined;
    /** Firma-Objekt mit den aktualisierten Werten. */
    readonly firma: FirmaUpdate;
    /** Versionsnummer für die zu aktualisierenden Werte. */
    readonly version: string;
};
type FirmaUpdated = Prisma.FirmaGetPayload<{}>;

type FirmaFileCreate = Prisma.FirmaFileUncheckedCreateInput;
export type FirmaFileCreated = Prisma.FirmaFileGetPayload<{}>;

/**
 * Die Klasse `FirmaWriteService` implementiert den Anwendungskern für das
 * Schreiben von Firmen und greift mit _Prisma_ auf die DB zu.
 */
@Injectable()
export class FirmaWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #prisma: PrismaClient;

    readonly #readService: FirmaService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(FirmaWriteService.name);

    constructor(
        prisma: PrismaService,
        readService: FirmaService,
        mailService: MailService,
    ) {
        this.#prisma = prisma.client;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Eine neue Firma soll angelegt werden.
     * @param firma Die neu abzulegende Firma
     * @returns Die ID der neu angelegten Firma
     */
    async create(firma: FirmaCreate) {
        this.#logger.debug('create: firma=%o', firma);

        // Neuer Datensatz mit generierter ID
        let firmaDb: FirmaCreated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            firmaDb = await tx.firma.create({
                data: firma,
                include: { geschaeftsfuehrer: true, standorte: true },
            });
        });
        await this.#sendmail({
            id: firmaDb?.id ?? 'N/A',
            name: firmaDb?.name ?? 'N/A',
        });

        this.#logger.debug('create: firmaDb.id=%s', firmaDb?.id ?? 'N/A');
        return firmaDb?.id ?? Number.NaN;
    }

    /**
     * Zu einer vorhandenen Firma eine Binärdatei mit z.B. einem Bild abspeichern.
     * @param firmaId ID der vorhandenen Firma
     * @param data Bytes der Datei als Buffer Node
     * @param filename Dateiname
     * @param size Dateigröße in Bytes
     * @returns Entity-Objekt für `FirmaFile`
     */
    // eslint-disable-next-line max-params
    async addFile(
        firmaId: number,
        data: Uint8Array<ArrayBufferLike>,
        filename: string,
        size: number,
    ): Promise<Readonly<FirmaFile> | undefined> {
        this.#logger.debug(
            'addFile: firmaId=%d, filename=%s, size=%d',
            firmaId,
            filename,
            size,
        );

        let firmaFileCreated: FirmaFileCreated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            const firma = tx.firma.findUnique({
                where: { id: firmaId },
            });
            if (firma === null) {
                this.#logger.debug(
                    'Es gibt keine Firma mit der ID %d',
                    firmaId,
                );
                throw new NotFoundException(
                    `Es gibt keine Firma mit der ID ${firmaId}.`,
                );
            }

            // evtl. vorhandene Datei löschen
            await tx.firmaFile.deleteMany({ where: { firmaId } });

            const fileType = await fileTypeFromBuffer(data);
            const mimetype = fileType?.mime ?? null;
            this.#logger.debug('addFile: mimetype=%s', mimetype ?? 'undefined');

            const firmaFile: FirmaFileCreate = {
                filename,
                data,
                mimetype,
                firmaId,
            };
            firmaFileCreated = await tx.firmaFile.create({ data: firmaFile });
        });

        this.#logger.debug(
            'addFile: id=%d, byteLength=%d, filename=%s, mimetype=%s',
            firmaFileCreated?.id ?? Number.NaN,
            firmaFileCreated?.data.byteLength ?? Number.NaN,
            firmaFileCreated?.filename ?? 'undefined',
            firmaFileCreated?.mimetype ?? 'null',
        );
        return firmaFileCreated;
    }

    /**
     * Ein vorhandene Firma soll aktualisiert werden.
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls keine Firma zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, firma, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%d, firma=%o, version=%s',
            id ?? Number.NaN,
            firma,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt kein Firma mit der ID ${id}.`);
        }

        await this.#validateUpdate(id, version);

        firma.version = { increment: 1 };
        let firmaUpdated: FirmaUpdated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            firmaUpdated = await tx.firma.update({
                data: firma,
                where: { id },
            });
        });
        this.#logger.debug(
            'update: firmaUpdated=%s',
            JSON.stringify(firmaUpdated),
        );

        return firmaUpdated?.version ?? Number.NaN;
    }

    /**
     * Ein Firma wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID der zu löschenden Firma
     * @returns true, falls die Frima vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);

        const firma = await this.#prisma.firma.findUnique({
            where: { id },
        });
        if (firma === null) {
            this.#logger.debug('delete: not found');
            return false;
        }

        await this.#prisma.$transaction(async (tx) => {
            await tx.firma.delete({ where: { id } });
        });

        this.#logger.debug('delete');
        return true;
    }

    async #sendmail({ id, name }: { id: number | 'N/A'; name: string }) {
        const subject = `Neue Firma ${id}`;
        const body = `Die Firma mit dem Name <strong>${name}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(id: number, versionStr: string) {
        this.#logger.debug(
            '#validateUpdate: id=%d, versionStr=%s',
            id,
            versionStr,
        );
        if (!FirmaWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const firmaDb = await this.#readService.findById({ id });

        if (version < firmaDb.version) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
    }
}
