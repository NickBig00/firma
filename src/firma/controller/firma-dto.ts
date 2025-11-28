import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsOptional,
    IsUrl,
    IsInt,
    Min,
    Validate,
    ValidateNested,
    type ValidationArguments,
    ValidatorConstraint,
    type ValidatorConstraintInterface,
} from 'class-validator';
import BigNumber from 'bignumber.js';
import { GeschaeftsfuehrerDTO } from './geschaeftsfuehrer-dto.js';
import { StandortDTO } from './standort-dto.js';
import { MaxLength, MinLength } from 'class-validator';

@ValidatorConstraint({ name: 'decimalMin', async: false })
class DecimalMin implements ValidatorConstraintInterface {
    validate(value: BigNumber | undefined, args: ValidationArguments) {
        if (value === undefined) {
            return true;
        }
        const [minValue]: BigNumber[] = args.constraints; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        return value.isGreaterThan(minValue!);
    }

    defaultMessage(args: ValidationArguments) {
        return `Der Wert muss groesser oder gleich ${(args.constraints[0] as BigNumber).toNumber()} sein.`;
    }
}

// https://github.com/typestack/class-validator?tab=readme-ov-file#custom-validation-classes

const number2Decimal = ({ value }: { value: BigNumber.Value | undefined }) => {
    if (value === undefined) {
        return;
    }

    // Decimal aus decimal.js analog zu BigDecimal von Java
    // precision wie bei SQL beim Spaltentyp DECIMAL bzw. NUMERIC
    BigNumber.set({ DECIMAL_PLACES: 6 });
    return BigNumber(value);
};
export class FirmaDtoOhneRef {
@ApiProperty({ example: 'Beispiel GmbH', description: 'Name der Firma' })
  @MaxLength(50)
  @MinLength(2)
  readonly name!: string;

  @ApiProperty({ example: 1998, description: 'Gründungsjahr der Firma' })
  @IsInt()
  @Min(1800)
  readonly gruendungsjahr!: number;

  @ApiProperty({ example: 'IT-Dienstleistungen', description: 'Branche der Firma' })
  @MaxLength(50)
  readonly branche!: string;

  @ApiProperty({ example: 1, type: Number })
  @IsInt()
  @Min(1)
  readonly mitarbeiteranzahl!: number;

  @Transform(number2Decimal)
  @Validate(DecimalMin, [BigNumber(0)], {
        message: 'umsatz muss größer gleich 0 sein.',
    })
  @ApiProperty({ example: 2500000, description: 'Jahresumsatz in Euro' })
  @IsOptional()
  readonly umsatz: number | undefined;

  @ApiProperty({
    example: 'https://www.deinefirma-gmbh.de',
    description: 'Homepage der Firma',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(100)
  readonly homepage?: string | null;
}
export class FirmaDTO extends FirmaDtoOhneRef {

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
