import {
    Controller,
    Get,
    HttpStatus,
    Param,
    ParseIntPipe,
    Req,
    Res,
    Headers,
    Query,
    UseInterceptors,
    NotFoundException,
    StreamableFile,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';

import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    type FirmaMitGeschaeftsfuehrer,
    type FirmaMitGeschaeftsfuehrerundStandorten,
    FirmaService,
} from '../service/firma-service.js';
import { createPageable } from '../service/pageable.js';
import { type Suchparameter } from '../service/suchparameter.js';
import { createPage, Page } from './page.js';

export class FirmaQuery implements Suchparameter {
    @ApiProperty({ required: false })
    declare readonly name?: string;

    @ApiProperty({ required: false })
    declare readonly branche?: string;

    @ApiProperty({ required: false })
    declare readonly ort?: string;

    @ApiProperty({ required: false })
    declare readonly gruendungsjahr?: number;

    @ApiProperty({ required: false })
    declare readonly mitarbeiteranzahl?: number;

    @ApiProperty({ required: false })
    declare readonly umsatz?: number;

    @ApiProperty({ required: false })
    declare readonly homepage?: string;

    @ApiProperty({ required: false })
    declare size?: string;

    @ApiProperty({ required: false })
    declare page?: string;

    @ApiProperty({ required: false })
    declare only?: 'count';
}

@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Firma REST-API')
// @ApiBearerAuth()
export class FirmaController {
    readonly #service: FirmaService;
    readonly #logger = getLogger(FirmaController.name);

    constructor(service: FirmaService) {
        this.#service = service;
    }

    /**
     * Eine Firma wird asynchron anhand ihrer ID gesucht.
     *
     * @param id Pfadparameter `id`
     * @param req Request-Objekt von Express
     * @param version Versionsnummer im Header `If-None-Match`
     * @param res Response-Objekt von Express
     * @returns Promise mit der gefundenen Firma oder HTTP-Statuscode
     */
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Firmen-ID' })
    @ApiParam({ name: 'id', description: 'z.B. 1' })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Die Firma wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Keine Firma zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Die Firma wurde bereits heruntergeladen',
    })
    async getById(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<FirmaMitGeschaeftsfuehrerundStandorten>> {
        this.#logger.debug('getById: id=%d, version=%s', id, version ?? '-1');

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const firma = await this.#service.findById({ id });

        const versionDb = firma.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }

        res.header('ETag', `"${versionDb}"`);
        this.#logger.debug('getById: firma=%o', firma);
        return res.json(firma);
    }

    /**
     * Firmen werden mit Query-Parametern asynchron gesucht.
     * Falls es mindestens eine passende Firma gibt, wird der Statuscode `200` (`OK`) gesetzt.
     * Falls keine Firma gefunden wurde, wird der Statuscode `404` (`Not Found`) gesetzt.
     * Falls keine Query-Parameter vorhanden sind, werden alle Firmen ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req   Request-Objekt von Express.
     * @param res   Leeres Response-Objekt von Express.
     * @returns     Eine Seite mit Firmen oder ein Count-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchparametern' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Firmen' })
    async get(
        @Query() query: FirmaQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<
        Response<
            Page<Readonly<FirmaMitGeschaeftsfuehrer>> | Record<'count', number>
        >
    > {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const { only } = query;
        if (only !== undefined) {
            const count = await this.#service.count();
            this.#logger.debug('get: count=%d', count);
            return res.json({ count });
        }

        const { page, size } = query;
        delete query.page;
        delete query.size;

        this.#logger.debug(
            'get: page=%s, size=%s',
            page ?? 'undefined',
            size ?? 'undefined',
        );

        const keys = Object.keys(query) as (keyof FirmaQuery)[];
        keys.forEach((key) => {
            if (query[key] === undefined) {
                delete query[key];
            }
        });

        this.#logger.debug('get: query=%o', query);

        const pageable = createPageable({ number: page, size });
        const firmenSlice = await this.#service.find(query, pageable);
        const firmaPage = createPage(firmenSlice, pageable);

        this.#logger.debug('get: firmaPage=%o', firmaPage);
        return res.json(firmaPage).send();
    }

    /**
     * Zu einer Firma mit gegebener ID wird die zugehörige Binärdatei,
     * z. B. ein Logo oder ein PDF, heruntergeladen.
     *
     * @param idStr Pfad-Parameter `id`.
     * @param res   Response-Objekt von Express.
     * @returns     Ein StreamableFile-Objekt mit der Binärdatei.
     */
    @Get('/file/:id')
    @Public()
    @ApiOperation({ description: 'Suche nach Datei mit der Firmen-ID' })
    @ApiParam({
        name: 'id',
        description: 'z. B. 1',
    })
    @ApiNotFoundResponse({ description: 'Keine Datei zur Firmen-ID gefunden' })
    @ApiOkResponse({ description: 'Die Datei wurde gefunden' })
    async getFileById(
        @Param('id') idStr: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        this.#logger.debug('getFileById: firmaId=%s', idStr);

        const id = Number(idStr);
        if (!Number.isInteger(id)) {
            this.#logger.debug('getFileById: keine Ganzzahl');
            throw new NotFoundException(`Die Firmen-ID ${idStr} ist ungültig.`);
        }

        const firmaFile = await this.#service.findFileByFirmaId(id);
        if (firmaFile?.data === undefined) {
            throw new NotFoundException('Keine Datei gefunden.');
        }

        res.contentType(firmaFile.mimetype ?? 'application/octet-stream').set({
            'Content-Disposition': `inline; filename="${firmaFile.filename}"`,
        });

        return new StreamableFile(firmaFile.data);
    }
}
