SET default_tablespace = firmaspace;

CREATE SCHEMA IF NOT EXISTS AUTHORIZATION firma;
ALTER ROLE firma SET search_path = 'firma';
SET search_path TO 'firma';


CREATE TABLE IF NOT EXISTS firma (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    version       integer NOT NULL DEFAULT 0,
    name          text NOT NULL UNIQUE,
    gruendungsjahr integer CHECK (gruendungsjahr >= 1800 AND gruendungsjahr <= EXTRACT(YEAR FROM NOW())),
    branche       text,
    mitarbeiteranzahl integer CHECK (mitarbeiteranzahl >= 0),
    umsatz        decimal(12,2),
    homepage      text,
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geschaeftsfuehrer (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    name          text NOT NULL,
    email         text CHECK (position('@' in email) > 1),
    telefon       text,
    firma_id      integer NOT NULL UNIQUE REFERENCES firma ON DELETE CASCADE,
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS standort (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    adresse       text NOT NULL,
    plz           text NOT NULL,
    ort           text NOT NULL,
    land          text NOT NULL,
    firma_id      integer NOT NULL REFERENCES firma ON DELETE CASCADE,
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS standort_firma_id_idx ON standort(firma_id);


CREATE TABLE IF NOT EXISTS firma_file (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    data          bytea NOT NULL,
    filename      text NOT NULL,
    mimetype      text,
    firma_id      integer NOT NULL UNIQUE REFERENCES firma ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS firma_file_firma_id_idx ON firma_file(firma_id);
