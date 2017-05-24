(function (angular) {
	'use strict';

	vscrollService.$inject = ['$q'];
	vscrollCtrl.$inject = ['$scope', '$element', '$window'];
	vscrollPortYDirective.$inject = ['$rootScope', '$parse'];
	vscrollPortXDirective.$inject = ['$rootScope', '$parse'];

	angular.module('vscroll', [])
			.service('vscroll', vscrollService)
			.filter('vscroll', vscrollFilter)
			.directive('vscroll', vscrollDirective)
			.directive('vscrollPortY', vscrollPortYDirective)
			.directive('vscrollPortX', vscrollPortXDirective)
			.directive('vscrollRow', vscrollRowDirective)
			.directive('vscrollColumn', vscrollColumnDirective)
			.directive('vscrollMark', vscrollMarkDirective);

	var getHeight = function (element) {
		var height = element.offsetHeight,
				style = getComputedStyle(element);

		height += parseInt(style.marginTop) + parseInt(style.marginBottom);
		return height;
	};

	var getWidth = function (element) {
		var width = element.offsetWidth,
				style = getComputedStyle(element);

		width += parseInt(style.marginLeft) + parseInt(style.marginRight);
		return width;
	};

	var findIndexAt = function (items, value) {
		var length = items.length;
		var min = 0;
		var max = length - 1;
		while (min <= max) {
			var mid = (min + max) >> 1;
			var k = items[mid];
			if (k === value) {
				return mid;
			}
			else if (k < value) {
				min = mid + 1;
			}
			else {
				max = mid - 1;
			}
		}

		return min;
	};

	var invalidateFactory = function (items) {
		return function (offsets, index, count) {
			var threshold = items.length,
					cursor = offsets.length,
					diff = Math.min(count, threshold + index) - cursor;

			for (var i = threshold - diff; i < threshold; i++) {
				var value = items[i]();
				if (cursor === 0) {
					offsets[cursor] = value;
				}
				else {
					offsets[cursor] = offsets[cursor - 1] + value;
				}

				cursor++;
			}
		};
	};

	var getPosition = function (offsets, value) {
		var index = findIndexAt(offsets, value);
		var length = offsets.length;
		if (index > 0) {
			return {
				value: value,
				index: index,
				offset: offsets[index - 1],
				lastOffset: offsets[length - 1]
			};
		}

		return {
			value: value,
			index: 0,
			offset: 0,
			lastOffset: length ? offsets[length - 1] : 0
		};
	};

	var Event = function () {
		var events = [];

		this.on = function (f) {
			events.push(f);
			return function () {
				var index = events.indexOf(f);
				if (index >= 0) {
					events.splice(index, 1);
				}
			}
		};

		this.emit = function (e) {
			var temp = angular.copy(events);
			for (var i = 0, length = temp.length; i < length; i++) {
				temp[i](e);
			}
		};
	};

	function vscrollPortCtrlFactory(layoutFactory) {
		return function ($element) {
			this.markup = {};

			var self = this,
					items = [],
					max = 0,
					offsets = [],
					position = {index: 0, offset: 0, value: 0, lastOffset: 0},
					layout = layoutFactory(
							$element,
							this.markup,
							function () {
								return self.context
							}),
					invalidate = layout.invalidateFactory(items),
					move = layout.move,
					getPosition = layout.getPosition,
					itemSize = layout.itemSize,
					viewSize = layout.viewSize;

			var empty = function () {
				return 0;
			};

			this.update = function (count, view) {
				invalidate(offsets, position.index, count);
				position = getPosition(offsets, view);

				var offset = position.value - position.offset;
				if (offset >= 0) {
					var size = itemSize();
					max = size
							? Math.max(0, size * (count - self.context.settings.threshold))
							: viewSize(view) < position.lastOffset ? Math.max(max, position.offset) : max;

					var frame1 = Math.max(0, position.offset);
					var frame2 = Math.max(0, max - frame1);

					console.log('position: ' + JSON.stringify(position));
					console.log('max: ' + max);

					console.log('view: ' + JSON.stringify(view));
					console.log('frame1: ' + frame1);
					console.log('frame2: ' + frame2);

					move(frame1, frame2);
				}

				return position.index;
			};

			this.invalidate = function (count, view) {
				max = 0;
				return self.update(count, view);
			};

			this.reset = function () {
				max = 0;
				//items = [];
				offsets = [];
				position = {index: 0, offset: 0, value: 0, lastOffset: 0};
				move(0, 0);
			};

			this.setItem = function (index, element) {
				items[index] = element;
			};

			this.removeItem = function (index) {
				if (index === 0) {
					items.shift();
					return;
				}

				var length = items.length - 1;
				if (index === length) {
					items.pop();
					while (length-- && items[length] === empty) {
						items.pop();
					}
					return;
				}

				// TODO: think how to avoid this
				items[index] = empty;
			};
		};
	}

	function vscrollService($q) {
		return function (settings) {
			var container = {
				count: 0,
				total: 0,
				position: 0,
				cursor: 0,
				page: 0,
				items: [],
				force: true,
				resetEvent: new Event(),
				updateEvent: new Event(),
				drawEvent: new Event(),

				apply: function (f, emit) {
					f();
					emit();
				},

				update: function (count, force) {
					var self = this,
							threshold = settings.threshold,
							cursor = self.cursor,
							prevPage = self.page,
							page = Math.ceil((cursor + threshold) / threshold) - 1;


					self.count = count;
					var total = Math.max(self.total, count);
					if (total !== self.total) {
						self.total = total;
						self.updateEvent.emit({
							force: angular.isUndefined(force) ? !!settings.rowHeight : force
						});
					}

					if (force || page > prevPage) {
						self.page = page;

						var deferred = $q.defer();
						deferred.promise
								.then(function (count) {
									if (count !== self.total) {
										self.total = count;
										self.force = true;

										self.updateEvent.emit({
											force: angular.isUndefined(force) ? !!settings.rowHeight : force
										});
									}
								});

						if (page === 0) {
							settings.fetch(0, threshold, deferred);
						}
						else {
							if (self.total < skip) {
								deferred.resolve(self.total);
							}
							else {
								var skip = (prevPage + 1) * threshold;
								var take = (page - prevPage) * threshold;
								settings.fetch(skip, take, deferred);
							}
						}

					}
				},

				reset: function () {
					this.count = 0;
					this.position = 0;
					this.cursor = 0;
					this.page = 0;
					this.items = [];

					this.force = true;
					this.resetEvent.emit();
					this.update(0, true);
				}
			};

			settings = angular.extend({
				threshold: 64,
				fetch: function (skip, take, d) {
					d.resolve(container.total);
				},
				rowHeight: 0,
				columnHeight: 0,
				resetTriggers: []
			}, settings);

			container.update(0, true);

			return {
				settings: settings,
				container: container
			};
		};
	}

	function vscrollFilter() {
		var empty = [];

		return function (data, context) {
			if (!data) {
				return empty;
			}

			if (!context) {
				throw new Error('vscroll filter context is not set');
			}

			var settings = context.settings,
					container = context.container,
					view = container.items,
					position = container.position,
					cursor = container.cursor,
					threshold = settings.threshold,
					count = data.length;

			container.update(count);

			if (count) {
				if (container.force ||
						(cursor <= count && cursor !== position)) {

					var first = Math.max(cursor + Math.min(count - (cursor + threshold), 0), cursor),
							last = Math.min(cursor + threshold, count);

					container.position = cursor;
					container.drawEvent.emit({
						first: first,
						last: last,
						position: cursor
					});

					view.length = last - first;
					for (var i = first, j = 0; i < last; i++, j++) {
						view[j] = data[i];
					}

					container.force = false;
				}

				return view;
			}

			return empty;
		};
	}

	function vscrollPortLinkFactory(type, canApply, $rootScope, $parse) {
		function factory(scope, element, view, port) {
			element[0].tabIndex = 0;
			element.css('outline', 'none');
			element.css('overflow-anchor', 'none');

			return function (context) {
				var position = {top: 0, left: 0, height: 0, width: 0},
						container = context.container;

				var scrollOff = view.scrollEvent.on(
						function (e) {
							if (canApply(e, position)) {
								position = e;
								if (container.count) {
									container.apply(
											function () {
												container.cursor = port.update(container.count, e);
											},
											function () {
												if (container.cursor !== container.position) {
													if (!$rootScope.$$phase) {
														scope.$digest();
													}
												}
											});
								}
							}
						});


				var resizeOff = view.resizeEvent.on(
						function (e) {
							e.handled = context.settings.resetTriggers.indexOf('resize') < 0
						}
				);

				var resetOff = container.resetEvent.on(
						function () {
							port.reset();
							view.reset();
						});

				var updateOff = container.updateEvent.on(
						function (e) {
							if (e.force) {
								container.cursor = port.invalidate(container.count, position);
							}
						});

				scope.$on('$destroy', function () {
					delete port.markup;

					scrollOff();
					resetOff();
					updateOff();
					resizeOff();
				});
			}
		}

		return function (scope, element, attrs, ctrls) {
			var view = ctrls[0],
					port = ctrls[1],
					init = factory(scope, element, view, port);

			var off = scope.$watch(
					function () {
						// waiting: while context is set
						return $parse(attrs[type])(scope);
					},
					function (context) {
						if (context) {
							init(context);
							port.context = context;
							off();
						}
					});
		};
	}

	function vscrollCtrl($scope, $element, $window) {
		var self = this,
				content = $element[0],
				window = angular.element($window);

		this.scrollEvent = new Event();
		this.reset = function () {
			content.scrollTop = 0;
			content.scrollLeft = 0;
		};

		this.resizeEvent = new Event();

		var onScroll = function () {
			self.scrollEvent.emit({
				width: content.scrollWidth,
				height: content.scrollHeight,
				top: content.scrollTop,
				left: content.scrollLeft
			});
		};

		var onResize = function () {
			const e = {handled: false};
			self.resizeEvent.emit(e);
			if (!e.handled) {
				self.reset();
				onScroll();
			}
		};

		$element.bind('scroll', onScroll);

		window.bind('resize', onResize);

		$scope.$on('$destroy', function () {
			$element.unbind('scroll', onScroll);
			window.unbind('resize', onResize);
		});
	}

	function vscrollDirective() {
		return {
			restrict: 'A',
			controller: vscrollCtrl
		};
	}

	function vscrollPortYDirective($rootScope, $parse) {
		return {
			restrict: 'A',
			controller: ['$element', vscrollPortCtrlFactory(function (element, markup, context) {
				var move = function (pos, value) {
					if (markup.hasOwnProperty(pos)) {
						var mark = markup[pos];
						mark.css('height', value + 'px');
					} else {
						element.css('padding-' + pos, value + 'px');
					}
				};

				var self = {
					getPosition: function (offsets, view) {
						var size = self.itemSize();
						if (size) {
							var index = Math.round(view.top / size);
							return {
								value: view.top,
								index: index,
								offset: view.top,
								lastOffset: 0
							};
						}

						return getPosition(offsets, view.top);
					},
					move: function (top, bottom) {
						move('top', top);
						move('bottom', bottom);
					},
					itemSize: function () {
						return context().settings.rowHeight;
					},
					viewSize: function (view) {
						return view.height;
					},
					invalidateFactory: function (items) {
						var invalidate = invalidateFactory(items);
						return function (offsets, index, count) {
							var size = self.itemSize();
							if (size) {
								return;
							}

							return invalidate(offsets, index, count);
						};
					}
				};

				return self;
			})],
			require: ['^vscroll', 'vscrollPortY'],
			link: vscrollPortLinkFactory(
					'vscrollPortY',
					function (newValue, oldValue) {
						return !oldValue || newValue.top !== oldValue.top;
					},
					$rootScope,
					$parse)
		};
	}

	function vscrollPortXDirective($rootScope, $parse) {
		return {
			restrict: 'A',
			controller: ['$element', vscrollPortCtrlFactory(function (element, markup, context) {
				var move = function (pos, value) {
					if (markup.hasOwnProperty(pos)) {
						var mark = markup[pos];
						mark.css('width', value + 'px');
					} else {
						element.css('padding-' + pos, value + 'px');
					}
				};

				var self = {
					getPosition: function (offsets, view) {
						var size = self.itemSize();
						if (size) {
							var index = Math.round(view.left / size);
							return {
								value: view.left,
								index: index,
								offset: size * index,
								lastOffset: 0
							};
						}

						return getPosition(offsets, view.left);
					}, move: function (left, right) {
						move('left', left);
						move('right', right);
					},
					itemSize: function () {
						return context().settings.columnWidth;
					},
					viewSize: function (view) {
						return view.width;
					},
					invalidateFactory: function (items) {
						var invalidate = invalidateFactory(items);
						return function (offsets, index, count) {
							var size = self.itemSize();
							if (size) {
								return;
							}

							return invalidate(offsets, index, count);
						};
					}
				};

				return self;
			})],
			require: ['^vscroll', 'vscrollPortX'],
			link: vscrollPortLinkFactory(
					'vscrollPortX',
					function (newValue, oldValue) {
						return !oldValue || newValue.left !== oldValue.left;
					},
					$rootScope,
					$parse)
		};
	}

	function vscrollRowDirective() {
		return {
			restrict: 'A',
			require: '^vscrollPortY',
			link: function (scope, element, attrs, port) {
				var index = parseInt(attrs.vscrollRow);
				if (isNaN(index)) {
					throw new Error('Incorrect index "' + attrs.vscrollRow + '" for vscroll row');
				}

				var row = element[0],
						size = function () {
							return port.context.settings.rowHeight || getHeight(row);
						};

				port.setItem(index, size);
				scope.$on('$destroy', function () {
					port.removeItem(index);
				});
			}
		};
	}

	function vscrollColumnDirective() {
		return {
			restrict: 'A',
			require: '^vscrollPortX',
			link: function (scope, element, attrs, port) {
				var index = parseInt(attrs.vscrollColumn);
				if (isNaN(index)) {
					throw new Error('Incorrect index "' + attrs.vscrollColumn + '" for vscroll column')
				}

				var column = element[0],
						size = function () {
							return port.context.settings.columnHeight || getWidth(column);
						};

				port.setItem(index, size);
				scope.$on('$destroy', function () {
					port.removeItem(index);
				});
			}
		};
	}

	function vscrollMarkDirective() {
		return {
			restrict: 'A',
			require: ['^?vscrollPortX', '^?vscrollPortY'],
			link: function (scope, element, attrs, ctrls) {
				var ports = ctrls.filter(function (ctrl) {
					return ctrl;
				});

				angular.forEach(ports, function (port) {
					port.markup[attrs.vscrollMark] = element;
				});

				scope.$on('$destroy', function () {
					angular.forEach(ports, function (port) {
						if (port.markup) {
							port.markup[attrs.vscrollMark] = null;
						}
					});
				});
			}
		};
	}
})
(angular);