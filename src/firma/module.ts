import { Module } from '@nestjs/common';
import { MailModule } from '../mail/module.js';
import { KeycloakModule } from '../security/keycloak/module.js';
import { FirmaWriteController } from './controller/firma-write-controller.js';
import { FirmaController } from './controller/firma-controller.js';
import { FirmaMutationResolver } from './resolver/mutation.js';
import { FirmaQueryResolver } from './resolver/query.js';
import { FirmaService } from './service/firma-service.js';
import { FirmaWriteService } from './service/firma-write-service.js';
import { PrismaService } from './service/prisma-service.js';
import { WhereBuilder } from './service/where-builder.js';

/**
 * Firmen.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für Prisma.
 */
@Module({
    imports: [KeycloakModule, MailModule],
    controllers: [FirmaController, FirmaWriteController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        FirmaService,
        FirmaWriteService,
        FirmaQueryResolver,
        FirmaMutationResolver,
        PrismaService,
        WhereBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [FirmaService, FirmaWriteService],
})
export class FirmaModule {}
