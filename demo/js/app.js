/**
 * Polytree.js • TodoMVC
 */

requirejs.config({
    baseUrl: '/demo/lib',
    paths: {
        demo: '../js',
        polytree: '../../polytree',
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
			methods : [
				{
					id: 'initialize',
					fn: function () {
						// don't persist todos in local storage to facilitate testing
						// ctx.run('get');  
					}
				},
				{
					id: 'get',
					fn: function () {
						var STORAGE_ID = ctx.getState('storageId');
						var todos = JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
						ctx.setState('todos', todos);
					}
				},
				{
					id: 'put',
					fn: function () {
						var STORAGE_ID = ctx.getState('storageId');
						var todos = ctx.getState('todos');
						localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
					}
				},
				{
					id: 'setTodos',
					fn: function (todos) {
						ctx.setState('todos', todos);
						ctx.run('put');
					}
				},
				{
					id: 'toggleCompleted',
					fn: function (todoId) {
						var todos = ctx.getState('todos');
						var todoIndex = -1;
						for (var i=0; i<todos.length; i++) {
							var todo = todos[i];
							if (todo.id === todoId) {
								todoIndex = i;
							}
						}
						if (todoIndex > -1) {
							var completed = todos[todoIndex].completed;
							todos[todoIndex].completed = !completed;
							ctx.run('setTodos', [todos]);
						}
					}
				},
				{
					id: 'keypress',
					fn: function (todoIndex) {
						// catch ENTER key
						var e = d3.event;
						if (e) {
							var keyCode = e.keyCode;
							if (keyCode === 13) {
								e.preventDefault();
								// new todo
								if (todoIndex === -1) {
									ctx.run('createTodo', []);
									e.srcElement.value = '';
								// edited todo
								} else {
									ctx.run('updateTodo', [todoIndex]);
									ctx.run('stopEditing', []);
								}
							}
						}
					}
				},
				{
					id: 'keyup',
					fn: function (todoIndex) {
						var e = d3.event;
						if (e && e.srcElement) {
							// capture the working text
							var workingText = e.srcElement.value;
							ctx.setState('workingText', workingText);

							// catch ESC key
							var keyCode = e.keyCode;
							if (keyCode === 27) {
								ctx.run('stopEditing', []);
							}
						}
					}
				},
				{
					id: 'updateTodo',
					fn: function (todoIndex) {
						var newTodoText = ctx.getState('workingText');
						// delete todo
						if (newTodoText.trim().length === 0) {
							ctx.run('deleteTodo', [todoIndex]);
						// update todo
						} else {
							var todos = ctx.getState('todos');
							todos[todoIndex].text = newTodoText;
							ctx.setState('todos', todos);
							console.log('updated todo #' + todoIndex + ': ' + newTodoText);
						}
					}
				},
				
				{
					id: 'clearCompletedTodos',
					fn: function () {
						var todos = ctx.getState('todos');
						var inProgress = [];
						_.each(todos, function (todo, index) {
							if (!todo.completed) {
								inProgress.push(todo);
							}
						});
						ctx.setState('todos', inProgress);
						ctx.run('put');
					}
				},
				{
					id: 'markAll',
					fn: function (completed) {
						var todos = ctx.getState('todos');
						_.each(todos, function (todo, index) {
							todo.completed = !completed;
						});
						ctx.run('setTodos', [todos]);
					}
				},
				{
					id: 'deleteTodo',
					fn: function (index) {
						var todos = ctx.getState('todos');
						todos.splice(index, 1);
						console.log('removing todo ' + index);
						ctx.run('setTodos', [todos]);
					}
				},
				{
					id: 'createTodo',
					fn: function () {
						var todoText = ctx.getState('workingText');
						var todos = ctx.getState('todos');
						var newTodo = {
							text: todoText,
							id: new Date().valueOf().toString(),
							completed: false
						};
						todos.push(newTodo);
						ctx.run('setTodos', [todos]);
					}
				},
				{
					id: 'editTodo',
					fn: function (todoIndex) {
						var editing = ctx.getState('editing');
						if (todoIndex != editing) {
							ctx.setState('editing', todoIndex);
							if (todoIndex > -1) {
								var workingText = ctx.getState('todos')[todoIndex].text;
								ctx.setState('workingText', workingText);
							}
						}
					}
				},
				{
					id: 'setCurrentFilter',
					fn: function (filterIndex) {
						var currentFilter = ctx.getState('currentFilter');
						if (filterIndex != currentFilter) {
							ctx.setState('currentFilter', filterIndex);
						}
					}
				},
				{
					id: 'hoverElement',
					fn: function (hoveredStateName, index, enter) {
						if (enter) {
							var hoveredElement = ctx.getState(hoveredStateName);
							if (hoveredElement != index) {
								ctx.setState(hoveredStateName, index);
							}
						} else {
							var hoveredElement = ctx.getState(hoveredStateName);
							if (hoveredElement == index) {
								ctx.setState(hoveredStateName, -1);
							}
						}
					}
				},
				{
					id: 'stopEditing',
					fn: function () {
						var editing = ctx.getState('editing');
						if (editing != -1) {
							ctx.setState('workingText', '');
							ctx.run('editTodo', [-1]);
						}
						console.log('stop editing');
					}
				}],
			transformations : [
				{
					id: 'show_placeholder',
					fn: function (length) {
						if (length > 0) {
							return [];
						} else {
							return ['true'];
						}
					}
				},
				{
					id: 'get_new_todo_working_text',
					fn: function (string, editing) {
						if (editing === -1) {
							return string;
						} else {
							return '';
						}
					}
				},
				{
					id: 'get_string_length',
					fn: function (string) {
						if (typeof(string) == 'string') {
							return string.length;
						} else {
							return 0;
						}
					}
				},
				{
					id: 'pluck',
					fn: function (list, propertyName) {
						return _.pluck(list, propertyName);
					}
				},
				{
					id: 'index_by',
					fn: function (list, key) {
						return _.indexBy(list, key);
					}
				},
				{
					id: 'length',
					fn: function (array) {
						return array.length;
					}
				},
				{
					id: 'filter_todos',
					fn: function (todos, currentFilterIndex, filters) {
						var currentFilterId = filters[currentFilterIndex].id;
						if (currentFilterId === 'all') {
							return todos;
						} else {
							var filteredTodos = [];
							_.each(todos, function (todo) {
								if (currentFilterId === 'completed' && todo.completed) {
									filteredTodos.push(todo);
								} else if (currentFilterId === 'active' && !todo.completed) {
									filteredTodos.push(todo);
								}
							});
							return filteredTodos;
						}
					}
				},
				{
					id: 'divide_each',
					fn: function (inputObj, factor) {
						function divide_each (obj) {
							if (typeof(obj) === 'string' || typeof(obj) === 'number') {
								return +obj / factor;
							} else {
								var newObj = {};
								_.each(obj, function (value, key) {
									newObj[key] = divide_each(value);
								})
								return newObj;
							}
						}
						return divide_each(inputObj);
					}
				},
				{
					id: 'get_positions',
					fn: function (dimensions, columns, rows) {
						var positions = [];
						for (var i=0; i<columns; i++) {
							positions[i] = [];
							for (var j=0; j<rows; j++) {
								positions[i][j] = {
									left: dimensions.width * i,
									top: dimensions.height * j
								};
							}
						}
						return positions;
					}
				},
				{
					id: 'percent_of_max',
					fn: function (lookup, valueKey) {
						var result = {};
						var keys = _.keys(lookup);
						if (keys.length > 0) {
							// find the max value
							var max = lookup[keys[0]][valueKey];
							_.each(keys, function (key) {
								if (lookup[key][valueKey] > max) {
									max = lookup[key][valueKey];
								}
							});
							// get percents
							_.each(keys, function (key) {
								result[key] = (lookup[key][valueKey] / max);
							});
						}
						return result;
					}
				},
				{
					id: 'evenly_distribute',
					fn: function (itemCount, space) {
						// eg: if space is 100 and there are 5 items, the distribution would be:
						// [10, 30, 50, 70, 90]
						var result = [];
						var spacePerItem = space / itemCount;
						var halfSpace = spacePerItem / 2;
						for (var i=0; i<itemCount.length; i++) {
							var itemPosition = halfSpace + (i * spacePerItem);
							result.push(itemPosition);
						}
						return result;
					},
				},
				{
					id: 'create_todo_lookup',
					fn: function (todos, editing, hovered, colors) {
						var lookup = {};
						_.each(todos, function (todo, index, todos) {
							thisItem = {};

							// depend on index = editing (make text editable)
							if (index == editing) {
								thisItem.showView = [];
								thisItem.showEdit = ['true'];
							} else {
								thisItem.showView = ['true'];
								thisItem.showEdit = [];
							}

							// depend on index = hovered (show and hide delete button)
							if (index == hovered) {
								thisItem.showDelete = ['true'];
							} else {
								thisItem.showDelete = [];
							}

							// depending on index = last (border-bottom)
							if (index != (todos.length - 1)) {
								thisItem['border-bottom'] = '1px dotted #ccc';
							} else {
								thisItem['border-bottom'] = 'none';
							}

							// depending on todo.completed (color and shadow)
							if (todo.completed) {
								thisItem.color = colors.completedColor;
								thisItem.shadow = colors.completedShadow;
								thisItem['text-decoration'] = 'line-through';
							} else {
								thisItem.color = colors.inProgressColor;
								thisItem.shadow = colors.inProgressShadow;
								thisItem['text-decoration'] = 'none';
							}

							lookup[todo.id] = thisItem;
						});
						return lookup;
					},
				},
				{
					id: 'create_filter_lookup',
					fn: function (filters, currentFilter) {
						var lookup = {};
						_.each(filters, function (filter, index, filters) {
							if (index == currentFilter) {
								lookup[filter.id] = {
									fontWeight: 'bold'
								}
							} else {
								lookup[filter.id] = {
									fontWeight: 'normal'
								}
							}
						});
						return lookup;
					}
				},
				{
					id: 'extract_about',
					fn: function (todos) {
						var about = {
							remainingCount: 0,
							completedCount: 0,
							allChecked: true
						};
						var allCompleted = true;
						_.each(todos, function (todo) {
							if (todo.completed) {
								about.completedCount++;
							} else {
								about.remainingCount++;
							}
						});
						if (about.remainingCount > 0) {
							about.allChecked = false;
						} else {
							about.allChecked = true;
						}
						return about;
					},
				},
				{
					id: 'concat_px_each',
					fn: function (objArr) {
						function concat_px (obj) {
							if (typeof(obj) === 'string' || typeof(obj) === 'number') {
								return obj + 'px';
							} else {
								var newObj = {};
								_.each(obj, function (value, key) {
									newObj[key] = concat_px(value);
								})
								return newObj;
							}
						}
						return concat_px(objArr);
					}
				},
				{
					id: 'stringify_each',
					fn: function (objArr) {
						function stringify (obj) {
							if (typeof(obj) === 'string' || typeof(obj) === 'number') {
								return obj + '';
							} else {
								var newObj = {};
								_.each(obj, function (value, key) {
									newObj[key] = stringify(value);
								})
								return newObj;
							}
						}
						return stringify(objArr);
					}
				},
				{
					id: 'obj_to_array',
					fn: function (obj) {
						var result = [];
						var toContinue = true;
						var i=0;
						while (toContinue) {
							if (typeof(obj[i]) != 'undefined') {
								result.push(obj[i]);
								i++;
							} else {
								toContinue = false;
							}
						}
						return result;
					}
				},
				{
					id: 'concat_%',
					fn: function (string) {
						return string + '%';
					}
				},
				{
					id: '!!',
					fn: function (obj) {
						return !!obj;
					}
				},
				{
					id: '!',
					fn: function (obj) {
						return !obj;
					}
				},
				{
					id: '?:',
					fn: function (obj, ifTrue, ifFalse) {
						return obj ? ifTrue : ifFalse;
					}
				}],
			originalDataNodes : [
				{
					id: 'hoveredXStyle',
					value: [
						['text-shadow', '0 0 1px #000, 0 0 10px rgba(199, 107, 107, 0.8)'],
						['-webkit-transform', 'scale(1.3)'],
						['-ms-transform', 'scale(1.3)'],
						['transform', 'scale(1.3)']
					]
				},
				{
					id: 'storageId',
					value: 'todos-angularjs'
				},
				{
					id: 'editing',
					value: -1
				},
				{
					id: 'hoveredTodo',
					value: -1
				},
				{
					id: 'colors',
					value: {
						'completedColor': '#d9d9d9',
						'completedShadow': '0 -1px 0 #bfbfbf',
						'inProgressColor': '#85ada7',
						'inProgressShadow': '0 1px 0 #669991'
					}
				},
				{ // start with a few todos in the app to facilitate testing
					id: 'todos',
					value: [{
						id: '0',
						text: 'example todo',
						completed: true
					},
					{
						id: '1',
						text: 'example todo 2',
						completed: false
					},
					{
						id: '2',
						text: 'example todo 3',
						completed: false
					}]
				},
				{
					id: 'currentFilter',
					value: 0
				},
				{
					id: 'filters',
					value: [{
						id: 'all',
						text: 'All'
					},
					{
						id: 'active',
						text: 'Active'
					},
					{
						id: 'completed',
						text: 'Completed'
					}]
				},
				{
					id: 'contributors',
					value: [{
						name: 'Alex Quatrano',
						href: 'https://github.com/quatrano'
					}]
				},
				{
					id: 'workingText',
					value: ''
				}],
			derivedDataNodes : [
				{
					id: 'newTodoWorkingText',
					transformations: [{
						id: 'get_new_todo_working_text',
						arguments: [['pn', 'workingText'], ['pn', 'editing']]
					}]
				},
				{
					id: 'newTodoWorkingTextLength',
					transformations: [{
						id: 'get_string_length',
						arguments: [['mn', 'newTodoWorkingText']]
					}]
				},
				{
					id: 'showNewTodoPlaceholder',
					transformations: [{
						id: 'show_placeholder',
						arguments: [['mn', 'newTodoWorkingTextLength']]
					}]
				},
				{
					id: 'aboutTodos',
					transformations: [{
						id: 'extract_about',
						arguments: [['pn', 'todos']]
					}]
				},
				{
					id: 'filteredTodos',
					transformations: [{
						id: 'filter_todos',
						arguments: [['pn', 'todos'], ['pn', 'currentFilter'], ['pn', 'filters']]
					}]
				},
				{
					id: 'todoLookup',
					transformations: [{
						id: 'create_todo_lookup',
						arguments: [['mn', 'filteredTodos'], ['pn', 'editing'], ['pn', 'hoveredTodo'], ['pn', 'colors']]
					}]
				},
				{
					id: 'todoIds',
					transformations: [{
						id: 'pluck',
						arguments: [['mn', 'filteredTodos'], 'id']
					}]
				},
				{
					id: 'filterIds',
					transformations: [{
						id: 'pluck',
						arguments: [['pn', 'filters'], 'id']
					}]
				},
				{
					id: 'filterLookup',
					transformations: [{
						id: 'create_filter_lookup',
						arguments: [['pn', 'filters'], ['pn', 'currentFilter']]
					}]
				},],
			viewNodes : [
				{
					id: 'root',
					tag: 'div',
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'height': '100%',
								'overflow': 'scroll',
								'z-index': '0',
								'background-color': 'rgb(234, 234, 234)',
								'background-image': 'url(demo/img/bg-1.png)'
							}
						}
					}
				},
				{
					id: 'container',
					tag: 'div',
					parent: 'root',
					style: {
						enter: {
							instant: {
								'font': '14px "Helvetica Neue", Helvetica, Arial, sans-serif',
								'line-height': '1.4em',
								'color': '#4d4d4d',
								'width': '550px',
								'margin': '0 auto',
								'-webkit-font-smoothing': 'antialiased',
								'-moz-font-smoothing': 'antialiased',
								'-ms-font-smoothing': 'antialiased',
								'-o-font-smoothing': 'antialiased',
								'font-smoothing': 'antialiased'
							}
						}
					}
				},
				{
					id: 'todo-app',
					tag: 'section',
					parent: 'container',
					style: {
						enter: {
							instant: {
								'background': '#fff',
								'background': 'rgba(255, 255, 255, 0.9)',
								'margin': '130px 0 40px 0',
								'border': '1px solid #ccc',
								'position': 'relative',
								'border-top-left-radius': '2px',
								'border-top-right-radius': '2px',
								'box-shadow': '0 2px 6px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.15)'
							}
						}
					}
				},
				{
					id: 'todo-app:before',
					tag: 'span',
					parent: 'todo-app',
					style: {
						enter: {
							instant: {
								'border-left': '1px solid #f5d6d6',
								'border-right': '1px solid #f5d6d6',
								'width': '2px',
								'position': 'absolute',
								'top': '0',
								'left': '40px',
								'height': '100%'
							}
						}
					}
				},
				{
					id: 'header',
					tag: 'header',
					parent: 'todo-app',
					style: {
						enter: {
							instant: {
								'padding-top': '15px',
								'border-radius': 'inherit'
							}
						}
					}
				},
				{
					id: 'header:before',
					tag: 'span',
					parent: 'header',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'top': '0',
								'right': '0',
								'left': '0',
								'height': '15px',
								'z-index': '2',
								'border-bottom': '1px solid #6c615c',
								'background': '#8d7d77',
								// 'background': '-webkit-gradient(linear, left top, left bottom, from(rgba(132, 110, 100, 0.8)),to(rgba(101, 84, 76, 0.8)))',
								// 'background': '-webkit-linear-gradient(top, rgba(132, 110, 100, 0.8), rgba(101, 84, 76, 0.8))',
								// 'background': 'linear-gradient(top, rgba(132, 110, 100, 0.8), rgba(101, 84, 76, 0.8))',
								'filter': 'progid:DXImageTransform.Microsoft.gradient(GradientType=0,StartColorStr="#9d8b83", EndColorStr="#847670")',
								'border-top-left-radius': '1px',
								'border-top-right-radius': '1px'
							}
						}
					}
				},
				{
					id: 'todo-header',
					tag: 'h1',
					parent: 'header',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'top': '-120px',
								'width': '100%',
								'font-size': '70px',
								'font-weight': 'bold',
								'text-align': 'center',
								'color': '#b3b3b3',
								'color': 'rgba(255, 255, 255, 0.3)',
								'text-shadow': '-1px -1px rgba(0, 0, 0, 0.2)',
								'-webkit-text-rendering': 'optimizeLegibility',
								'-moz-text-rendering': 'optimizeLegibility',
								'-ms-text-rendering': 'optimizeLegibility',
								'-o-text-rendering': 'optimizeLegibility',
								'text-rendering': 'optimizeLegibility'
							}
						}
					},
					text: {
						enter: {
							instant: "todos"
						}
					}
				},
				{
					id: 'todo-form',
					tag: 'form',
					parent: 'header',
					style: {
						enter: {
							instant: {
								display: 'block',
								position: 'relative',
								overflow: 'hidden'
							}
						}
					}
				},
				{
					id: 'new-todo-placeholder',
					tag: 'span',
					parent: 'todo-form',
					on: ['mn', 'showNewTodoPlaceholder'],
					text: {
						enter: {
							instant: "What needs to be done?"
						}
					},
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'left': '0',
								'right': '0',
								'bottom': '0',
								'padding': '16px 16px 16px 60px',
								'font-size': '24px',
								'line-height': '1.4em',
								'font-style': 'italic',
								'color': '#a9a9a9',
								'z-index': '0',
								'top': '0px'
								// 'top': '-100px'
							},
							transition: {}
						},
						update: {
							transition: {
								'top': '0px'
							}
						},
						exit: {
							transition: {
								//'top': '-100px'
							}
						}
					}
				},
				{
					id: 'new-todo-input',
					tag: 'input',
					parent: 'todo-form',
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'margin': '0',
								'width': '100%',
								'font-size': '24px',
								'font-family': 'inherit',
								'line-height': '1.4em',
								'border': '0',
								'outline': 'none',
								'color': 'inherit',
								'padding': '6px',
								'border': '1px solid #999',
								'box-shadow': 'inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2)',
								'-moz-box-sizing': 'border-box',
								'-ms-box-sizing': 'border-box',
								'-o-box-sizing': 'border-box',
								'box-sizing': 'border-box',
								'-webkit-font-smoothing': 'antialiased',
								'-moz-font-smoothing': 'antialiased',
								'-ms-font-smoothing': 'antialiased',
								'-o-font-smoothing': 'antialiased',
								'font-smoothing': 'antialiased',
								'padding': '16px 16px 16px 60px',
								'border': 'none',
								'background': 'rgba(0, 0, 0, 0.02)',
								'z-index': '2',
								'box-shadow': 'none'
							}
						}
					},
					attribute: {
						enter: {
							instant: {
								//"placeholder": "What needs to be done?",
								"autofocus": "true"
							}
						}
					},
					handle: {
						enter: {
							instant: {
								keyup:[{
									method: 'keyup',
									arguments: [-1]
								}],
								keypress:[{
									method: 'keypress',
									arguments: [-1]
								}]
							}
						}
					}
				},
				{
					id: 'main',
					tag: 'section',
					parent: 'todo-app',
					style: {
						enter: {
							instant: {
								'position': 'relative',
								'z-index': '2',
								'border-top': '1px dotted #adadad'
							}
						}
					}
				},
				{
					id: 'toggle-all',
					tag: 'div',
					parent: 'main',
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'top': '-42px',
								'left': '-4px',
								'width': '40px',
								'text-align': 'center',
								/* Mobile Safari */
								'border': 'none',
								'outline': 'none',
								'top': '-56px',
								'left': '-15px',
								'width': '65px',
								'height': '41px',
								'-webkit-transform': 'rotate(90deg)',
								'-ms-transform': 'rotate(90deg)',
								'transform': 'rotate(90deg)',
								'-webkit-appearance': 'none',
								'appearance': 'none'
							}
						}
					},
					attribute: {
						enter: {
							instant: {
								"type": "checkbox"
							}
						}
					}
				},
				{
					id: 'toggle-all:before',
					tag: 'span',
					parent: 'toggle-all',
					style: {
						enter: {
							instant: {
								'font-size': '28px',
								'color': '#d9d9d9',
								'padding': '0 25px 7px'
							}
						}
					},
					text: {
						enter: {
							instant: '»'
						}
					}
				},
				{
					id: 'todo-list',
					tag: 'ul',
					parent: 'main',
					style: {
						enter: {
							instant: {
								'margin': '0',
								'padding': '0',
								'list-style': 'none'
							}
						}
					}
				},
				{
					id: 'todo-item',
					tag: 'li',
					parent: 'todo-list',
					on: ['mn', 'todoIds'],
					duration: {
						exit: 200
					},
					delay: {
						enter: 200
					},
					style: {
						enter: {
							instant: {
								'min-height': '58px',
								'position': 'relative',
								'font-size': '24px',
								'border-bottom': ['mn', 'todoLookup', ['id', 'todo-item'], 'border-bottom']
							}
						},
						update: {
							instant: {
								'border-bottom': ['mn', 'todoLookup', ['id', 'todo-item'], 'border-bottom']
							}
						}
					},
					handle: {
						enter: {
							instant: {
								'mouseenter': [{
									method: 'hoverElement',
									arguments: ['hoveredTodo', [['index', 'todo-item']], true]
								}],
								'mouseleave': [{
									method: 'hoverElement',
									arguments: ['hoveredTodo', [['index', 'todo-item']], false]
								}]
							}
						}
					}
				},
				{
					id: 'view-todo',
					tag: 'div',
					parent: 'todo-item',
					on: ['mn', 'todoLookup', ['id', 'todo-item'], 'showView'],
					style: {}
				},
				{
					id: 'todo-completed',
					tag: 'div',
					parent: 'view-todo',
					attribute: {
						enter: {
							instant: {
								"type": "checkbox"
							}
						}
					},
					property: {
						enter: {
							instant: {
								"checked": ['pn', 'todos', ['index', 'todo-item'], 'completed']
							}
						},
						update: {
							instant: {
								"checked": ['pn', 'todos', ['index', 'todo-item'], 'completed']
							}
						}
					},
					handle: {
						enter: {
							instant: {
								click: [{
									method: 'toggleCompleted',
									arguments: [[['id', 'todo-item']]]
								}]
							}
						}
					},
					style: {
						enter: {
							instant: {
								'cursor': 'pointer',
								'text-align': 'center',
								'line-height': '43px',
								'font-family': 'Lucida Grande',
								'width': '40px',
								'height': '40px',
								'position': 'absolute',
								'top': '0',
								'bottom': '0',
								'margin': 'auto 0',
								/* Mobile Safari */
								'border': 'none',
								'-webkit-appearance': 'none',
								'-ms-appearance': 'none',
								'-o-appearance': 'none',
								'appearance': 'none',
								'color': ['mn', 'todoLookup', ['id', 'todo-item'], 'color'],
								'text-shadow': ['mn', 'todoLookup', ['id', 'todo-item'], 'shadow']
							}
						},
						update: {
							transition: {
								'color': ['mn', 'todoLookup', ['id', 'todo-item'], 'color'],
								'text-shadow': ['mn', 'todoLookup', ['id', 'todo-item'], 'shadow']
							}
						}
					},
					text: {
						enter: {
							instant: '✔'
						}
					}
				},
				{
					id: 'todo-text',
					tag: 'label',
					parent: 'view-todo',
					text: {
						enter: {
							instant: ['mn', 'filteredTodos', ['index', 'todo-item'], 'text']
						}
					},
					handle: {
						enter: {
							instant: {
								dblclick: [{
									method: 'editTodo',
									arguments: [[['index', 'todo-item']]]
								}],
								keypress:[{
									method: 'keypress',
									arguments: [[['index', 'todo-item']]]
								}]
							}
						},
						update: {
							instant: {
								dblclick: [{
									method: 'editTodo',
									arguments: [[['index', 'todo-item']]]
								}],
								keypress:[{
									method: 'keypress',
									arguments: [[['index', 'todo-item']]]
								}]
							}
						}
					},
					style: {
						enter: {
							instant: {
								'white-space': 'pre',
								'word-break': 'break-word',
								'padding': '15px 60px 15px 15px',
								'margin-left': '45px',
								'display': 'block',
								'line-height': '1.2',
								'text-decoration': ['mn', 'todoLookup', ['id', 'todo-item'], 'text-decoration'],
								'color': ['mn', 'todoLookup', ['id', 'todo-item'], 'color']
							}
						},
						update: {
							transition: {
								'text-decoration': ['mn', 'todoLookup', ['id', 'todo-item'], 'text-decoration'],
								'color': ['mn', 'todoLookup', ['id', 'todo-item'], 'color']
							}
						}
					}
				},
				{
					id: 'delete-todo',
					tag: 'div',
					parent: 'view-todo',
					on: ['mn', 'todoLookup', ['id', 'todo-item'], 'showDelete'],
					duration: {
						enter: 500,
						update: 500,
						exit: 300
					},
					delay: {
						update: 100,
						exit: 0
					},
					handle: {
						enter: {
							instant: {
								'mouseenter': [{
									method: 'hoverElement',
									arguments: ['hoveredX', [['index', 'todo-item']], true]
								}],
								'mouseleave': [{
									method: 'hoverElement',
									arguments: ['hoveredX', [['index', 'todo-item']], false]
								}],
								'click': [{
									method: 'deleteTodo',
									arguments: [[['index', 'todo-item']]]
								}]
							}
						}
					},
					style: {
						enter: {
							instant: {
								'position': 'absolute',
								'text-align': 'center',
								'cursor': 'pointer',
								'line-height': '43px',
								'font-family': 'Lucida Grande',
								'top': '0',
								'right': '10px',
								'bottom': '0',
								'width': '40px',
								'height': '40px',
								'margin': 'auto 0',
								'font-size': '22px',
								'opacity': '0'
							},
							transition: {
								'opacity': '1'
							}
						},
						update: {
							transition: {
								'opacity': '1'
							}
						},
						exit: {
							transition: {
								'opacity': '0'
							}
						}
					},
					text: {
						enter: {
							instant: '✖'
						}
					}
				},
				{
					id: 'edit-todo',
					tag: 'input',
					parent: 'todo-item',
					on: ['mn', 'todoLookup', ['id', 'todo-item'], 'showEdit'],
					style: {
						enter: {
							instant: {
								'display': 'block',
								'padding': '13px 17px 12px',
								'position': 'absolute',
								'left': '46px',
								'top': '0',
								'bottom': '0',
								'width': '462px',
								'font-size': '24px'
								// 'padding': '15px 60px 15px 15px',
								// 'margin-left': '45px',
								// 'display': 'block',
								// 'line-height': '1.2',
								// 'text-decoration': 'none',
								// 'color': 'rgb(133, 173, 167)'
							}
						}
					},
					property: {
						enter: {
							instant: {
								'value': ['pn', 'todos', ['index', 'todo-item'], 'text']
							}
						}
					},
					handle: {
						enter: {
							instant: {
								blur: [{
									method: 'stopEditing',
									arguments: [[['index', 'todo-item']]]
								}],
								keyup:[{
									method: 'keyup',
									arguments: [[['index', 'todo-item']]]
								}],
								keypress:[{
									method: 'keypress',
									arguments: [[['index', 'todo-item']]]
								}]
							}
						}
					}
				},
				{
					id: 'footer',
					tag: 'footer',
					parent: 'todo-app',
					style: {
						enter: {
							instant: {
								'color': '#777',
								'padding': '0 15px',
								'position': 'absolute',
								'right': '0',
								'bottom': '-31px',
								'left': '0',
								'height': '20px',
								'z-index': '1',
								'text-align': 'center'
							}
						}
					}
				},
				{
					id: 'footer:before',
					tag: 'span',
					parent: 'footer',
					style: {
						enter: {
							instant: {
								'content': '',
								'position': 'absolute',
								'right': '0',
								'bottom': '31px',
								'left': '0',
								'height': '50px',
								'z-index': '-1',
								'box-shadow': '0 1px 1px rgba(0, 0, 0, 0.3), 0 6px 0 -3px rgba(255, 255, 255, 0.8), 0 7px 1px -3px rgba(0, 0, 0, 0.3), 0 43px 0 -6px rgba(255, 255, 255, 0.8), 0 44px 2px -6px rgba(0, 0, 0, 0.2)'
							}
						}
					}
				},
				{
					id: 'todo-count',
					tag: 'span',
					parent: 'footer'
				},
				{
					id: 'todo-count-number',
					tag: 'strong',
					parent: 'todo-count'
				},
				{
					id: 'todo-count-text',
					tag: 'span',
					parent: 'todo-count'
				},
				{
					id: 'filters',
					tag: 'ul',
					parent: 'footer',
					style: {
						enter: {
							instant: {
								'margin': '0',
								'padding': '0',
								'list-style': 'none',
								'position': 'absolute',
								'right': '0',
								'left': '0'
							}
						}
					}
				},
				{
					id: 'filter-item',
					tag: 'li',
					parent: 'filters',
					on: ['mn', 'filterIds'],
					style: {
						enter: {
							instant: {
								'display': 'inline'
							}
						}
					}
				},
				{
					id: 'filter-link',
					tag: 'a',
					parent: 'filter-item',
					text: {
						enter: {
							instant: ['pn', 'filters', ['index', 'filter-item'], 'text']
						}
					},
					style: {
						enter: {
							instant: {
								'display': 'inline',
								'font-weight': ['mn', 'filterLookup', ['id', 'filter-item'], 'fontWeight'],
								'cursor': 'pointer',
								'margin': '0px 5px 0px 5px'
							}
						},
						update: {
							transition: {
								'font-weight': ['mn', 'filterLookup', ['id', 'filter-item'], 'fontWeight']
							}
						}
					},
					handle: {
						enter: {
							instant: {
								click: [{
									method: 'setCurrentFilter',
									arguments: [[['index', 'filter-item']]]
								}]
							}
						}
					}
				},
				// {
				// 	id: 'clear-completed',
				// 	tag: 'div',
				// 	parent: 'footer',
				// 	text: {
				// 		enter: {
				// 			instant: "Clear completed (0)"
				// 		}
				// 	},
				// 	style: {
				// 		enter: {
				// 			instant: {
				// 				'display': 'inline',
				// 				'float': 'right',
				// 				'position': 'relative',
				// 				'line-height': '20px',
				// 				'text-decoration': 'none',
				// 				'background': 'rgba(0, 0, 0, 0.1)',
				// 				'font-size': '11px',
				// 				'padding': '0 10px',
				// 				'border-radius': '3px',
				// 				'box-shadow': '0 -1px 0 0 rgba(0, 0, 0, 0.2)'
				// 			}
				// 		}
				// 	}
				// },
				{
					id: 'info',
					tag: 'footer',
					parent: 'container',
					style: {
						enter: {
							instant: {
								'margin-top': '60px'
							}
						}
					}
				},
				{
					id: 'instructions',
					tag: 'p',
					parent: 'info',
					text: {
						enter: {
							instant: "Double-click to edit a todo"
						}
					},
					style: {
						enter: {
							instant: {
								'text-align': 'center',
								'color': '#a6a6a6',
								'font-size': '12px',
								'text-shadow': '0 1px 0 rgba(255, 255, 255, 0.7)'
							}
						}
					}
				},
				{
					id: 'credits',
					tag: 'p',
					parent: 'info',
					style: {
						enter: {
							instant: {
								'text-align': 'center',
								'color': '#a6a6a6',
								'font-size': '12px',
								'text-shadow': '0 1px 0 rgba(255, 255, 255, 0.7)'
							}
						}
					}
				},
				{
					id: 'credits-header',
					tag: 'span',
					parent: 'credits',
					text: {
						enter: {
							instant: "Credits:"
						}
					}
				},
				{
					id: 'contributors',
					tag: 'span',
					parent: 'credits'
				},
				{
					id: 'contributor',
					tag: 'a',
					on: ['pn', 'contributors'],
					parent: 'credits',
					attribute: {
						enter: {
							instant: {
								"href": ['pn', 'contributors', ['index', 'contributor'], 'href'],
								"target": "_blank"
							}
						}
					},
					text: {
						enter: {
							instant: ['pn', 'contributors', ['index', 'contributor'], 'name']
						}
					}
				},
				{
					id: 'context',
					tag: 'p',
					parent: 'info',
					style: {
						enter: {
							instant: {
								'text-align': 'center',
								'color': '#a6a6a6',
								'font-size': '12px',
								'text-shadow': '0 1px 0 rgba(255, 255, 255, 0.7)'
							}
						}
					}
				},
				{
					id: 'part-of',
					tag: 'span',
					parent: 'context',
					text: {
						enter: {
							instant: 'Part of '
						}
					}
				},
				{
					id: 'todo-mvc',
					tag: 'a',
					parent: 'context',
					attribute: {
						enter: {
							instant: {
								"href": "http://todomvc.com"
							}
						}
					},
					text: {
						enter: {
							instant: "TodoMVC"
						}
					}
				},
				]
		});
		ctx.configure(config);

	window.ctx = ctx;
	ctx.execute('initialize');
});