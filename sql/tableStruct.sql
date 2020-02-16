create database ci;
create user master;
grant all on database ci to master;
alter user master password 'your-password-here';

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
    owner uuid not null,
    repository varchar(320),
    project_data jsonb not null default '{}'
);

create unique index projects_name_index on projects (project_name, owner);