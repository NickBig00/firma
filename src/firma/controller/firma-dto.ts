import { ApiProperty } from '@nestjs/swagger';
import { GeschaeftsfuehrerDTO } from './geschaeftsfuehrer-dto.js';
import { StandortDTO } from './standort-dto.js';

export class FirmaDTO {
    @ApiProperty({
        example: 'Tech GmbH',
        description: 'Name der Firma',
    })
    readonly name!: string;

    @ApiProperty({
        example: 2015,
        description: 'Gründungsjahr der Firma',
    })
    readonly gruendungsjahr!: number;

    @ApiProperty({
        example: 'IT-Dienstleistungen',
        description: 'Branche der Firma',
    })
    readonly branche!: string;

    @ApiProperty({
        example: 50,
        description: 'Anzahl der Mitarbeiter',
    })
    readonly mitarbeiteranzahl!: number;

    @ApiProperty({
        example: 1250000.75,
        description: 'Jahresumsatz der Firma in Euro',
    })
    readonly umsatz!: number;

    @ApiProperty({
        example: 'https://techgmbh.de',
        required: false,
        description: 'Optionale Homepage der Firma',
    })
    readonly homepage?: string;

    @ApiProperty({
        description: 'Geschäftsführer der Firma (1:1-Beziehung)',
        type: () => GeschaeftsfuehrerDTO,
    })
    readonly geschaeftsfuehrer!: GeschaeftsfuehrerDTO;

    @ApiProperty({
        description: 'Liste der Standorte der Firma (1:n-Beziehung)',
        type: () => [StandortDTO],
        required: false,
    })
    readonly standorte?: StandortDTO[];
}
