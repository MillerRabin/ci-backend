create database ci;
create user master;
grant all on database ci to master;
alter user master password 'ifyouwanttohave';
alter user postgres password 'ifyouwanttohave';