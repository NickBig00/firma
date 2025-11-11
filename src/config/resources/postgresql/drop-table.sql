set search_path to 'firma';

-- https://www.postgresql.org/docs/current/sql-droptable.html

DROP TABLE IF EXISTS firma_file CASCADE;
DROP TABLE IF EXISTS standort CASCADE;
DROP TABLE IF EXISTS geschaeftsfuehrer CASCADE;
DROP TABLE IF EXISTS firma CASCADE;
