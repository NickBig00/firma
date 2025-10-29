SET search_path TO firma;

COPY firma FROM '/csv/firma.csv' (FORMAT csv, DELIMITER ',', HEADER true);
COPY geschaeftsfuehrer FROM '/csv/geschaeftsfuehrer.csv' (FORMAT csv, DELIMITER ',', HEADER true);
COPY standort FROM '/csv/standort.csv' (FORMAT csv, DELIMITER ',', HEADER true);
