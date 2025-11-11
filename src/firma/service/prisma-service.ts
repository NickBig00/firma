// https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';

// https://docs.nestjs.com/recipes/prisma#use-prisma-client-in-your-nestjs-services
@Injectable()
export class PrismaService implements OnModuleInit {
    // Delegation statt Vererbung: Logging der SQL-Anweisungen kann konfiguriert werden
    readonly client: PrismaClient;

    readonly #logger = getLogger(PrismaService.name);

    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env['DATABASE_URL'],
        });

        if (this.#logger.isLevelEnabled('debug')) {
            const prisma = new PrismaClient({
                adapter,
                errorFormat: 'pretty',
                log: [
                    {
                        emit: 'event',
                        level: 'query',
                    },
                    'info',
                    'warn',
                    'error',
                ],
            });
            prisma.$on('query', (e) => {
                console.log(`Query: ${e.query}`);
            });
            this.client = prisma;
        } else {
            this.client = new PrismaClient({ adapter });
        }
    }

    async onModuleInit() {
        await this.client.$connect();
        this.#logger.info('Verbindung mit der DB ist hergestellt.');
    }
}
