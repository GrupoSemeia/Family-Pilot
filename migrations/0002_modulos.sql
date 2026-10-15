-- Cada pedido passa a ser de um módulo (os já existentes são do SOS Birra)
ALTER TABLE pedidos ADD COLUMN modulo TEXT NOT NULL DEFAULT 'birra';
CREATE INDEX idx_pedidos_modulo ON pedidos(usuario_id, modulo, status);
