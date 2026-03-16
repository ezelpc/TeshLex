-- .devcontainer/postgres/init.sql
-- Script de inicialización de PostgreSQL
-- Crea extensiones útiles para el proyecto TESH

-- UUID nativo (para IDs tipo UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Búsqueda de texto completo en español
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Estadísticas avanzadas
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Confirmar
SELECT 'PostgreSQL inicializado correctamente para TeshLex ✓' AS status;