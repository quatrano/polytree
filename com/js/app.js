/**
 * quatrano.github.io/polytree
 */

requirejs.config({
	paths: {
		polytree: '../../polytree',
		underscore: '../lib/underscore',
		jquery: '../lib/jquery',
		d3: '../lib/d3'
	},
    shim: {
    	underscore: {
      		exports: '_'
    	},
    	d3: {
      		exports: 'd3'
    	}
    }
});

requirejs(['underscore', 'polytree/ctx'],
	function (_, CTX) {
		var ctx = CTX.create('d', 'd_root');
		ctx.initialize();

		var config = ctx.compressProject({
			/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
			 * METHODS
			 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
			methods : [
				{
					id: 'initialize',
					fn: function () {
						// mouseDetected
						// from http://stackoverflow.com/a/9200505
						function onMouseMove(e) {
						  document.body.removeEventListener('mousemove', onMouseMove, false);
						  ctx.setState('mouseDetected', true);
						}
						document.body.addEventListener('mousemove', onMouseMove, false);

						// measure height and width now and on resize
						window.onresize = function () {
							ctx.run('measureDimensions')
						};
						$(window).trigger('resize');

						// capture location now and on hash change
						window.onhashchange = function () {
							ctx.run('captureHash')
						}
						$(window).trigger('hashchange');

						// load the application
						ctx.run('loadApplication');
					}
				},
				{
					id: 'loadApplication',
					fn: function () {
						var itemsToPreLoad = ctx.getState('itemsToPreLoad');

						function loadImg(imgUrl) {
							var loadingImages = ctx.getState('loadingImages');
							loadingImages.push(imgUrl);
							ctx.setState('loadingImages', loadingImages);
						}

						function loadJson(obj) {
							console.log(obj)
							$.ajax({
								url: obj.url,
								dataType: 'json'
							}).done(function (data) {
								ctx.setState(obj.id, data);
							}).fail(function (f) {
								console.log('error');
							}).always(function () {
								ctx.run('donePreLoading');
							});
							// .promise().then(function (data) {
							// 	console.log(data);
							// 	
							// });
						}

						_.each(itemsToPreLoad, function (item, index) {
							if (item.kind === 'image') {
								loadImg(item.url);
							} else if (item.kind === 'json'){
								loadJson(item);
							}
						});
						// ctx.render();
					}
				},
				{
					id: 'donePreLoading',
					fn: function () {
						var numItemsPreLoaded = ctx.getState('numItemsPreLoaded');
						// TODO: allow the user to get the value of a derived node in a more friendly way
						var numItemsToPreLoad = ctx.mn.lookup('numItemsToPreLoad').value;
						ctx.setState('numItemsPreLoaded', ++numItemsPreLoaded);
						console.log('donePreLoading');
						if (numItemsPreLoaded === numItemsToPreLoad) {
							window.setTimeout(function () {
								console.log('exec');
								ctx.setState('waiting', false);
								ctx.render();
							}, 200)
						}
					}
				},
				{
					id: 'measureDimensions',
					fn: function () {
						var $rootNode = $(document.getElementById(ctx.rootInstanceId));
						ctx.setState('windowDimensions', {
							height: $rootNode.innerHeight(),
							width: $rootNode.innerWidth()
						});	
						ctx.run('waitRender', [600, 'resize']);
					}
				},
				{
					id: 'waitRender',
					fn: function (delay, key) {
						var ctx = this;
						window.clearTimeout(ctx.getState(key));
						var timeout = window.setTimeout(function () {
							ctx.render();
						}, delay);
						ctx.setState(key, timeout);
					}
				},
				{
					id: 'captureHash',
					fn: function () {
						ctx.setState('location', window.location);
						ctx.render();
					}
				},
				{
					id: 'setHash',
					fn: function (hash) {
						window.location.hash = hash;
					}
				},
			],
			/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
			 * TRANSFORMATIONS
			 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
			transformations : [
				{	// pluck the value of a field from a list of objects
					id: 'pluck',
					fn: function (list, propertyName) {
						return _.pluck(list, propertyName);
					}
				},
				{	// return the length of an array (or string)
					id: 'length',
					fn: function (object) {
						return object.length;
					}
				},
				{	// return the difference between two numbers
					id: 'difference',
					fn: function (number1, number2) {
						return number1 - number2;
					}
				},
				{	// return the product of all arguments
					id: 'product',
					fn: function () {
						var product = 1;
						_.each(arguments, function (arg) {
							product = product * arg;
						});
						return product;
					}
				},
				{	// return the concatenation of all arguments
					id: 'concatenate',
					fn: function () {
						var output = '';
						_.each(arguments, function (arg) {
							output = output + arg;
						});
						return output;
					}
				},
				{	// concatenate the string to each primitive in the object
					id: 'concatToEach',
					fn: function (object, string) {
						function doConcat (obj) {
							if (typeof(obj) === 'string' || typeof(obj) === 'number') {
								return '' + obj + string;
							} else {
								var newObj = {};
								_.each(obj, function (value, key) {
									newObj[key] = doConcat(value);
								});
								return newObj;
							}
						}
						return doConcat(object, string);
					}
				},
				{	// scale each primitive by some factor
					id: 'scaleEach',
					fn: function (object, factor) {
						function doScale (obj) {
							if (typeof(obj) === 'number') {
								return (obj * factor).toFixed(2);
							} else {
								var newObj = {};
								_.each(obj, function (value, key) {
									newObj[key] = doScale(value);
								});
								return newObj;
							}
						}
						return doScale(object);
					}
				},
				{
					id: 'isReady',
					fn: function (numItemsRemainingToPreLoad, waiting) {
						if (numItemsRemainingToPreLoad === 0 && !waiting) {
							console.log('is ready');
							return ['ready'];
						} else {
							return [];
						}
					}
				},
				{
					id: 'isLoading',
					fn: function (numItemsRemainingToPreLoad, waiting) {
						if (numItemsRemainingToPreLoad > 0 || waiting) {
							return ['loading'];
						} else {
							return [];
						}
					}
				},
				{
					id: 'determineLayout',
					fn: function (maxWidth, minWidth, aspectRatio, windowDimensions) {
						// var maxHeight = maxWidth * aspectRatio;
						var minHeight = minWidth * aspectRatio;
						var ratio = windowDimensions.height / windowDimensions.width;

						var layout = {
							// column will extend past the bottom of the window
							scroll: true,	// true | false
							// the number of columns for the layout
							// only the single column layout can handle scrolling
							columns: 1		// 1 | 2
						};

						if (windowDimensions.height < minHeight) {
							layout.scroll = true;
							layout.columns = 1;
						} else {
							layout.scroll = false;
							if (windowDimensions.width >= 2 * minWidth) {
								layout.columns = 2;
							} else {
								layout.columns = 1;
							}
						}
						return layout;
					}
				},
				{
					id: 'panelScale',
					fn: function (maxWidth, minWidth, aspectRatio, windowDimensions, layout) {
						// scale * max width = width

						var maxHeight = maxWidth * aspectRatio;
						var minHeight = minWidth * aspectRatio;

						if (layout.columns == 1) {
							// single column
							if (layout.scroll) {
								// scrolling
								if (windowDimensions.width >= maxWidth) {
									return 1;
								} else if (windowDimensions.width <= minWidth) {
									return minWidth / maxWidth;
								} else {
									return windowDimensions.width / maxWidth;
								}
							} else {
								// no-scroll
								var extraHeight = (windowDimensions.height - maxHeight) / aspectRatio;
								var extraWidth = windowDimensions.width - maxWidth;
								if (extraWidth >= extraHeight) {
									// height is limited
									return windowDimensions.height / maxHeight;
								} else {
									// width is limited
									return windowDimensions.width / maxWidth;
								}
							}
						} else {
							// two column
							var twoColRatio = aspectRatio / 2;
							var extraHeight = (windowDimensions.height - maxHeight) / twoColRatio;
							var extraWidth = windowDimensions.width - (2 * maxWidth);
							if (extraWidth >= extraHeight) {
								// height is limited
								return windowDimensions.height / maxHeight;
							} else {
								// width is limited
								return windowDimensions.width / (2 * maxWidth);
							}
						}
					}
				},
				{
					id: 'containerStyle',
					fn: function (paddingTopBottom, paddingLeftRight) {
						return {
							'margin': paddingTopBottom + 'px ' + paddingLeftRight + 'px',
						};
					}
				},
				{
					id: 'calculatePageDimensions',
					fn: function (width, height) {
						return {
							'height': height + 'px',
							'width': width + 'px'
						};
					}
				},
				{
					id: 'pageInfo',
					fn: function (pages) {
						var hrefs = {};
						_.each(pages, function (page, index) {
							if (page.external) {
								hrefs[page.id] = {
									'href': page.href,
									'target': '_blank',
									'external': ['external']
								};
							} else {
								hrefs[page.id] = {
									'href': '#' + page.id,
									'target': '_self',
									'external': []
								}
							}
						});
						return hrefs;
					}
				},
				{
					id: 'getStateFromLocation',
					fn: function (location) {
						var ctx = this;
						var state = '';
						if (location && location.hash && typeof(location.hash) === 'string' && location.hash.length > 0) {
							var hash = location.hash.substring(1);
							if (hash === 'overview') {
								state = 'overview';
							} else if (hash === 'examples') {
								state = 'examples';
							} else {
								// invalid hash
								ctx.run('setHash', ['']);
							}
						}
						return state;
					}
				},
				{
					id: 'inOverview',
					fn: function (state) {
						if (state === 'overview') {
							return ['inOverview'];
						} else {
							return [];
						}
					}
				},
				{
					id: 'inExamples',
					fn: function (state) {
						if (state === 'examples') {
							return ['inExamples'];
						} else {
							return [];
						}
					}
				},
				{
					id: 'notHome',
					fn: function (state) {
						if (state !== '') {
							return ['notHome'];
						} else {
							return [];
						}
					}
				},
				{
					id: 'panelStyle',
					fn: function (layout, windowDimensions, panelHeight, panelWidth, state, paddingTopBottom, paddingLeftRight) {

						if (layout.scroll) {
							// scrolling
							var height = windowDimensions.height;
						} else {
							// not scrolling
							var height = panelHeight;
						}
						var width = panelWidth;
						if (layout.columns === 1) {
							// one column
							if (state === '') {
								// home
								return [{
									'height': height + 'px',
									'width': width + 'px',
									'top': 0,
									'bottom': 0,
									'padding': 0,
									'left': 0 + 'px',
								}, {
									'height': height + 'px',
									'width': width + 'px',
									'top': '-' + paddingTopBottom + 'px',
									'bottom': '-' + paddingTopBottom + 'px',
									'padding': paddingTopBottom + 'px 0px',
									'left': width + 'px',
								}];
							} else {
								// not-home
								return [{
									'height': height + 'px',
									'width': width + 'px',
									'top': 0,
									'bottom': 0,
									'padding': 0,
									'left': '-' + width + 'px',
								}, {
									'height': height + 'px',
									'width': width + 'px',
									'top': '-' + paddingTopBottom + 'px',
									'bottom': '-' + paddingTopBottom + 'px',
									'padding': paddingTopBottom + 'px 0px',
									'left': '0px',
								}];
							}
						} else {
							// two column
							if (state === '') {
								// home
								return [{
									'height': height + 'px',
									'width': width + 'px',
									'top': 0,
									'bottom': 0,
									'padding': 0,
									'left': (width / 2) + 'px',
								}, {
									'height': height + 'px',
									'width': width + 'px',
									'top': '-' + paddingTopBottom + 'px',
									'bottom': '-' + paddingTopBottom + 'px',
									'padding': paddingTopBottom + 'px 0px',
									'left': (3 * width / 2) + 'px',
								}];
							} else {
								// not-home
								return [{
									'height': height + 'px',
									'width': width + 'px',
									'top': 0,
									'bottom': 0,
									'padding': 0,
									'left': '0px',
								}, {
									'height': height + 'px',
									'width': width + 'px',
									'top': '-' + paddingTopBottom + 'px',
									'bottom': '-' + paddingTopBottom + 'px',
									'padding': paddingTopBottom + 'px 0px',
									'left': width + 'px',
								}];
							}
						}
					}
				},
				{	// create an array of keys from an object
					id: 'arrayOfKeys',
					fn: function (obj) {
						var result = [];
						_.each(obj, function (value, key) {
							result.push(key + '');
						});
						return result;
					}
				},
				{
					id: 'whiteBackgroundStyle',
					fn: function (gutter, layout, windowDimensions, height, width, paddingLeftRight) {
						var halfWidth = windowDimensions.width / 2;
						if (layout.columns == 1) {
							// one column
							return {
								'width': (width - gutter) + 'px',
								'hidden': {
									'left': (paddingLeftRight + gutter + 500) + 'px',
								},
								'visible': {
									'left': (paddingLeftRight + gutter) + 'px',
								}
							};
						} else {
							// two column
							return {
								'width': (width - gutter) + 'px',
								'hidden': {
									'left': (halfWidth + gutter + 500) + 'px',
								},
								'visible': {
									'left': (halfWidth + gutter) + 'px',
								}
							};
						}
					}
				},
				{
					id: 'paddingTopBottom',
					fn: function (windowDimensions, layout, panelHeight) {
						if (layout.scroll) {
							// scrolling
							return 0;
						} else {
							// not-scrolling
							return +((windowDimensions.height - panelHeight) / 2).toFixed(2);
						}
					}
				},
				{
					id: 'paddingLeftRight',
					fn: function (windowDimensions, layout, panelWidth) {
						if (layout.columns === 1) {
							// one column
							return +((windowDimensions.width - panelWidth) / 2).toFixed(2);
						} else {
							// two column
							return +((windowDimensions.width - (2 * panelWidth)) / 2).toFixed(2);
						}
					}
				},
				{
					id: 'textStyle',
					fn: function (sansFontStack, serifFontStack, scaledFontSizePx, gutter, panelWidth) {
						return {
							h1: {
								'fontFamily': sansFontStack,
								'fontSize': scaledFontSizePx.h1,
								'padding': (3 * gutter) + 'px ' + gutter + 'px ' + gutter + 'px',
							},
							h2: {
								'fontFamily': sansFontStack,
								'fontSize': scaledFontSizePx.h2,
								'padding': (2 * gutter) + 'px ' + gutter + 'px ' + '0px',
							},
							bq: {
								'fontFamily': serifFontStack,
								'fontSize': scaledFontSizePx.bq,
								'padding': (gutter / 2) + 'px ' + gutter + 'px ' + '0px',
							},
							p: {
								'fontFamily': serifFontStack,
								'fontSize': scaledFontSizePx.p,
								'padding': (gutter / 2) + 'px ' + gutter + 'px ' + '0px',
							},
						}
					}
				},
				{
					id: 'applyTextStyle',
					fn: function (textStyle, text) {
						var styledText = [];
						_.each(text, function (value, key) {
							styledText.push(textStyle[value.kind]);
						});
						return styledText;
					}
				},
				{
					id: 'fractionLoaded',
					fn: function (numItemsPreLoaded, numItemsToPreLoad) {
						if (numItemsToPreLoad == 0) {
							return 0;
						} else {
							return (numItemsPreLoaded / numItemsToPreLoad).toFixed(2);
						}
					}
				},
			],
			/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
			 * INPUT NODES
			 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
			originalDataNodes : [

				// CONSTANTS
				{	// the site is composed of panels
					// panels maintain a particular aspect ratio when scaled
					id: 'aspectRatio',
					value: 1.5
				},
				{	// the maximum width of a panel
					id: 'maxWidth',
					value: 550
				},
				{	// the minimum width of a panel
					id: 'minWidth',
					value: 305
				},
				{	// gutterFraction * panelWidth = gutter
					id: 'gutterFraction',
					value: 0.05 // 5% of the panel width
				},
				{	// dark gray color
					id: 'color',
					value: 'rgba(1, 62, 56, 1)'
				},
				{	// sans serif font stack - used for titles
					id: 'sansFontStack',
					value: 'Gotham, "Proxima Nova", Montserrat, “Helvetica Neue”, Helvetica, Arial, sans-serif'
				},
				{	// serif font stack - used for body
					id: 'serifFontStack',
					value: '"Roboto Slab", georgia, "times new roman", times, serif'
				},
				{	// font size (px) at max panel size
					id: 'fontSize',
					value: {
						h1: 44,
						h2: 30,
						bq: 30,
						p: 17,
					}
				},
				{	// padding (px) around button text at max panel size
					id: 'padding',
					value: {
						h1: 22,
						h2: 15,
					}
				},
				{	// border width (px) around buttons at max panel size
					id: 'borderWidth',
					value: 4
				},

				// STATIC CONTENT
				{	// manually load big files to reduce page load time, and
					// prevent the content from being visible in an incomplete state
					id: 'itemsToPreLoad',
					value: [{
						kind: 'image',
						url: 'com/img/trees.jpg',
					}, {
						kind: 'json',
						id: 'pages',
						url: 'com/content/pages.json',
					}]
				},
				{	// this is the overview text
					id: 'overview',
					value: [{
						kind: "h1",
						text: "OVERVIEW"
					}, {
						kind: "p",
						text: "The polytree paradigm and IDE are going to help people build web applications."
					}, {
						kind: "p",
						text: "I'm a software engineer at basis technology and sometimes I build web applications. For the most part I love writing software, but from time to time the task of building a web application is painful."
					}, {
						kind: "bq",
						text: "Why?"
					}, {
						kind: "p",
						text: "Web applications are becoming more complex and more dynamic, but the languages they’re built with - HTML & CSS - were made for simpler times.  CSS was designed to contain all the styles, HTML to contain the structure, and Javascript to contain the behavior.  This way of organizing your code made perfect sense when these languages were capable of fulfilling those jobs."
					}, {
						kind: "p",
						text: "Today, tools try to augment the capabilities of these languages, but the truth is we need a new paradigm.  A new way of thinking about web applications."
					}, {
						kind: "h2",
						text: "The Polytree Paradigm"
					}, {
						kind: "p",
						text: "A polytree app is composed of two parts, a data tree and a view tree."
					}, {
						kind: "p",
						text: "The data tree is like an excel spreadsheet in that data flows between nodes in the tree in the same way that data flows from cell to cell in a spreadsheet by way of functions."
					}, {
						kind: "p",
						text: "In a functioning polytree app, constants and runtime variables (such as responses from a RESTful service) are input into one end of the tree, and UI content and styles come out of the other end. The view tree is there waiting to scoop up output from the data tree and render it in the DOM."
					}, {
						kind: "h2",
						text: "The polytree IDE"
					}, {
						kind: "p",
						text: "The polytree IDE is the perfect place to build a polytree application."
					}, {
						kind: "p",
						text: "The IDE helps you define nodes in the two trees. It allows you to traverse the trees effortlessly so that you can gain a deep understanding of the structure of your application. The relationships between objects are explicit, so the IDE can identify unnecessary code and other anti-patterns."
					}, {
						kind: "p",
						text: "With these tools, the builder has more power than ever before to effectively build web applications."
					}]
				},
				{	// this is the example text (for now)
					id: 'examples',
					value: [{
						kind: "h1",
						text: "EXAMPLES"
					},
					{
						kind: 'p',
						text: 'coming soon'
					}]
				},

				// VARIABLES
				{	// this number is incremented as items are pre-loaded
					id: 'numItemsPreLoaded',
					value: 0
				},
				{	// this is an array of urls of images to pre-load
					id: 'loadingImages',
					value: []
				},
				{	// whether mouse movement has been detected
					// used to enable touch or click behavior
					id: 'mouseDetected',
					value: false
				},
				{	// window dimensions
					id: 'windowDimensions',
					value: {
						width: 0,
						height: 0
					}
				},
				{	// this is an additional control for the loading screen allowing it to
					// be 100% loaded, but not hide the loading screen 8======D
					id: 'waiting',
					value: true
				},
			],
			/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
			 * DATA NODES
			 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
			derivedDataNodes : [
				// CONSTANTS
				{
					id: 'maxHeight',
					transformations: [{
						id: 'product',
						arguments: [['pn', 'maxWidth'], ['pn', 'aspectRatio']]
					}]
				},
				{
					id: 'minHeight',
					transformations: [{
						id: 'product',
						arguments: [['pn', 'minWidth'], ['pn', 'aspectRatio']]
					}]
				},

				// VARIABLES
				{	// the total number of items to pre-load
					id: 'numItemsToPreLoad',
					transformations: [{
						id: 'length',
						arguments: [['pn', 'itemsToPreLoad']]
					}]
				},
				{	// the number of items remaining to pre-load
					id: 'numItemsRemainingToPreLoad',
					transformations: [{
						id: 'difference',
						arguments: [['mn', 'numItemsToPreLoad'], ['pn', 'numItemsPreLoaded']]
					}]
				},
				{
					id: 'fractionLoaded',
					transformations: [{
						id: 'fractionLoaded',
						arguments: [['pn', 'numItemsPreLoaded'], ['mn', 'numItemsToPreLoad']]
					}]
				},
				{
					id: 'percentLoaded',
					transformations: [{
						id: 'product',
						arguments: [['mn', 'fractionLoaded'], 100]
					},{
						id: 'concatenate',
						arguments: [[null], '%']
					}]
				},
				{	// when the array has one item, it means that the application is ready
					id: 'ready',
					transformations: [{
						id: 'isReady',
						arguments: [['mn', 'numItemsRemainingToPreLoad'], ['pn', 'waiting']]
					}]
				},
				{	// when the array has one item, it means that the application is loading
					id: 'loading',
					transformations: [{
						id: 'isLoading',
						arguments: [['mn', 'numItemsRemainingToPreLoad'], ['pn', 'waiting']]
					}]
				},
				{
					id: 'layout',
					transformations: [{
						id: 'determineLayout',
						arguments: [['pn', 'maxWidth'], ['pn', 'minWidth'], ['pn', 'aspectRatio'], ['pn', 'windowDimensions']]
					}]
				},
				{
					id: 'panelScale',
					transformations: [{
						id: 'panelScale',
						arguments: [['pn', 'maxWidth'], ['pn', 'minWidth'], ['pn', 'aspectRatio'], ['pn', 'windowDimensions'],  ['mn', 'layout']]
					}]
				},
				{
					id: 'panelWidth',
					transformations: [{
						id: 'product',
						arguments: [['mn', 'panelScale'], ['pn', 'maxWidth']]
					}]
				},
				{
					id: 'panelWidthPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'panelWidth'], 'px']
					}]
				},
				{
					id: 'panelHeight',
					transformations: [{
						id: 'product',
						arguments: [['mn', 'panelScale'], ['mn', 'maxHeight']]
					}]
				},
				{
					id: 'paddingTopBottom',
					transformations: [{
						id: 'paddingTopBottom',
						arguments: [['pn', 'windowDimensions'], ['mn', 'layout'], ['mn', 'panelHeight']]
					}]
				},
				{
					id: 'paddingTopBottomPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'paddingTopBottom'], 'px']
					}]
				},
				{
					id: 'paddingLeftRight',
					transformations: [{
						id: 'paddingLeftRight',
						arguments: [['pn', 'windowDimensions'], ['mn', 'layout'], ['mn', 'panelWidth']]
					}]
				},
				{
					id: 'paddingLeftRightPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'paddingLeftRight'], 'px']
					}]
				},
				{
					id: 'gutter',
					transformations: [{
						id: 'product',
						arguments: [['pn', 'gutterFraction'], ['mn', 'panelWidth']]
					}]
				},
				{
					id: 'gutterPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'gutter'], 'px']
					}]
				},
				{
					id: 'halfGutter',
					transformations: [{
						id: 'product',
						arguments: [['mn', 'gutter'], 0.5]
					}]
				},
				{
					id: 'halfGutterPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'halfGutter'], 'px']
					}]
				},
				{
					id: 'doubleGutter',
					transformations: [{
						id: 'product',
						arguments: [['mn', 'gutter'], 2]
					}]
				},
				{
					id: 'doubleGutterPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'doubleGutter'], 'px']
					}]
				},
				{
					id: 'tripleGutter',
					transformations: [{
						id: 'product',
						arguments: [['mn', 'gutter'], 3]
					}]
				},
				{
					id: 'tripleGutterPx',
					transformations: [{
						id: 'concatenate',
						arguments: [['mn', 'tripleGutter'], 'px']
					}]
				},
				{
					id: 'panelStyle',
					transformations: [{
						id: 'panelStyle',
						arguments: [['mn', 'layout'], ['pn', 'windowDimensions'], ['mn', 'panelHeight'], ['mn', 'panelWidth'], ['mn', 'state'], ['mn', 'paddingTopBottom'], ['mn', ['paddingLeftRight']]]
					}]
				},
				{
					id: 'pageDimensions',
					transformations: [{
						id: 'calculatePageDimensions',
						arguments: [['mn', 'panelWidth'], ['mn', 'panelHeight']]
					}]
				},
				{
					id: 'pageIds',
					transformations: [{
						id: 'pluck',
						arguments: [['pn', 'pages'], 'id']
					}]
				},
				{
					id: 'pageInfo',
					transformations: [{
						id: 'pageInfo',
						arguments: [['pn', 'pages']]
					}]
				},
				{
					id: 'state',
					transformations: [{
						id: 'getStateFromLocation',
						arguments: [['pn', 'location']]
					}]
				},
				{
					id: 'inOverview',
					transformations: [{
						id: 'inOverview',
						arguments: [['mn', 'state']]
					}]
				},
				{
					id: 'inExamples',
					transformations: [{
						id: 'inExamples',
						arguments: [['mn', 'state']]
					}]
				},
				{
					id: 'notHome',
					transformations: [{
						id: 'notHome',
						arguments: [['mn', 'state']]
					}]
				},
				{
					id: 'scaledFontSize',
					transformations: [{
						id: 'scaleEach',
						arguments: [['pn', 'fontSize'], ['mn', 'panelScale']]
					}]
				},
				{
					id: 'scaledFontSizePx',
					transformations: [{
						id: 'concatToEach',
						arguments: [['mn', 'scaledFontSize'], 'px']
					}]
				},
				{
					id: 'scaledBorderWidth',
					transformations: [{
						id: 'scaleEach',
						arguments: [['pn', 'borderWidth'], ['mn', 'panelScale']]
					}]
				},
				{
					id: 'scaledBorderWidthPx',
					transformations: [{
						id: 'concatToEach',
						arguments: [['mn', 'scaledBorderWidth'], 'px']
					}]
				},
				{
					id: 'scaledPadding',
					transformations: [{
						id: 'scaleEach',
						arguments: [['pn', 'padding'], ['mn', 'panelScale']]
					}]
				},
				{
					id: 'scaledPaddingPx',
					transformations: [{
						id: 'concatToEach',
						arguments: [['mn', 'scaledPadding'], 'px']
					}]
				},
				{
					id: 'overviewIds',
					transformations: [{
						id: 'arrayOfKeys',
						arguments: [['pn', 'overview']]
					}]
				},
				{
					id: 'exampleIds',
					transformations: [{
						id: 'arrayOfKeys',
						arguments: [['pn', 'examples']]
					}]
				},
				{
					id: 'whiteBackgroundStyle',
					transformations: [{
						id: 'whiteBackgroundStyle',
						arguments: [['mn', 'gutter'], ['mn', 'layout'], ['pn', 'windowDimensions'], ['mn', 'panelHeight'], ['mn', 'panelWidth'], ['mn', 'paddingLeftRight']]
					}]
				},
				{
					id: 'containerStyle',
					transformations: [{
						id: 'containerStyle',
						arguments: [['mn', 'paddingTopBottom'], ['mn', 'paddingLeftRight']]
					}]
				},
				{
					id: 'textStyle',
					transformations: [{
						id: 'textStyle',
						arguments: [['pn', 'sansFontStack'], ['pn', 'serifFontStack'], ['mn', 'scaledFontSizePx'], ['mn', 'gutter'], ['mn', 'panelWidth']]
					}]
				},
				{
					id: 'overviewTextStyle',
					transformations: [{
						id: 'applyTextStyle',
						arguments: [['mn', 'textStyle'], ['pn', 'overview']]
					}]
				},
				{
					id: 'examplesTextStyle',
					transformations: [{
						id: 'applyTextStyle',
						arguments: [['mn', 'textStyle'], ['pn', 'examples']]
					}]
				}
			],
			/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
			 * VIEW NODES
			 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
			viewNodes : [
				{
					id: 'root',
					tag: 'div',
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'height': '100%',
								'overflow': 'hidden',
								'background-color': 'black',
							}
						}
					}
				},

				// LOADING
				{
					id: 'loading',
					tag: 'div',
					parent: 'root',
					on: ['mn', 'loading'],
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'height': '100%',
								'overflow': 'hidden',
							},
						},
					},
				},
				{
					id: 'progress',
					tag: 'div',
					parent: 'loading',
					style: {
						enter: {
							instant: {
								'margin': 'auto',
								'position': 'absolute',
								'top': 0,
								'left': 0,
								'right': 0,
								'bottom': 0,
								'height': '5px',
								'width': ['mn', 'panelStyle', 0, 'width'],
							}
						},
						update: {
							transition: {
								'width': ['mn', 'panelStyle', 0, 'width'],
							}
						}
					}
				},
				{
					id: 'progressBar',
					tag: 'div',
					parent: 'progress',
					style: {
						enter: {
							instant: {
								'height': '100%',
								'width': '100%',
								'opacity': 0,
								'border-radius': '2px',
								'background-color': ['pn', 'color'],
							},
							transition: {
								'opacity': 1,
							}
						},
						exit: {
							transition: {
								'opacity': 0,
							}
						}
					}
				},
				{
					id: 'progressBarFill',
					tag: 'div',
					parent: 'progressBar',
					style: {
						enter: {
							instant: {
								'height': '100%',
								'width': '0%',
								'opacity': 0,
								'border-radius': '2px',
								'background-color': 'white',
							},
							transition: {
								'width': ['mn', 'percentLoaded'],
								'opacity': 1,
							}
						},
						update: {
							transition: {
								'opacity': 1,
								'width': ['mn', 'percentLoaded'],
							}
						}
					},
					duration: {
						update: 800
					},
					delay: {
						exit: 2000
					}
				},
				{
					id: 'preLoadImageArea',
					tag: 'div',
					parent: 'loading',
					style: {
						enter: {
							instant: {
								'position': 'fixed',
								'top': '-1000px',
								'left': '-1000px',
							}
						}
					}
				},
				{
					id: 'loadingImage',
					tag: 'img',
					parent: 'preLoadImageArea',
					on: ['pn', 'loadingImages'],
					attribute: {
						enter: {
							instant: {
								src: ['pn', 'loadingImages', ['index', 'loadingImage']]
							}
						}
					},
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'bottom': 0,
								'right': 0,
							}
						}
					},
					handle: {
						enter: {
							instant: {
								load:[{
									method: 'donePreLoading',
									arguments: []
								}],
							}
						}
					}
				},

				// READY
				{
					id: 'ready',
					tag: 'div',
					parent: 'root',
					on: ['mn', 'ready'],
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'height': '100%',
								'overflow': 'hidden',
							},
						},
					},
				},
				{
					id: 'backgroundImage',
					tag: 'div',
					parent: 'ready',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'top': 0,
								'left': 0,
								'bottom': 0,
								'right': 0,
								'z-index': 0,
								'background-image': 'url(com/img/trees.jpg)',
								'background-size': 'cover',
								'background-repeat': 'no-repeat',
								'opacity': 0,
							},
							transition: {
								'opacity': 0.8,
							}
						}
					},
					delay: {
						enter: 300
					},
					duration: {
						enter: 3000
					}
				},
				{
					id: 'whiteBackground',
					tag: 'div',
					parent: 'ready',
					on: ['mn', 'notHome'],
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'z-index': 1,
								'top': 0,
								'bottom': 0,
								'width': ['mn', 'whiteBackgroundStyle', 'width'],
								'left': ['mn', 'whiteBackgroundStyle', 'hidden', 'left'],
								'background-color': 'white',
								'opacity': 0,
							},
							transition: {
								'left': ['mn', 'whiteBackgroundStyle', 'visible', 'left'],
								'opacity': 0.8,
							}
						},
						update: {
							transition: {
								'width': ['mn', 'whiteBackgroundStyle', 'width'],
								'left': ['mn', 'whiteBackgroundStyle', 'visible', 'left'],
								'opacity': 0.8,
							}
						},
						exit: {
							transition: {
								'left': ['mn', 'whiteBackgroundStyle', 'hidden', 'left'],
								'opacity': 0,
							}
						},
					}
				},
				{
					id: 'container',
					tag: 'div',
					parent: 'ready',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'left': 0,
								'right': 0,
								'top': 0,
								'bottom': 0,
								'overflow': 'visible',
								'z-index': '1',
								'-webkit-font-smoothing': 'antialiased',
								'-moz-font-smoothing': 'antialiased',
								'-ms-font-smoothing': 'antialiased',
								'-o-font-smoothing': 'antialiased',
								'font-smoothing': 'antialiased',
								'color': ['pn', 'color'],
								'font-family': ['pn', 'serifFontStack'],
								'margin': ['mn', 'containerStyle', 'margin'],
								'opacity': 0
							},
							transition: {
								'opacity': 1
							}
						},
						update: {
							transition: {
								'margin': ['mn', 'containerStyle', 'margin'],
							},
						},
					},
					delay: {
						enter: 1000
					},
					duration: {
						enter: 2000
					}
				},
				{
					id: 'goHomeLink',
					tag: 'a',
					parent: 'container',
					on: ['mn', 'notHome'],
					attribute: {
						enter: {
							instant: {
								'href': '#',
							}
						}
					},
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'z-index': 1,
								'opacity': 0,
								'left': ['mn', 'panelStyle', 1, 'left'],
								'width': ['mn', 'gutterPx'],
								'height': ['mn', 'gutterPx'],
								'padding': ['mn', 'halfGutterPx'],
							},
							transition: {
								'opacity': 1,
							}
						},
						update: {
							transition: {
								'left': ['mn', 'panelStyle', 1, 'left'],
								'width': ['mn', 'gutterPx'],
								'height': ['mn', 'gutterPx'],
								'padding': ['mn', 'halfGutterPx'],
								'opacity': 1,
							}
						},
						exit: {
							transition: {
								'opacity': 0,
							}
						}
					},
					duration: {
						exit: 10
					},
					delay: {
						enter: 800
					},
				},
				{
					id: 'goHome',
					tag: 'div',
					parent: 'goHomeLink',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'top': 0,
								'left': ['mn', 'gutterPx'],
								'background-color': 'rgba(255,255,255,0.8)',
								'height': ['mn', 'doubleGutterPx'],
								'width': '0px',
								'z-index': '-1',
							},
							transition: {
								'left': '0px',
								'width': ['mn', 'gutterPx'],
							}
						},
						update: {
							transition: {
								'left': '0px',
								'width': ['mn', 'gutterPx'],
								'height': ['mn', 'doubleGutterPx'],
							}
						},
						exit: {
							transition: {
								'left': ['mn', 'gutterPx'],
								'width': 0,
							}
						}
					},
					delay: {
						enter: 500
					},
				},
				{
					id: 'goHomeX',
					tag: 'i',
					parent: 'goHomeLink',
					attribute: {
						enter: {
							instant: {
								'class': 'fa fa-chevron-left',
							}
						}
					},
					style: {
						enter: {
							instant: {
								'color': ['pn', 'color'],
								'opacity': 0,
								'font-size': ['mn', 'scaledFontSizePx', 'h2'],
							},
							transition: {
								'opacity': 1,
							}
						},
						update: {
							transition: {
								'font-size': ['mn', 'scaledFontSizePx', 'h2'],
								'opacity': 1,
							}
						}
					},
					delay: {
						enter: 1200
					},
				},
				{
					id: 'panelOne',
					tag: 'div',
					parent: 'container',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'overflow-y': 'scroll',
								'top': ['mn', 'panelStyle', 0, 'top'],
								'bottom': ['mn', 'panelStyle', 0, 'bottom'],
								'left': ['mn', 'panelStyle', 0, 'left'],
								'height': ['mn', 'panelStyle', 0, 'height'],
								'width': ['mn', 'panelStyle', 0, 'width'],
								'padding': ['mn', 'panelStyle', 0, 'padding'],
							}
						},
						update: {
							transition: {
								'top': ['mn', 'panelStyle', 0, 'top'],
								'bottom': ['mn', 'panelStyle', 0, 'bottom'],
								'left': ['mn', 'panelStyle', 0, 'left'],
								'height': ['mn', 'panelStyle', 0, 'height'],
								'width': ['mn', 'panelStyle', 0, 'width'],
								'padding': ['mn', 'panelStyle', 0, 'padding'],
							}
						}
					}
				},
				{
					id: 'home',
					tag: 'div',
					parent: 'panelOne',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'margin': '0 auto',
								'text-align': 'center',
								'height': ['mn', 'pageDimensions', 'height'],
								'width': ['mn', 'pageDimensions', 'width'],
							}
						},
						update: {
							transition: {
								'height': ['mn', 'pageDimensions', 'height'],
								'width': ['mn', 'pageDimensions', 'width'],
							}
						}
					}
				},
				{
					id: 'logo',
					tag: 'a',
					parent: 'home',
					attribute: {
						enter: {
							instant: {
								'href': '#'
							}
						}
					},
					text: {
						enter: {
							instant: 'POLYTREE | JS'
						}
					},
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'display': 'inline-block',
								'color': 'white',
								'text-decoration': 'none',
								'border-style': 'solid',
								'border-color': 'white',
								'padding': ['mn', 'scaledPaddingPx', 'h1'],
								'font-size': ['mn', 'scaledFontSizePx', 'h1'],
								'border-width': ['mn', 'scaledBorderWidthPx'],
								'font-family': ['pn', 'sansFontStack'],
								'margin-top': ['mn', 'tripleGutterPx'],
								
							}
						},
						update: {
							transition: {
								'padding': ['mn', 'scaledPaddingPx', 'h1'],
								'font-size': ['mn', 'scaledFontSizePx', 'h1'],
								'border-width': ['mn', 'scaledBorderWidthPx'],
								// 'font-family': ['pn', 'sansFontStack'],
								'margin-top': ['mn', 'tripleGutterPx'],
							}
						}
					}
				},
				{
					id: 'links',
					tag: 'div',
					parent: 'home',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'top': '35%',
								'bottom': 0,
								'left': 0,
								'right': 0,
								'text-align': 'center',
							}
						}
					}
				},
				{
					id: 'link',
					tag: 'div',
					parent: 'links',
					on: ['mn', 'pageIds'],
					style: {
						enter: {
							instant: {
								'text-align': 'center',
								'cursor': 'pointer',
								'color': 'inherit',
								'text-decoration': 'none',
								'padding': ['mn', 'gutterPx'],
								'margin': ['mn', 'gutterPx']
							}
						},
						update: {
							transition: {
								'padding': ['mn', 'gutterPx'],
								'margin': ['mn', 'gutterPx'],
							}
						}
					},
					
				},
				{
					id: 'linkText',
					tag: 'a',
					parent: 'link',
					text: {
						enter: {
							instant: ['pn', 'pages', ['index', 'link'], 'label']
						}
					},
					style: {
						enter: {
							instant: {
								'color': 'white',
								'text-decoration': 'none',
								'text-transform': 'uppercase',
								'padding': ['mn', 'scaledPaddingPx', 'h2'],
								'font-size': ['mn', 'scaledFontSizePx', 'h2'],
								'font-family': ['pn', 'sansFontStack'],
							}
						},
						update: {
							transition: {
								'padding': ['mn', 'scaledPaddingPx', 'h2'],
								'font-size': ['mn', 'scaledFontSizePx', 'h2'],
							}
						}
					},
					attribute: {
						enter: {
							instant: {
								'href': ['mn', 'pageInfo', ['id', 'link'], 'href'],
								'target': ['mn', 'pageInfo', ['id', 'link'], 'target'],
							}
						}
					}
				},
				{
					id: 'externalLinkIcon',
					tag: 'i',
					parent: 'link',
					on: ['mn', 'pageInfo', ['id', 'link'], 'external'],
					attribute: {
						enter: {
							instant: {
								'class': 'fa fa-external-link',
								'margin-left': '.25em',
							}
						}
					},
					style: {
						enter: {
							instant: {
								'color': 'white',
								'font-size': ['mn', 'scaledFontSizePx', 'h2'],
							}
						},
						update: {
							transition: {
								'font-size': ['mn', 'scaledFontSizePx', 'h2'],
							}
						}
					}
				},
				{
					id: 'panelTwo',
					tag: 'div',
					parent: 'container',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'overflow-y': 'scroll',
								'top': ['mn', 'panelStyle', 1, 'top'],
								'bottom': ['mn', 'panelStyle', 1, 'bottom'],
								'left': ['mn', 'panelStyle', 1, 'left'],
								'height': ['mn', 'panelStyle', 1, 'height'],
								'width': ['mn', 'panelStyle', 1, 'width'],
								'padding': ['mn', 'panelStyle', 1, 'padding'],
							}
						},
						update: {
							transition: {
								'top': ['mn', 'panelStyle', 1, 'top'],
								'bottom': ['mn', 'panelStyle', 1, 'bottom'],
								'left': ['mn', 'panelStyle', 1, 'left'],
								'height': ['mn', 'panelStyle', 1, 'height'],
								'width': ['mn', 'panelStyle', 1, 'width'],
								'padding': ['mn', 'panelStyle', 1, 'padding'],
							}
						}
					}
				},
				{
					id: 'overview',
					tag: 'div',
					parent: 'panelTwo',
					on: ['mn', 'inOverview'],
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'left': '5px',
								'opacity': 0,
								'width': ['mn', 'whiteBackgroundStyle', 'width'],
								'padding-left': ['mn', 'gutterPx'],
								'padding-bottom': ['mn', 'tripleGutterPx'],
							},
							transition: {
								'left': '0px',
								'opacity': 1,
							}
						},
						update: {
							transition: {
								'width': ['mn', 'whiteBackgroundStyle', 'width'],
								'padding-left': ['mn', 'gutterPx'],
								'padding-bottom': ['mn', 'tripleGutterPx'],
								'opacity': 1,
							}
						},
						exit: {
							transition: {
								'left': '5px',
								'opacity': 0,
							}
						}
					},
					duration: {
						exit: 100
					},
					delay: {
						enter: 600,
					},
				},
				{
					id: 'overviewText',
					tag: 'div',
					parent: 'overview',
					on: ['mn', 'overviewIds'],
					text: {
						enter: {
							instant: ['pn', 'overview', ['index', 'overviewText'], 'text']
						}
					},
					style: {
						enter: {
							instant: {
								'line-height': '1.5em',
								'font-family': ['mn', 'overviewTextStyle', ['index', 'overviewText'], 'fontFamily'],
								'font-size': ['mn', 'overviewTextStyle', ['index', 'overviewText'], 'fontSize'],
								'padding': ['mn', 'overviewTextStyle', ['index', 'overviewText'], 'padding'],
							}
						},
						update: {
							transition: {
								'font-family': ['mn', 'overviewTextStyle', ['index', 'overviewText'], 'fontFamily'],
								'font-size': ['mn', 'overviewTextStyle', ['index', 'overviewText'], 'fontSize'],
								'padding': ['mn', 'overviewTextStyle', ['index', 'overviewText'], 'padding'],
							}
						}
					}
				},
				{
					id: 'examples',
					tag: 'div',
					parent: 'panelTwo',
					on: ['mn', 'inExamples'],
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'left': '5px',
								'opacity': 0,
								'width': ['mn', 'whiteBackgroundStyle', 'width'],
								'padding-left': ['mn', 'gutterPx'],
								'padding-bottom': ['mn', 'tripleGutterPx'],
							},
							transition: {
								'left': '0px',
								'opacity': 1,
							}
						},
						update: {
							transition: {
								'width': ['mn', 'whiteBackgroundStyle', 'width'],
								'padding-left': ['mn', 'gutterPx'],
								'padding-bottom': ['mn', 'tripleGutterPx'],
								'opacity': 1,
							}
						},
						exit: {
							transition: {
								'left': '5px',
								'opacity': 0,
							}
						}
					},
					duration: {
						exit: 100
					},
					delay: {
						enter: 800
					},
				},
				{
					id: 'exampleText',
					tag: 'div',
					parent: 'examples',
					on: ['mn', 'exampleIds'],
					text: {
						enter: {
							instant: ['pn', 'examples', ['index', 'exampleText'], 'text']
						}
					},
					style: {
						enter: {
							instant: {
								'line-height': '1.5em',
								'font-family': ['mn', 'examplesTextStyle', ['index', 'exampleText'], 'fontFamily'],
								'font-size': ['mn', 'examplesTextStyle', ['index', 'exampleText'], 'fontSize'],
								'padding': ['mn', 'examplesTextStyle', ['index', 'exampleText'], 'padding'],
							}
						},
						update: {
							transition: {
								'font-family': ['mn', 'examplesTextStyle', ['index', 'exampleText'], 'fontFamily'],
								'font-size': ['mn', 'examplesTextStyle', ['index', 'exampleText'], 'fontSize'],
								'padding': ['mn', 'examplesTextStyle', ['index', 'exampleText'], 'padding'],
							}
						}
					}
				},
			]
		});
		ctx.configure(config);

	window.ctx = ctx;
	ctx.execute('initialize');
});