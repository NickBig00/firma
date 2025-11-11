import { type ApolloDriverConfig } from '@nestjs/apollo';
import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { AdminModule } from './admin/module.js';
import { FirmaWriteController } from './firma/controller/firma-write-controller.js';
import { FirmaController } from './firma/controller/firma-controller.ts';
import { FirmaModule } from './firma/module.js';
import { DevModule } from './config/dev/module.js';
import { graphQlModuleOptions } from './config/graphql.js';
import { LoggerModule } from './logger/module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.js';
import { KeycloakModule } from './security/keycloak/module.js';

@Module({
    imports: [
        AdminModule,
        FirmaModule,
        // Umgebungsvariable DATABASE_URL fuer PrismaPg
        ConfigModule,
        DevModule,
        GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
        LoggerModule,
        KeycloakModule,
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes(FirmaController, FirmaWriteController, 'auth', 'graphql');
    }
}
