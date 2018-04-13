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
    project_directory varchar(320),
    test jsonb
);

alter table projects add column test jsonb;

insert into projects (project_name, branch, init, deploy, credentials)
values ('ci-backend', 'production', '[ "cd /usr/raintech/ci", "git clone git@bitbucket.org:raintechteam/ci-backend.git" ]',
'["cd /usr/raintech/ci/ci-backend", "git pull origin production"]',
'{ "host": "ci.raintech.su", "user": "ci", "password": "ifyouwanttohave"}'
)

select * from projects;

update projects set credentials = '{ "host": "ci.raintech.su", "port": 22, "username": "ci", "password": "ifyouwanttohave"}' where id = 1;

update projects set deploy = '["git pull origin production", "npm install", "sudo systemctl restart ci"]' where id = 1;

select * from git_logs order by event_time desc;

insert into projects (project_name, branch, init, deploy, credentials, project_directory, test)
values ('billing-backend', 'production',
'[ "git clone git@bitbucket.org:raintechteam/billing-backend.git /usr/raintech/billing/billing-backend", "cd /usr/raintech/billing/billing-backend", "git pull origin production", "npm install" ]',
'["git pull origin production", "npm install", "sudo systemctl restart billing"]',
'{ "host": "billing.raintech.su", "user": "ci", "password": "ifyouwanttohave"}',
'/usr/raintech/billing',
'[ "cd /usr/raintech/billing/billing-backed" ]'
)

update projects set init = '[ "git clone git@bitbucket.org:raintechteam/ci-backend.git /usr/raintech/ci/ci-backend", "cd /usr/raintech/ci/ci-backend", "git pull origin production", "npm install" ]'
where id = 1;

update projects set test = '[ "cd /usr/raintech/billing/billing-backend" ]' where id = 2;

