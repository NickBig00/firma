CREATE USER firma PASSWORD 'p';

CREATE DATABASE firma;

GRANT ALL ON DATABASE firma TO firma;

CREATE TABLESPACE firmaspace OWNER firma LOCATION '/var/lib/postgresql/tablespace/firma';
