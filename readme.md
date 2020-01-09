#Backend part of Raintech CI

##Install
1. Clone project
2. You need to prepare database cluster. Use Postgres version >= 10, and setup user access for it.   
3. Install dependencies
```bash
    npm install
```
4. Run /sql/tableStruct.sql in context of create cluster to create database and all tables structure
5. Create /credentials.json
```json
{
  "databasePool": {
    "host": "your-cluster-host",
    "user": "master",
    "password": "your-password",
    "database": "ci",
    "port": "your-cluster-port",
    "max": 20,
    "idleTimeoutMillis": 30000,
    "connectionTimeoutMillis": 60000
  }
}
```   
6. Run project
```bash
    npm run debug
```