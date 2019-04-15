const unzipProject = require('./unzipProject');
const build = require('./buildAPK');

module.exports = async (filePath) => {
    const projectPath = await unzipProject(filePath);
    return await build(projectPath);
     
   };