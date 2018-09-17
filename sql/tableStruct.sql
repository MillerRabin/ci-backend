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
    owner uuid,
    project int
);


create index git_logs_time on git_logs (event_time desc);
create index git_logs_owner on git_logs (owner);


create table projects (
    id serial primary key,
    reg_time timestamp with time zone not null default now(),
    update_time timestamp with time zone not null default now(),
    project_name varchar(100) not null,
    branch varchar(100) not null default 'master',
    init jsonb not null default '{}',
    deploy jsonb not null default '{}',
    credentials jsonb not null default '{}',
    project_directory varchar(320) not null,
    directory jsonb not null default '{}',
    test jsonb not null default '{}',
    reload jsonb not null default '{}',
    server_credentials jsonb not null default '{}',
    owner uuid not null,
    repository varchar(320),
    project_data jsonb not null default '{}'
);

create unique index projects_name_index on projects (project_name, owner);

alter table projects rename column project_data3 to project_data2;

update projects set project_data = jsonb_strip_nulls(project_data) where id = 19;


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


select * from git_logs order by event_time desc limit 100 offset 0;

with prj_logs as (
    select btrim((event_data -> 'repository' -> 'name')::text, '"') project_name from git_logs
)
select prj.owner from prj_logs gl
inner join projects prj on (prj.project_name = gl.project_name);


update git_logs set owner = 'c6302b79-aec3-4e09-b72d-a2d4d415eec8';

update projects set deploy = '["git clean -fd", "git reset --hard HEAD", "git pull origin production", "npm install", { "cwd": "/usr/raintech/ci/ci-frontend/builder", "command": "npm install" }, "node main.js"]' where project_name = 'ci-frontend';

select * from projects;