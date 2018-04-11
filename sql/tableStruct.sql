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
    project_name varchar(100),
    branch varchar(100),
    init jsonb,
    deploy jsonb,
    credentials jsonb,
    project_directory varchar(320)
);

insert into projects (project_name, branch, init, deploy, credentials)
values ('ci-backend', 'production', '[ "cd /usr/raintech/ci", "git clone git@bitbucket.org:raintechteam/ci-backend.git" ]',
'["cd /usr/raintech/ci/ci-backend", "git pull origin production"]',
'{ "host": "ci.raintech.su", "user": "ci", "password": "ifyouwanttohave"}'
)

select * from projects;

update projects set credentials = '{ "host": "ci.raintech.su", "port": 22, "username": "ci", "password": "ifyouwanttohave"}' where id = 1;

update projects set deploy = '["git pull origin production", "sudo systemctl restart ci"]' where id = 1;