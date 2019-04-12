const unzipProject = require('./unzipProject');
const build = require('./buildAPK');

module.exports = async (filePath) => {
    const projectPath = await unzipProject(filePath);
    return await build(projectPath);
     
   };

// unzipProject recibe el filename
// la promesa de unzipProject devuelve el project path. 
// build recibe el project Path y devuelve el path del APK.