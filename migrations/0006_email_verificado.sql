-- E-mail confirmado: pelo Google (que já verifica) ou ao concluir "Esqueci minha senha" (o link chegou na caixa de entrada).
-- O acesso liberado pela equipe (ACESSO_LIVRE) só vale para e-mail confirmado.
ALTER TABLE usuarios ADD COLUMN email_verificado_em TEXT;
