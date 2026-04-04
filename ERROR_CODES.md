# Lista de Códigos de Erro

## Autenticação e Cadastro

- `AUTH_REQUIRED_FIELDS`: campos obrigatórios não enviados.
- `AUTH_INVALID_PASSWORD_FORMAT`: senha fora do formato exigido.
- `AUTH_EMAIL_ALREADY_EXISTS`: e-mail já cadastrado.
- `AUTH_CNPJ_ALREADY_EXISTS`: CNPJ já cadastrado.
- `AUTH_INVALID_CREDENTIALS`: e-mail/login ou senha inválidos.
- `AUTH_USER_BLOCKED`: usuário bloqueado para acesso.
- `AUTH_PENDING_APPROVAL`: cadastro aguardando aprovação.
- `AUTH_NOT_AUTHENTICATED`: usuário sem sessão/token válido.
- `AUTH_USER_NOT_FOUND`: usuário não encontrado.
- `AUTH_SESSION_INVALID`: sessão expirada ou inválida.

## Condomínio

- `CONDO_CNPJ_REQUIRED`: CNPJ não informado.
- `CONDO_CNPJ_INVALID`: CNPJ fora do padrão esperado.
- `CONDO_NOT_FOUND`: condomínio não localizado.

## Conta e Senha

- `ACCOUNT_NAME_REQUIRED`: nome obrigatório não informado.
- `ACCOUNT_EMAIL_IN_USE`: e-mail já usado por outra conta.
- `ACCOUNT_DELETE_FORBIDDEN`: perfil sem permissão para excluir a conta.
- `PASSWORD_REQUIRED_FIELDS`: senha atual/nova senha não informadas.
- `PASSWORD_TOO_SHORT`: nova senha fora do mínimo aceito.
- `PASSWORD_CURRENT_INVALID`: senha atual incorreta.

## Demo

- `DEMO_INVALID_ROLE`: perfil demo inválido.
- `DEMO_INIT_FAILED`: falha ao criar dados de demonstração.
- `DEMO_START_FAILED`: falha ao iniciar sessão demo.

## Infraestrutura

- `NETWORK_CONNECTION_FAILED`: falha de comunicação entre app e servidor.
- `SERVER_INTERNAL_ERROR`: erro interno do servidor.