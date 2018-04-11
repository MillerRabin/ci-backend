const node_ssh = require('node-ssh');
const path = require('path');

exports.getProject = async (connection, data) => {
    const params = [];
    const where = [];
    if (data.project != null) where.push(`project_name = $${ params.push(data.project) }`);
    if (data.branch != null) where.push(`branch = $${ params.push(data.branch) }`);
    if (where.length == 0) throw new response.Error({ text: 'Invalid parameters'});
    const getQuery = [
        'select * from projects',
        (where.length > 0) ? 'where ' + where.join(' and ') : '',
        'limit 1'
    ];
    const pdata = await connection.query(getQuery.join(' '), params);
    if (pdata.rows.length == 0) return null;
    return pdata.rows[0];
};

exports.start = async (projectData) => {
    const dres = [];
    const ssh = new node_ssh();
    await ssh.connect(projectData.credentials);
    const cwd = projectData.project_directory + '/' + projectData.project_name;
    for (let command of projectData.deploy) {
        const result = await ssh.execCommand(command, { cwd: cwd });
        dres.push({
            command: command,
            cwd: cwd,
            stdout: result.stdout,
            stderr: result.stderr
        });
    }
    return { results: dres };
};

exports.test = async (application) => {
    const connection = await application.pool.connect();
    try {
        const pdata = await exports.getProject(connection, { project: 'ci-backend', branch: 'production'});
        if (pdata == null) return;
        await exports.start(pdata);
    } finally {
        await connection.release();
    }
};