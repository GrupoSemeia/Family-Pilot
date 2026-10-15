-- Entrar com o Google: guarda o identificador (sub) da conta Google. Conta só-Google usa uma senha impossível de digitar.
ALTER TABLE usuarios ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX idx_usuarios_google ON usuarios(google_sub) WHERE google_sub IS NOT NULL;
