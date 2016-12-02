/**
 * Node Server
 */

define([
  'lodash',
  'fs',
  'express',
  'browser-sync'
], function (_, fs, express, bs) {

function buildMiddleware (instance) {
  var app = express();
  var router = express.Router();

  // TODO: simplify this using options
  app.set('nodePort', process.env.NODE_PORT || process.env.npm_package_config_NODE_PORT || 3000);
  app.set('baseDir', process.env.PWD);

  // generated resources
  router.get('/generated/*/*$', function (req, res) {
    var modulePath = app.get('baseDir') + '/' + req.params[0] + '/generate.js';
    fs.stat(modulePath, function (err, stats) {
      if (!err && stats.isFile()) {
        requirejs.undef(modulePath); // reload the module in case it has changed
        requirejs(modulePath)(req, res);
      } else {
        var errorMessage = 'bad module path: ' + modulePath;
        console.log(errorMessage);
        res.send(errorMessage);
      }
    });
  });

  // redirect to browser unit tests by default
  router.get('/', function (req, res) {
    res.redirect('/generated/test/runner/browser/test/index.html');
  });

  // require.js
  router.get('/require.js', function (req, res) {
    res.sendFile(app.get('baseDir') + '/node_modules/requirejs/require.js');
  });

  app.use(router);

  // static
  app.use(express.static(app.get('baseDir')));
  return app;
}

var ServerPrototype = {
  start: function (options) {
    var bsInstance = bs.create();
    bsInstance.init({
      open: false, // prevent opening a browser tab
      server: '.',
      middleware: [buildMiddleware(this)]
    });
    this.bsInstance = bsInstance;
    return this;
  },
  setOptions: function (options) {
    this.options = options;
    this.reload();
  },
  reload: function () {
    this.bsInstance.reload();
  },
  stop: function () {
    // TODO: the old server instance seems to stick around for a while
    this.bsInstance.exit();
  }
};

return {
  build: function (options) {
    var instanceProperties = {
      options: {
        value: options,
        writable: true
      },
      bsInstance: {
        value: undefined,
        writable: true
      }
    };
    return Object.create(ServerPrototype, instanceProperties);
  }
};});