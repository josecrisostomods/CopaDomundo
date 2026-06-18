# Seguranca de credenciais

- Nunca envie arquivos `.env`, chaves privadas, tokens ou senhas para o Git.
- Mantenha apenas valores vazios e exemplos seguros em `.env.example`.
- Configure segredos do servidor somente nas variaveis de ambiente da Vercel.
- Use a chave `service_role` do Supabase somente no servidor; nunca use o prefixo `VITE_` nela.
- Ative autenticacao em dois fatores no GitHub, Supabase e Vercel.
- Se uma credencial for exposta, troque-a imediatamente e encerre as sessoes relacionadas.

O workflow `Secret scan` executa o Gitleaks em cada push e pull request para impedir novos vazamentos.
