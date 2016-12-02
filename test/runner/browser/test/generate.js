/**
 * Generate browser unit test runner
 */

define([
  'lodash',
  'fs',
  'glob',
  
  'build/common/paths',
  'module'
], function (_, fs, glob,
  paths, module) {

function getModuleDir () {
  var uri = module.uri;
  return uri.substring(0, uri.lastIndexOf("/"));
}

function getTemplateParams () {
   var tests = _(glob.sync(paths.testCase)).reduce(function (result, path) {

    // separate strings with "<comma><space>"
    if (result.length) result += ', ';

    // surround with "<double-quote>" and remove ".js" from the end
    result += ('"' + path.substring(0, path.length - 3) + '"');
    return result;
  }, '');
  return {
    baseUrl: '../../../../..',
    tests: tests
  };
}

return function (req, res) {
  // var file = req.params[1]; // assume file is always index.html
  // var query = req.query; // no query params for now
  var moduleDir = getModuleDir();
  fs.readFile(moduleDir + '/index.html.template', function (err, data) {
      if (err) console.log(err);
      res.send(_.template(data.toString())(getTemplateParams()));
    });
};});