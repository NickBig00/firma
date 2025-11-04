import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiParam,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { AuthGuard, Public, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    FirmaCreate,
    type FirmaFileCreated,
    FirmaUpdate,
    FirmaWriteService,
} from '../service/firma-write-service.js';
import { FirmaDTO, FirmaDtoOhneRef } from './firma-dto.js';
import { createBaseUri } from './create-base-uri.js';
import { InvalidMimeTypeException } from './exceptions.js';


const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf']);

const MULTER_OPTIONS: MulterOptions = {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_: any, file: any, cb: any) => {
        if (!MIME_TYPES.has(file.mimetype)) {
            return cb(new InvalidMimeTypeException(file.mimetype), false);
        }
        cb(null, true);
    },
};


/**
 * Die Controller-Klasse für die Verwaltung von Firmen.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Firma REST-API')
@ApiBearerAuth()
export class FirmaWriteController {
    readonly #service: FirmaWriteService;
    readonly #logger = getLogger(FirmaWriteController.name);

    constructor(service: FirmaWriteService) {
        this.#service = service;
    }

    /**
     *  Eine neue Firma wird asynchron angelegt.
     * @param firmaDTO JSON-Daten für die anzulegende Firma.
     * @param req Request-Objekt von Express für den Location-Header.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
     @Post()
    @Roles('admin', 'user')
    @ApiOperation({ summary: 'Eine neue Firma anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Firmendaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(@Body() firmaDTO: FirmaDTO, @Req() req: Request, @Res() res: Response) {
        this.#logger.debug('post: firmaDTO=%o', firmaDTO);

        const firma = this.#dtoToFirmaCreate(firmaDTO);
        const id = await this.#service.create(firma);

        const location = `${createBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }
    /**
     * Zu einer bestehenden Firma wird eine Binärdatei (z. B. ein Logo oder Dokument)
     * asynchron hochgeladen.
     * Der Upload erfolgt mit `multipart/form-data` über den Schlüssel `file`.
     *
     * Bei erfolgreichem Upload wird der Statuscode `204 (No Content)` gesetzt
     * und im Header `Location` auf die URI der Datei verwiesen.
     *
     * @param id ID der Firma, zu der die Datei hochgeladen wird.
     * @param file Binärdatei als `File`-Objekt von Multer.
     * @param req Request-Objekt von Express (für den Location-Header).
     * @param res Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post(':id/file')
    @Roles('admin', 'user')
    @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Binärdatei (z. B. Logo) zu einer Firma hochladen' })
    @ApiParam({
        name: 'id',
        description: 'ID der Firma, zu der eine Datei hinzugefügt werden soll',
        example: 1,
    })
    @ApiCreatedResponse({ description: 'Datei erfolgreich hinzugefügt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Datei' })
    async addFile(
        @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND })) id: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        const { buffer, originalname, mimetype } = file;
        this.#logger.debug('addFile: id=%d, filename=%s, mimetype=%s', id, originalname, mimetype);

        const firmaFile: FirmaFileCreated | undefined = await this.#service.addFile(
            id,
            buffer,
            originalname,
            mimetype,
        );
        this.#logger.debug('addFile: firmaFile=%o', firmaFile);

        const location = `${createBaseUri(req)}/file/${id}`;
        return res.location(location).send();
    }
}
