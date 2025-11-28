import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Das Modul besteht aus den Klassen für die Fehlerbehandlung bei der Verwaltung
 * von Büchern, z.B. beim Datei-Upload.
 * @packageDocumentation
 */

/**
 * Exception-Klasse für einen nicht-zulaessigen MIME-Type.
 */
export class InvalidMimeTypeException extends HttpException {
    readonly mimeType: string | undefined;

    constructor(mimeType: string | undefined) {
        super(
            `Der MIME-Type ${mimeType} ist nicht zulaessig.`,
            // TODO https://github.com/nestjs/nest/issues/15624 https://github.com/nodejs/node/blob/main/lib/_http_server.js#L159
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
        this.mimeType = mimeType;
    }
}
