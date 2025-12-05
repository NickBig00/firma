import asciidoctor from '@asciidoctor/core';
import kroki from 'asciidoctor-kroki';
import { join } from 'node:path';
import url from 'node:url';

// Asciidoctor initialisieren
const adoc = asciidoctor();
console.log(`Asciidoctor.js Version: ${adoc.getVersion()}`);

// Kroki-Erweiterung aktivieren (für PlantUML & andere Diagramme)
kroki.register(adoc.Extensions);

// __dirname für ES-Module
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Konfigurationsoptionen
const options = {
    // Sicherheitsstufe: "safe" erlaubt Includes innerhalb des Projekts
    safe: 'safe',

    // Attribute beeinflussen die Asciidoctor-Verarbeitung
    attributes: {
        linkcss: true, // CSS-Link statt Inline-Styling
        'kroki-server-url': 'https://kroki.io', // oder 'http://localhost:8000' bei lokalem Server
        'kroki-fetch-diagram': true,            // Diagramme direkt einbetten
        icons: 'font',                          // FontAwesome-Icons aktivieren
        toc: 'left',                            // Inhaltsverzeichnis links anzeigen
        sectanchors: '',                        // Anker für jede Überschrift
        sectnums: '',                           // Nummerierte Kapitel
    },

    // Arbeitsverzeichnisse
    base_dir: join(__dirname, '..', '.extras', 'doc', 'projekthandbuch'), // wo projekthandbuch.adoc liegt
    to_dir: join(__dirname, '..', '.extras', 'doc', 'projekthandbuch', 'html'), // Ausgabeziel
    mkdirs: true, // Unterordner automatisch anlegen
};

// eigentliche Konvertierung
adoc.convertFile(
    join(__dirname, '..', '.extras', 'doc', 'projekthandbuch', 'projekthandbuch.adoc'),
    options,
);

console.log(
    `✅ HTML-Datei wurde generiert unter: ${join(
        __dirname,
        '..',
        '.extras',
        'doc',
        'projekthandbuch',
        'html',
        'projekthandbuch.html',
    )}`,
);

