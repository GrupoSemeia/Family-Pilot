-- "Ver como usuário": o administrador escolhe quais módulos quer ver como um cliente veria. Vale só para a sessão dele (JSON).
ALTER TABLE sessoes ADD COLUMN ver_como TEXT;
