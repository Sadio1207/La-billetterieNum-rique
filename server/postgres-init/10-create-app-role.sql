\set ON_ERROR_STOP on
\getenv app_password POSTGRES_APP_PASSWORD
CREATE ROLE terangapass LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE terangapass TO terangapass;
GRANT USAGE, CREATE ON SCHEMA public TO terangapass;
