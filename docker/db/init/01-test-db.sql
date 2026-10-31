-- Runs once, when the dev database volume is first created (compose.dev.yaml).
-- The server tests (npm run test:server) truncate their tables, so they get their own database.
CREATE DATABASE cyberfunk_test;
