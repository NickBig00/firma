// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { FirmaDTO } from '../controller/firma-dto.js';
import {
    FirmaWriteService,
    FirmaCreate,
    FirmaUpdate,
} from '../service/firma-write-service.js';
import { type IdInput } from './query.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export type CreatePayload = {
    readonly id: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export type DeletePayload = {
    readonly success: boolean;
};

export class FirmaUpdateDTO extends FirmaDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver('Firma')
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class FirmaMutationResolver {
    readonly #service: FirmaWriteService;

    readonly #logger = getLogger(FirmaMutationResolver.name);

    constructor(service: FirmaWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles('admin', 'user')
    async create(@Args('input') firmaDTO: FirmaDTO) {
        this.#logger.debug('create: FirmaDTO=%o', firmaDTO);

        const firma = this.#firmaDtoToFirmaCreate(firmaDTO);
        const id = await this.#service.create(firma);
        this.#logger.debug('createFirma: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles('admin', 'user')
    async update(@Args('input') firmaDTO: FirmaUpdateDTO) {
        this.#logger.debug('update: firma=%o', firmaDTO);

        const firma = this.#firmaUpdateDtoToFirmaUpdate(firmaDTO);
        const versionStr = `"${firmaDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(firmaDTO.id, 10),
            firma,
            version: versionStr,
        });
        this.#logger.debug('updateFirma: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles('admin')
    async delete(@Args() id: IdInput) {
        const idValue = id.id;
        this.#logger.debug('delete: idValue=%s', idValue);
        await this.#service.delete(Number(idValue));
        const payload: DeletePayload = { success: true };
        return payload;
    }

    #firmaDtoToFirmaCreate(firmaDTO: FirmaDTO): FirmaCreate {
        const standorte = firmaDTO.standorte?.map((standortDTO) => {
            const standort = {
                adresse: standortDTO.adresse,
                land: standortDTO.land,
                ort: standortDTO.ort,
                plz: standortDTO.plz,
            };
            return standort;
        });
        const frima: FirmaCreate = {
            version: 0,
            name: firmaDTO.name,
            branche: firmaDTO.branche,
            mitarbeiteranzahl: firmaDTO.mitarbeiteranzahl,
            umsatz: firmaDTO.umsatz,
            homepage: firmaDTO.homepage,
            gruendungsjahr: firmaDTO.gruendungsjahr,
            geschaeftsfuehrer: {
                create: {
                    titel: firmaDTO.geschaeftsfuehrer.email,
                    name: firmaDTO.geschaeftsfuehrer.name,
                    telefon: firmaDTO.geschaeftsfuehrer.telefon ?? null,
                },
            },
            standorte: { create: standorte ?? [] },
        };
        return frima;
    }

    #firmaUpdateDtoToFirmaUpdate(firmaDTO: FirmaUpdateDTO): FirmaUpdate {
        return {
            name: firmaDTO.name,
            branche: firmaDTO.branche,
            mitarbeiteranzahl: firmaDTO.mitarbeiteranzahl,
            umsatz: firmaDTO.umsatz,
            homepage: firmaDTO.homepage,
            gruendungsjahr: firmaDTO.gruendungsjahr,
        };
    }
}
