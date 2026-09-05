update public.profiles p
set display_name='Rahmat'
from auth.users u
where p.id=u.id
and lower(u.email)=lower('rahmathdy55@gmail.com');

update public.profiles p
set display_name='Finka'
from auth.users u
where p.id=u.id
and lower(u.email)=lower('finkaauraf@gmail.com');

insert into public.user_modules(user_id,module_key,enabled)
select id,'kebab',true
from auth.users
where lower(email)=lower('finka@gmail.com')
on conflict(user_id,module_key)
do update set enabled=true;