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
/*import {
    FirmaCreate,
    type FirmaFileCreated,
    FirmaUpdate,
    FirmaWriteService,
} from '../service/firma-write-service.js';
import { BuchDTO, BuchDtoOhneRef } from './buch-dto.js';*/
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
