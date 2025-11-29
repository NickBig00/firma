/*
 * Asciidoctor-Skript zur Generierung des UML-Diagramms (Firma)
 * Basierend auf dem Beispiel von Juergen Zimmermann, HKA
 */

import asciidoctor from '@asciidoctor/core';
import kroki from 'asciidoctor-kroki';
import { join } from 'node:path';
import url from 'node:url';

const adoc = asciidoctor();
console.log(`Asciidoctor.js Version: ${adoc.getVersion()}`);

// Kroki-Erweiterung aktivieren (für PlantUML)
kroki.register(adoc.Extensions);

// __dirname-Workaround für ES-Module
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Optionen für die Umwandlung
const options = {
    safe: 'safe',
    attributes: {
        linkcss: true,
        // Diese Attribute aktivieren PlantUML über Kroki
        'kroki-server-url': 'https://kroki.io',
        'kroki-fetch-diagram': true,
    },
    base_dir: join(__dirname, '..', 'uml'),
    to_dir: join(__dirname, '..', 'uml', 'html'),
    mkdirs: true,
};

// Quelle: UML.adoc → Ziel: UML.html
adoc.convertFile(join(__dirname, '..', 'uml', 'uml.adoc'), options);

console.log(
    `HTML-Datei generiert unter: ${join(
        __dirname,
        '..',
        'uml',
        'html',
        'uml.html',
    )}`,
);
