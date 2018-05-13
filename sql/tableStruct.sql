create database ci;
create user master;
grant all on database ci to master;
alter user master password 'ifyouwanttohave';
alter user postgres password 'ifyouwanttohave';

create table git_logs (
    event_time timestamp with time zone not null default now(),
    event_data jsonb,
    deploy_results jsonb,
    error jsonb
);

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
    reload jsonb
);

create unique index projects_name_index on projects (project_name);

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
values ('personal-frontend', 'production',
'[ "git clone git@bitbucket.org:raintechteam/personal-frontend.git /usr/raintech/personal/personal-frontend", "cd /usr/raintech/personal/personal-frontend", "git pull origin production", "npm install", "cd builder", "npm install", "node main.js" ]',
'["git pull origin production", "npm install", "cd builder", "npm install", "node main.js"]',
'{ "host": "raintech.su", "user": "ci", "password": "ifyouwanttohave"}',
'/usr/raintech/personal',
'[ "cd /usr/raintech/personal/personal-frontend" ]',
null
)