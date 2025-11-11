import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    FirmaService,
    type FirmaMitGeschaeftsfuehrer,
    type FirmaMitGeschaeftsfuehrerundStandorten,
} from '../service/firma-service.ts';
import { createPageable } from '../service/pageable.js';
import { Slice } from '../service/slice.js';
import { Suchparameter } from '../service/suchparameter.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

export type IdInput = {
    readonly id: string;
};

export type SuchparameterInput = {
    readonly suchparameter: Suchparameter;
};


@Resolver('Firma')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class FirmaQueryResolver {
    readonly #service: FirmaService;

    readonly #logger = getLogger(FirmaQueryResolver.name);

    constructor(service: FirmaService) {
        this.#service = service;
    }

    @Query('firma')
    @Public()
    async findById(
        @Args() { id }: IdInput,
    ): Promise<Readonly<FirmaMitGeschaeftsfuehrerundStandorten>> {
        this.#logger.debug('findById: id=%s', id);

        const firma: Readonly<FirmaMitGeschaeftsfuehrerundStandorten> =
            await this.#service.findById({ id: Number(id) });

        this.#logger.debug('findById: firma=%o', firma);
        return firma;
    }

    @Query('buecher')
    @Public()
    async find(
        @Args() input: SuchparameterInput | undefined,
    ): Promise<FirmaMitGeschaeftsfuehrer[]> {
        this.#logger.debug('find: input=%s', JSON.stringify(input));
        const pageable = createPageable({});
        const suchparameter = input?.suchparameter;
        const firmaSlice: Readonly<Slice<Readonly<FirmaMitGeschaeftsfuehrer>>> =
            await this.#service.find(suchparameter as any, pageable); // NOSONAR
        this.#logger.debug('find: firmaSlice=%o', firmaSlice);
        return firmaSlice.content;
    }
}
