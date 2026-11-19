# Cockpit Utarget

App web (PWA) da Utarget: tarefas e módulos por perfil (carteira, legalização, captação, comercial, atendimento, financeiro, margem) Contabilidade & Assessoria. Este repositório contém só a tela; dados, login e regras de acesso ficam no Supabase (`utarget-dados`), protegidos por RLS. A chave em `app.js` é a chave pública (publishable) do Supabase e não dá acesso a dados sem login.
