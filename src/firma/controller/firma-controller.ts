import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  Res,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { type Request, type Response } from 'express';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { FirmaService } from '../service/firma-service.js';

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
  @ApiOperation({ summary: 'Suche einer Firma mit ID' })
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
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }))
    id: number,
    @Req() req: Request,
    @Headers('If-None-Match') version: string | undefined,
    @Res() res: Response,
  ): Promise<Response> {
    this.#logger.debug('getById: id=%d, version=%s', id, version ?? '-1');

    if (req.accepts(['json', 'html']) === false) {
      this.#logger.debug('getById: accepted=%o', req.accepted);
      return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
    }

    const firma = await this.#service.findById({ id });
    if (firma === undefined) {
      this.#logger.debug('getById: keine Firma gefunden');
      return res.sendStatus(HttpStatus.NOT_FOUND);
    }

    const versionDb = firma.version;
    if (version === `"${versionDb}"`) {
      this.#logger.debug('getById: NOT_MODIFIED');
      return res.sendStatus(HttpStatus.NOT_MODIFIED);
    }

    res.header('ETag', `"${versionDb}"`);
    this.#logger.debug('getById: firma=%o', firma);
    return res.json(firma);
  }
}
