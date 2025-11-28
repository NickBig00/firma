import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/**
 * DTO-Klasse für Standorte einer Firma.
 */
export class StandortDTO {
    @ApiProperty({
        example: 'Moltkestraße 30',
        description: 'Straße und Hausnummer',
    })
    @IsString()
    @MaxLength(50)
    readonly adresse!: string;

    @ApiProperty({ example: '76133', description: 'Postleitzahl' })
    @IsString()
    @MaxLength(10)
    readonly plz!: string;

    @ApiProperty({ example: 'Karlsruhe', description: 'Ort' })
    @IsString()
    @MaxLength(50)
    readonly ort!: string;

    @ApiProperty({ example: 'Deutschland', description: 'Land' })
    @IsString()
    @MaxLength(50)
    readonly land!: string;
}
