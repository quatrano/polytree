/**
 * Optimize Main
 */

define([
  'fs',
  'bluebird',
  'requirejs',
  'build/common/paths'
], function (fs, Promise, rjs, paths) {

return {
  run: function() {
    console.log('optimizing main...');
    console.time('optimize-main');
    var asyncOptimize = Promise.promisify(rjs.optimize);

    // Promise.promisify fails for some reason,
    // so construct promises manually

    var paths = {
      // TODO: which of these are necessary?
      bluebird: '../node_modules/bluebird/js/browser/bluebird',
      jquery: '../node_modules/jquery/dist/jquery',
      should: '../node_modules/should/should',
      sinon: '../node_modules/sinon/lib/sinon',

      polytree: '.',
      resource: '../test/resource',

      // excluded
      'ace': 'empty:',
      'd3': 'empty:',
      'immutable-devtools': 'empty:',
      'immutable': 'empty:',
      'lodash': 'empty:'
    };

    var polytreeOptimized = new Promise(function (resolve, reject) {
      rjs.optimize({
        useStrict: true,
        baseUrl: 'src',
        preserveLicenseComments: false,
        paths: paths,
        name: 'all_in_one',
        out: 'dist/all_in_one.js'
      }, resolve, reject);
    });
    var projectUtilOptimized = new Promise(function (resolve, reject) {
      rjs.optimize({
        useStrict: true,
        baseUrl: 'src',
        preserveLicenseComments: false,
        paths: paths,
        name: 'project_util',
        out: 'dist/project_util.js'
      }, resolve, reject);
    });
    var schemaUtilOptimized = new Promise(function (resolve, reject) {
      rjs.optimize({
        useStrict: true,
        baseUrl: 'src',
        preserveLicenseComments: false,
        paths: paths,
        name: 'schema_util',
        out: 'dist/schema_util.js'
      }, resolve, reject);
    });
    var specialFunctionsOptimized = new Promise(function (resolve, reject) {
      rjs.optimize({
        useStrict: true,
        baseUrl: 'src',
        preserveLicenseComments: false,
        paths: paths,
        name: 'special_functions',
        out: 'dist/special_functions.js'
      }, resolve, reject);
    });

    return Promise.join(polytreeOptimized, projectUtilOptimized, schemaUtilOptimized, specialFunctionsOptimized).then(function () {
      console.timeEnd('optimize-main');
    });
  }
};});