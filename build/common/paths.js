/**
 * Paths
 */

define([], function () {

  var paths = {};

  // individual files
  paths.gulp = 'gulpfile.js';
  paths.sourceHash = 'dist/hash.txt';
  paths.srcBrowserTest = 'test/runner/browser/src_browser_test.js';

  // glob strings
  paths.source = 'src/**/*.js';
  paths.test = 'test/**/*.js';
  paths.testCase = 'test/case/**/*.js';
  paths.build = 'build/**/*.js';
  paths.dist = 'dist/**/*';

  // glob arrays
  paths.dev = [paths.gulp, paths.build];
  paths.client = [paths.source, paths.testCase];
  paths.all = [paths.gulp, paths.build, paths.source, paths.test];

  return paths;
});