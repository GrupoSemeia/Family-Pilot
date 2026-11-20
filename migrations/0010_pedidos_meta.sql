-- Medição de anúncios (API de Conversões da Meta). Só guardamos os identificadores de cookie do navegador (_fbp e _fbc),
-- e só quando eles existem, ou seja, quando a pessoa aceitou o aviso de cookies da página de vendas.
-- meta_enviado_em: quando a confirmação da compra foi enviada à Meta (NULL = não enviada, por falta de consentimento ou de configuração).
ALTER TABLE pedidos ADD COLUMN fbp TEXT;
ALTER TABLE pedidos ADD COLUMN fbc TEXT;
ALTER TABLE pedidos ADD COLUMN meta_enviado_em TEXT;
