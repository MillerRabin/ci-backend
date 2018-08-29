create database ci;
create user master;
grant all on database ci to master;
alter user master password 'ifyouwanttohave';
alter user postgres password 'ifyouwanttohave';

create table git_logs (
    event_time timestamp with time zone not null default now(),
    event_data jsonb,
    deploy_results jsonb,
    error jsonb,
    owner uuid not null
);

alter table git_logs alter column owner drop not null;

create index git_logs_time on git_logs (event_time desc);
create index git_logs_owner on git_logs (owner);


create table projects (
    id serial primary key,
    reg_time timestamp with time zone not null default now(),
    update_time timestamp with time zone not null default now(),
    project_name varchar(100) not null,
    branch varchar(100) not null default 'master',
    init jsonb,
    deploy jsonb not null,
    credentials jsonb not null,
    project_directory varchar(320) not null,
    test jsonb,
    reload jsonb,
    owner uuid
);

create unique index projects_name_index on projects (project_name, owner);

select * from git_logs order by event_time desc;

insert into projects (project_name, branch, init, deploy, credentials, project_directory, test, reload)
values ('personal-backend', 'production',
'[ "git clone git@bitbucket.org:raintechteam/personal-backend.git /usr/raintech/personal/personal-backend", "cd /usr/raintech/personal/personal-backend", "git pull origin production", "npm install" ]',
'["git pull origin production", "npm install"]',
'{ "host": "raintech.su", "user": "ci", "password": "ifyouwanttohave"}',
'/usr/raintech/personal',
'[ "cd /usr/raintech/personal/personal-backend" ]',
'[ "sudo systemctl restart personal" ]'
)

select * from projects;

insert into projects (project_name, branch, init, deploy, credentials, project_directory, test, reload)
values ('auth-frontend', 'production',
'[ "git clone git@bitbucket.org:raintechteam/auth-frontend.git /usr/auth/auth-frontend", "cd /usr/ci/auth-frontend", "git pull origin production", "npm install" ]',
'["git pull origin production", "npm install" ]',
'{ "host": "raintech.su", "user": "ci", "password": "ifyouwanttohave"}',
'/usr/auth',
'[ "cd /usr/auth/auth-frontend" ]',
null
)

update projects set deploy = '["git clean -fd", "git reset --hard HEAD", "git pull origin production", "npm install"]' where project_name = 'ci-backend';


select * from git_logs order by event_time desc limit 100 offset 0;

with prj_logs as (
    select btrim((event_data -> 'repository' -> 'name')::text, '"') project_name from git_logs
)
select prj.owner from prj_logs gl
inner join projects prj on (prj.project_name = gl.project_name);


update git_logs set owner = 'c6302b79-aec3-4e09-b72d-a2d4d415eec8';