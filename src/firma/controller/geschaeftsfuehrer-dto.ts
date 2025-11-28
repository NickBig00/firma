import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO-Klasse für Geschäftsführer einer Firma.
 */
export class GeschaeftsfuehrerDTO {
    @ApiProperty({
        example: 'Max Mustermann',
        description: 'Name des Geschäftsführers',
    })
    @IsString()
    @MaxLength(50)
    @MinLength(1)
    readonly name!: string;

    @ApiProperty({
        example: 'max@mustermann.de',
        description: 'E-Mail-Adresse des Geschäftsführers',
    })
    @IsString()
    @MaxLength(100)
    readonly email!: string;

    @ApiProperty({
        example: '+49 721 123456',
        description: 'Telefonnummer des Geschäftsführers',
    })
    @IsString()
    @MaxLength(30)
    readonly telefon!: string;
}
