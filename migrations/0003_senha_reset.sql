-- Esqueci minha senha: link de uso único (o banco guarda só o SHA-256 do token)
CREATE TABLE senha_resets (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL,
  usado_em TEXT
);
CREATE INDEX idx_senha_resets_usuario ON senha_resets(usuario_id, criado_em);
