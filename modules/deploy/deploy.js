const db = require('../postgres/postgres.js');

exports.start = async (projectData) => {
    console.log(projectData);
    return projectData;
};