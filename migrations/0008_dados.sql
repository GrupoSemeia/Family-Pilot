-- Registros dos pais (diário, radar, ferramentas), guardados CIFRADOS (AES-GCM) por conta, para abrir em qualquer aparelho.
-- "versao" evita que um aparelho apague sem querer o que outro acabou de salvar.
CREATE TABLE dados (
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,                    -- 'birra' | 'modulos'
  versao INTEGER NOT NULL,
  conteudo TEXT NOT NULL,                 -- v1.<iv>.<texto cifrado>
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, chave)
);
-- Conta excluída a pedido da pessoa: a linha fica anonimizada só para manter registros fiscais das compras.
ALTER TABLE usuarios ADD COLUMN excluido_em TEXT;
