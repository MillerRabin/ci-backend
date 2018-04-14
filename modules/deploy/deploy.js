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

async function deploy(params) {
    const dres = [];
    for (let command of params.projectData.deploy) {
        const result = await params.ssh.execCommand(command, { cwd: params.cwd });
        dres.push({
            command: command,
            cwd: params.cwd,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code
        });
        if (result.code != 0) return { results: dres, success: false };
    }
    return { results: dres, success: true };
}

async function testRepository(params) {
    const dres = [];
    const resObj = { results: dres, success: true };
    if (params.projectData.test == null) return resObj;
    for (let command of params.projectData.test) {
        const result = await params.ssh.execCommand(command, { cwd: params.cwd });
        dres.push({
            command: command,
            cwd: params.cwd,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code
        });
        if (result.code != 0) {
            resObj.success = false;
            return resObj;
        }
    }
    return resObj;
}

async function initRepository(params) {
    const dres = [];
    for (let command of params.projectData.init) {
        const result = await params.ssh.execCommand(command, { cwd: params.cwd });
        dres.push({
            command: command,
            cwd: params.cwd,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code
        });
        if (result.code != 0) return { results: dres, success: false };
    }
    return { results: dres, success: true };
}

async function reload(params) {
    const dres = [];
    const resObj = { results: dres, success: true };
    if (params.projectData.reload == null) return resObj;

    for (let command of params.projectData.reload) {
        const result = await params.ssh.execCommand(command, { cwd: params.cwd });
        dres.push({
            command: command,
            cwd: params.cwd,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code
        });
        if (result.code != 0) {
            resObj.success = false;
            return resObj;
        }
    }
    return resObj;
}

exports.start = async (projectData) => {
    async function ireload() {
        return await reload({ ssh, cwd, projectData });
    }
    const ssh = new node_ssh();
    await ssh.connect(projectData.credentials);
    const cwd = projectData.project_directory + '/' + projectData.project_name;
    const tres = await testRepository({ ssh, cwd, projectData });
    if (tres.success) {
        const dres = await deploy({ ssh, cwd, projectData });
        return { test: tres, deploy: dres, reload: ireload };
    } else {
        const ires = await initRepository({ ssh, cwd, projectData });
        return { test: tres, init: ires, reload: ireload };
    }
};



exports.test = async (application) => {
    const connection = await application.pool.connect();
    try {
        const pdata = await exports.getProject(connection, { project: 'billing-backend', branch: 'production'});
        if (pdata == null) return;
        await exports.start(pdata);
    } finally {
        await connection.release();
    }
};