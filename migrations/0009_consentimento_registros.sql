-- Consentimento específico do responsável para guardar na nuvem os registros sobre as crianças (LGPD, art. 14): quando e qual texto.
ALTER TABLE usuarios ADD COLUMN consent_registros_em TEXT;
ALTER TABLE usuarios ADD COLUMN consent_registros_versao TEXT;
