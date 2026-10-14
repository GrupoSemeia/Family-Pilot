-- Contas e sessões
CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,            -- sempre em minúsculas
  senha_hash TEXT NOT NULL,
  cpf_cnpj TEXT,                          -- só dígitos; usado para criar o cliente na Asaas
  asaas_cliente TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessoes (
  id TEXT PRIMARY KEY,                    -- SHA-256 do token do cookie
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em TEXT NOT NULL
);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);

-- Tentativas de login erradas (limite por e-mail)
CREATE TABLE falhas_login (email TEXT NOT NULL, em TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_falhas_email ON falhas_login(email, em);

-- Cada compra (R$ 47, pagamento único). O acesso vale 12 meses a partir da confirmação do pagamento.
CREATE TABLE pedidos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  asaas_pagamento TEXT UNIQUE,
  valor INTEGER NOT NULL,                 -- centavos
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','reembolsado','cancelado')),
  url TEXT,                               -- página de pagamento da Asaas
  forma TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  pago_em TEXT,
  acesso_ate TEXT                         -- só preenchido quando pago
);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id, status);
