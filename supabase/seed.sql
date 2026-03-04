-- Ejecutar con un usuario autenticado y workspace creado.
insert into public.players (workspace_id, full_name, birth_year, positions, foot, team, league, status, tags, notes)
select wm.workspace_id, 'Juan Pérez', 2003, '{ST,RW}', 'R', 'Atlético Demo', 'Primera', 'shortlist', '{pressing,fast}', 'Delantero vertical'
from public.workspace_members wm where wm.user_id = auth.uid() limit 1;
