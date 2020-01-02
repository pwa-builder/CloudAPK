const unzipProject = require('./unzipProject');
const build = require('./buildAPK');

module.exports = async (filePath) => {
    const projectPath = await unzipProject(filePath);
    
    console.info('projectPath', projectPath);
    return await build(projectPath);
     
   };
