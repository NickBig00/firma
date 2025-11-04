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

    /**
     * Eine bestehende Firma wird asynchron aktualisiert.
     *
     * Die ID der zu aktualisierenden Firma ist als Pfadparameter enthalten.
     * Im Body wird das zu aktualisierende Firmenobjekt als JSON übergeben.
     * Damit die Aktualisierung durchgeführt werden kann, muss im Header `If-Match`
     * die korrekte Version angegeben sein (optimistische Synchronisation).
     *
     * Bei Erfolg: `204 (No Content)` und Header `ETag` mit der neuen Version.
     * Bei falscher oder fehlender Versionsnummer: `412 (Precondition Failed)` bzw. `428 (Precondition Required)`.
     *
     * @param firmaDTO JSON-Daten der zu aktualisierenden Firma.
     * @param id ID der Firma, die aktualisiert wird.
     * @param version Versionsnummer aus dem Header `If-Match`.
     * @param res Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Put(':id')
    @Roles('admin', 'user')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Vorhandene Firma aktualisieren' })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiParam({
        name: 'id',
        description: 'ID der Firma, die aktualisiert werden soll',
        example: 2,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiPreconditionFailedResponse({ description: 'Falsche Version im Header "If-Match"' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() firmaDTO: FirmaDtoOhneRef,
        @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND })) id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('put: id=%d, firmaDTO=%o, version=%s', id, firmaDTO, version ?? 'undefined');

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            return res.status(HttpStatus.PRECONDITION_REQUIRED).set('Content-Type', 'application/json').send(msg);
        }

        const firma = this.dtoToFirmaUpdate(firmaDTO);
        const neueVersion = await this.#service.update({ id, firma, version });
        return res.header('ETag', `"${neueVersion}"`).send();
    }
    /**
     * Eine Firma wird anhand ihrer ID gelöscht.
     * Der zurückgelieferte Statuscode ist `204 (No Content)`.
     * Wenn die Firma nicht existiert, erfolgt keine Fehlermeldung.
     *
     * @param id ID der zu löschenden Firma.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Firma löschen' })
    @ApiParam({
        name: 'id',
        description: 'ID der Firma, die gelöscht werden soll',
        example: 5,
    })
    @ApiNoContentResponse({
        description: 'Die Firma wurde gelöscht oder war nicht vorhanden',
    })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%d', id);
        await this.#service.delete(id);
    }

    /**
     * Hilfsmethode zum Umwandeln eines `FirmaDTO` in ein `FirmaCreate`-Objekt
     * für das Service-Layer.
     *
     * @param dto Die empfangenen Firmendaten (DTO).
     * @returns Datenstruktur für das Anlegen einer Firma in der Datenbank.
     */
    private dtoToFirmaCreate(dto: FirmaDTO): FirmaCreate {
        const firma: FirmaCreate = {
            version: 0,
            name: dto.name,
            gruendungsjahr: dto.gruendungsjahr,
            branche: dto.branche,
            mitarbeiteranzahl: dto.mitarbeiteranzahl,
            umsatz: dto.umsatz,
            homepage: dto.homepage ?? null,
            geschaeftsfuehrer: {
                create: {
                    name: dto.geschaeftsfuehrer.name,
                    email: dto.geschaeftsfuehrer.email,
                    telefon: dto.geschaeftsfuehrer.telefon,
                },
            },
            standorte: {
                create:
                    dto.standorte?.map((s) => ({
                        adresse: s.adresse,
                        plz: s.plz,
                        ort: s.ort,
                        land: s.land,
                    })) ?? [],
            },
        };
        return firma;
    }

    /**
     * Hilfsmethode zum Umwandeln eines `FirmaDtoOhneRef` in ein `FirmaUpdate`-Objekt.
     *
     * @param dto Die zu aktualisierenden Firmendaten (ohne Referenzen).
     * @returns Datenstruktur für das Aktualisieren einer Firma.
     */
    private dtoToFirmaUpdate(dto: FirmaDtoOhneRef): FirmaUpdate {
        return {
            version: 0,
            name: dto.name,
            gruendungsjahr: dto.gruendungsjahr,
            branche: dto.branche,
            mitarbeiteranzahl: dto.mitarbeiteranzahl,
            umsatz: dto.umsatz,
            homepage: dto.homepage ?? null,
        };
    }
}
