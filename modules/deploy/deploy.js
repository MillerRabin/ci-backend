const node_ssh = require('node-ssh');
const response = require('../../middlewares/response.js');

function getCommand(command, params) {
    if (command.cwd != null) {
        params.cwd = command.cwd
    }
    return (command.command != null) ? command.command : command;
}

async function executeCommands(commands, params) {
    const dres = [];
    if (commands == null)
        return { results: dres, success: false };

    for (let command of commands) {
        const execCommand = getCommand(command, params);
        const result = await params.ssh.execCommand(execCommand, { cwd: params.cwd });
        if ((command == null) || (command == '')) continue;
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

async function deploy(params) {
    return await executeCommands(params.config.deploy, params)
}

async function testRepository(params) {
    return await executeCommands(params.config.test, params);
}

async function initRepository(params) {
    return await executeCommands(params.config.init, params);
}

async function reload(params) {
    return await executeCommands(params.config.reload, params);
}

exports.start = async (project) => {
    async function ireload() {
        return await reload({ ssh, cwd, project });
    }
    const projectData = project.project_data;
    const res = [];
    if (projectData == null) throw new response.Error({ message: 'project_data is null'});
    if (!Array.isArray(projectData)) throw new response.Error({ message: 'project_data must be array of configurations'});

    for (let config of projectData) {
        const ssh = new node_ssh();
        try {
            if ((config.name == null) || (config.name == '')) throw new response.Error({ message: 'Configuration without name is invalid'});
            if (config.credentials == null) throw new response.Error({ message: `credentials expected for configuration ${ config.name }`});
            await ssh.connect(config.credentials);
            const cwd = config.directory + '/' + project.name;
            const tres = await testRepository({ ssh, cwd, config });
            if (tres.success) {
                const dres = await deploy({ ssh, cwd, config });
                res.push({ test: tres, deploy: dres, reload: ireload, name: config.name });
            } else {
                const ires = await initRepository({ ssh, cwd, config });
                res.push({ test: tres, init: ires, reload: ireload, name: config.name });
            }
        } finally {
            ssh.dispose();
        }
    }
    return res;
};