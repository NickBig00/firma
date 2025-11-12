import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GeschaeftsfuehrerDTO } from './geschaeftsfuehrer-dto.js';
import { StandortDTO } from './standort-dto.js';
import { MaxLength } from 'class-validator';
export class FirmaDTO {
  @ApiProperty({ example: 'Beispiel GmbH', description: 'Name der Firma' })
  @IsString()
  @MaxLength(50)
  readonly name!: string;

  @ApiProperty({ example: 1998, description: 'Gründungsjahr der Firma' })
  readonly gruendungsjahr!: number;

  @ApiProperty({ example: 'IT-Dienstleistungen', description: 'Branche der Firma' })
  @IsString()
  @MaxLength(50)
  readonly branche!: string;

  @ApiProperty({ example: 120, description: 'Anzahl der Mitarbeiter' })
  readonly mitarbeiteranzahl!: number;

  @ApiProperty({ example: 2500000, description: 'Jahresumsatz in Euro' })
  @IsOptional()
  readonly umsatz: number | undefined;

  @ApiProperty({
    example: 'https://www.beispiel-gmbh.de',
    description: 'Homepage der Firma',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readonly homepage?: string | null;

  @ApiProperty({ type: GeschaeftsfuehrerDTO })
  @ValidateNested()
  @Type(() => GeschaeftsfuehrerDTO)
  readonly geschaeftsfuehrer!: GeschaeftsfuehrerDTO;

  @ApiProperty({ type: [StandortDTO], required: false })
  @ValidateNested({ each: true })
  @Type(() => StandortDTO)
  @IsOptional()
  readonly standorte?: StandortDTO[];
}
export class FirmaDtoOhneRef {
  @ApiProperty({ example: 'Beispiel GmbH', description: 'Name der Firma' })
  @IsString()
  @MaxLength(50)
  readonly name!: string;

  @ApiProperty({ example: 1998, description: 'Gründungsjahr der Firma' })
  readonly gruendungsjahr!: number;

  @ApiProperty({ example: 'IT-Dienstleistungen', description: 'Branche der Firma' })
  @IsString()
  @MaxLength(50)
  readonly branche!: string;

  @ApiProperty({ example: 120, description: 'Anzahl der Mitarbeiter' })
  readonly mitarbeiteranzahl!: number;

  @ApiProperty({ example: 2500000, description: 'Jahresumsatz in Euro' })
  @IsOptional()
  readonly umsatz: number | undefined;;

  @ApiProperty({
    example: 'https://www.beispiel-gmbh.de',
    description: 'Homepage der Firma',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readonly homepage?: string | null;
}
