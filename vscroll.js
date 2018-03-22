(function (angular) {
	'use strict';

	vscrollService.$inject = ['$q'];
	vscrollCtrl.$inject = ['$scope', '$element', '$window'];
	vscrollPortYDirective.$inject = [];
	vscrollPortXDirective.$inject = [];

	angular.module('vscroll', [])
		.service('vscroll', vscrollService)
		.filter('vscroll', vscrollFilter)
		.directive('vscroll', vscrollDirective)
		.directive('vscrollPortY', vscrollPortYDirective)
		.directive('vscrollPortX', vscrollPortXDirective)
		.directive('vscrollRow', vscrollRowDirective)
		.directive('vscrollColumn', vscrollColumnDirective)
		.directive('vscrollMark', vscrollMarkDirective);

	var extend = Object.assign || angular.extend;
	var isUndef = angular.isUndefined;
	var isNumber = angular.isNumber;
	var isFunction = angular.isFunction;

	var rAF = window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.msRequestAnimationFrame;

	var UNSET_ARM = Number.MAX_SAFE_INTEGER;
	var UNSET_OFFSET = 0;

	function capitalize(text) {
		return text[0].toUpperCase() + text.slice(1);
	}

	function sizeFactory(size, container, element, index) {
		if (isFunction(size)) {
			return function () {
				return size(element, container.position + index);
			}
		}

		if (isNumber(size)) {
			return function () {
				return size;
			}
		}

		throw new Error('vscroll invalid size option ' + size);
	}

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

	var recycleFactory = function (items) {
		var offsets = [];
		return function (index, count) {
			var threshold = items.length;
			var cursor = offsets.length;
			var diff = Math.min(count, threshold + index) - cursor;

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

			return offsets;
		};
	};

	var findPosition = function (offsets, value, itemSize) {
		if (itemSize) {
			var index = Math.round(value / itemSize);
			return {
				index: index,
				offset: itemSize * index,
				lastOffset: 0,
				value: value
			};
		}

		var index = findIndexAt(offsets, value);
		var length = offsets.length;
		if (index > 0) {
			return {
				index: index,
				offset: offsets[index - 1],
				lastOffset: offsets[length - 1],
				value: value
			};
		}

		return {
			index: 0,
			offset: 0,
			lastOffset: length ? offsets[length - 1] : 0,
			value: value
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
			var temp = events.slice();
			for (var i = 0, length = temp.length; i < length; i++) {
				temp[i](e);
			}
		};
	};

	function placeholderBitmap(width, height) {
		var minWidth = Math.max(width, 1);
		var minHeight = Math.max(height, 1);
		var canvas = document.createElement('canvas');
		canvas.width = Math.max(width * 2, 1);
		canvas.height = Math.max(height * 2, 1);

		var ctx = canvas.getContext('2d');
		ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
		ctx.fillRect(0, 0, minWidth, minHeight);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
		ctx.fillRect(width, height, minWidth, minHeight);

		return canvas.toDataURL();
	}

	function vscrollPortCtrlFactory(layoutFactory) {
		return function ($element) {
			this.markup = {};

			var element = $element[0];
			var self = this;
			var items = [];
			var maxOffset = UNSET_OFFSET;
			var minArm = UNSET_ARM;
			var position = findPosition([], 0, 0);
			var layout = layoutFactory(
				element,
				this.markup,
				function () {
					return self.context
				});

			var recycle = layout.recycleFactory(items);
			var move = layout.move;
			var getPosition = layout.getPosition;
			var getItemSize = layout.itemSize;
			var getScrollSize = layout.scrollSize;
			var getPortSize = layout.portSize;

			var empty = function () {
				return 0;
			};

			var getArm = function (offsets, box, index) {
				var itemSize = getItemSize();
				if (itemSize) {
					var threshold = self.context.settings.threshold;
					var portSize = getPortSize(box);
					var viewSize = threshold * itemSize;
					return Math.max(0, (viewSize - portSize) / 2);
				}

				if (offsets.length) {
					var threshold = self.context.settings.threshold;
					var portSize = getPortSize(box);
					var last = Math.min(offsets.length, index + threshold) - 1;
					var first = (last + 1) - threshold;
					var viewSize = offsets[last] - offsets[first];
					return Math.max(0, (viewSize - portSize) / 2);
				}

				return UNSET_ARM;
			};

			this.updateEvent = new Event();

			this.recycle = function (count, box, force) {
				var offsets = recycle(position.index, count);
				var threshold = self.context.settings.threshold;

				var arm = getArm(offsets, box, position.index);
				minArm = Math.min(minArm, arm);

				var newPosition = getPosition(offsets, box, minArm);
				if (force || position.index !== newPosition.index) {
					position = newPosition;
					return newPosition;
				}

				return null;
			};

			this.invalidate = function (count, box, position) {
				var offset = position.offset;
				var threshold = self.context.settings.threshold;
				var scrollSize = getScrollSize(box);
				var itemSize = getItemSize();
				maxOffset = itemSize
					? Math.max(0, itemSize * (count - threshold))
					: scrollSize <= position.lastOffset ? Math.max(maxOffset, offset) : maxOffset;

				var pad1 = Math.max(0, offset);
				var pad2 = Math.max(0, maxOffset - pad1);

				move(pad1, pad2);
				return position.index;
			};

			this.refresh = function (count, box) {
				maxOffset = UNSET_OFFSET;
				minArm = UNSET_ARM;
				return self.invalidate(count, box, position);
			};

			this.reset = function (count, box) {
				maxOffset = UNSET_OFFSET;
				minArm = UNSET_ARM;
				recycle = layout.recycleFactory(items);
				position = findPosition([], 0, 0);
				return self.invalidate(count, box, position);
			};

			this.setItem = function (index, element) {
				items[index] = element;
				self.updateEvent.emit({ action: 'set', index: index });
			};

			this.removeItem = function (index) {
				var last = items.length - 1;
				if (index === 0) {
					items.shift();
				}
				else if (index === last) {
					items.pop();
					while (last-- && items[last] === empty) {
						items.pop();
					}
				}
				else {
					// TODO: think how to avoid this
					items[index] = empty;
				}

				self.updateEvent.emit({ action: 'remove', index: index });
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

				tick(f) {
					rAF(f);
				},

				read(f) {
					f();
				},

				write(f) {
					f();
				},

				apply: function (f, emit) {
					emit(f);
				},

				update: function (count, force) {
					var self = this;
					var threshold = settings.threshold;
					var cursor = self.cursor;
					var oldPage = self.page;
					var newPage = Math.ceil((cursor + threshold) / threshold) - 1;

					if (self.count !== count) {
						self.count = count;
						self.total = Math.max(self.total, count);
						self.updateEvent.emit({
							force: isUndef(force)
								? (isNumber(settings.rowHeight) && settings.rowHeight > 0) || (isNumber(settings.columnWidth) && settings.columnWidth > 0)
								: force
						});
					}

					if (force || newPage > oldPage) {
						self.page = newPage;

						var deferred = $q.defer();
						deferred.promise
							.then(function (count) {
								if (count !== self.total) {
									self.total = count;
									self.force = true;

									self.updateEvent.emit({
										force: isUndef(force)
											? (isNumber(settings.rowHeight) && settings.rowHeight > 0) || (isNumber(settings.columnWidth) && settings.columnWidth > 0)
											: force
									});
								}
							});

						if (newPage === 0) {
							settings.fetch(0, threshold, deferred);
						}
						else {
							var skip = (oldPage + 1) * threshold;
							if (self.total < skip) {
								deferred.resolve(self.total);
							}
							else {
								var take = (newPage - oldPage) * threshold;
								settings.fetch(skip, take, deferred);
							}
						}

					}
				},

				reset: function () {
					this.count = 0;
					this.total = 0;
					this.position = 0;
					this.cursor = 0;
					this.page = 0;
					this.items = [];

					this.force = true;

					var e = { handled: false, source: 'container' };
					this.resetEvent.emit(e);
					this.update(this.count, true);
				}
			};

			settings = extend({
				threshold: 64,
				fetch: function (skip, take, d) {
					d.resolve(container.total);
				},
				rowHeight: function (element) {
					var height = element.offsetHeight;
					var style = getComputedStyle(element);

					height += parseInt(style.marginTop) + parseInt(style.marginBottom);
					return height;
				},
				columnWidth: function (element) {
					var width = element.offsetWidth;
					var style = getComputedStyle(element);

					width += parseInt(style.marginLeft) + parseInt(style.marginRight);
					return width;
				},
				placeholderHeight: 0,
				placeholderWidth: 0,
				resetTriggers: ['resize']
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

			var count = data.length;
			var container = context.container;

			container.update(count);
			if (count) {
				var view = container.items;
				var cursor = container.cursor;
				var settings = context.settings;
				var threshold = settings.threshold;
				var first = cursor; // Math.min(Math.max(0, count - threshold), cursor);
				if (container.force || first !== container.position) {
					var last = Math.min(cursor + threshold, count);
					container.position = first;
					container.drawEvent.emit({
						first: first,
						last: last,
						position: cursor
					});

					view.length = last - first;
					for (var i = first, j = 0; i < last; i++ , j++) {
						view[j] = data[i];
					}

					container.force = false;
				}

				return view;
			}

			return empty;
		};
	}

	function vscrollPortLinkFactory(type, canApply) {
		return function factory($scope, $element, $attrs, ctrls) {
			var view = ctrls[0];
			var port = ctrls[1];
			var context = port.context;
			if (!context) {
				throw new Error('vscroll context is not setup for ' + type);
			}

			var element = $element[0];
			element.tabIndex = 0;
			element.style.outline = 'none';
			element.style.overflowAnchor = 'none';

			var box = {
				scrollWidth: 0,
				scrollHeight: 0,
				scrollTop: 0,
				scrollLeft: 0,
				portWidth: 0,
				portHeight: 0
			};

			var container = context.container;
			var settings = context.settings;

			var emit = function (f) {
				$scope.$evalAsync(f);
			};

			var ticking = false;
			var tick = function (force) {
				ticking = false;

				var count = container.count;
				var position = port.recycle(count, box, force);
				if (position) {
					container.apply(function () {
						container.cursor = port.invalidate(count, box, position);
					}, emit);
				}
			};

			var update = function (force) {
				container.read(function () {
					var element = view.element;
					var newBox = {
						scrollWidth: element.scrollWidth,
						scrollHeight: element.scrollHeight,
						scrollTop: element.scrollTop,
						scrollLeft: element.scrollLeft,
						portWidth: element.clientWidth,
						portHeight: element.clientHeight
					};

					if (canApply(newBox, box)) {
						box = newBox;
						if (container.count && !ticking) {
							ticking = true;
							container.tick(function () {
								tick(force);
							});
						}
					}
				});
			};

			if (settings.placeholderHeight > 0 || this.placeholderWidth > 0) {
				var width = settings.placeholderWidth || (isNumber(settings.columnWidth) && settings.columnWidth);
				var height = settings.placeholderHeight || (isNumber(settings.rowHeight) && settings.rowHeight);
				view.drawPlaceholder(width, height);
			}

			var scrollOff = view.scrollEvent.on(function () {
				update(false);
			});

			var viewResetOff = view.resetEvent.on(
				function (e) {
					if (e.handled) {
						return;
					}

					e.handled = settings.resetTriggers.indexOf(e.source) < 0;
					container.resetEvent.emit(e);
				});

			var containerResetOff = container.resetEvent.on(
				function (e) {
					if (e.handled) {
						return;
					}

					container.cursor = port.reset(container.count, box);
					switch (type) {
						case 'vscrollPortX':
							view.resetX();
							break;
						case 'vscrollPortY':
							view.resetY();
							break;
						default:
							throw Error('vscroll unsupported port type ' + type);
					}
				});

			var containerUpdateOff = container.updateEvent.on(
				function (e) {
					if (e.force) {
						container.cursor = port.refresh(container.count, box);
					}
				});

			var portUpdateOff = port.updateEvent.on(
				function () {
					update(true);
				}
			);

			$scope.$on('$destroy', function () {
				delete port.markup;

				scrollOff();
				containerUpdateOff();
				portUpdateOff();
				containerResetOff();
				viewResetOff();
			});
		}
	}

	function vscrollCtrl($scope, $element, $window) {
		var box = $element[0];
		var window = $window;
		var scrollEvent = new Event();
		var resetEvent = new Event();

		this.scrollEvent = scrollEvent;
		this.resetEvent = resetEvent;
		this.element = box;

		this.drawPlaceholder = function (width, height) {
			var style = box.style;
			var placeholder = placeholderBitmap(width || box.clientWidth, height || box.clientHeight);

			style.backgroundImage = 'url(' + placeholder + ')';
			style.backgroundRepeat = 'repeat';
		};

		this.resetX = function () {
			box.scrollLeft = 0;
		};

		this.resetY = function () {
			box.scrollTop = 0;
		};

		var onScroll = function () {
			scrollEvent.emit();
		};

		var onResize = function () {
			var e = { handled: false, source: 'resize' };
			resetEvent.emit(e);
		};

		box.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize);

		$scope.$on('$destroy', function () {
			box.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
		});
	}

	function vscrollDirective() {
		return {
			restrict: 'A',
			controller: vscrollCtrl
		};
	}

	function yLayoutFactory(element, markup, context) {
		var move = function (pos, value) {
			var container = context().container;
			container.write(function () {
				if (markup.hasOwnProperty(pos)) {
					var mark = markup[pos];
					mark.style.height = value + 'px';
				} else {
					element.style['padding' + capitalize(pos)] = value + 'px';
				}
			});
		};

		var self = {
			getPosition: function (offsets, box, arm) {
				var value = Math.max(0, box.scrollTop - arm);
				var size = self.itemSize();
				return findPosition(offsets, value, size);
			},
			move: function (top, bottom) {
				move('top', top);
				move('bottom', bottom);
			},
			itemSize: function () {
				var rowHeight = context().settings.rowHeight;
				return isNumber(rowHeight) ? rowHeight : 0;
			},
			scrollSize: function (box) {
				return box.scrollHeight;
			},
			portSize: function (box) {
				return box.portHeight;
			},
			recycleFactory: function (items) {
				var recycle = recycleFactory(items);
				return function (index, count) {
					var size = self.itemSize();
					if (size) {
						return [];
					}

					return recycle(index, count);
				};
			}
		};

		return self;
	}

	function vscrollPortYDirective() {
		return {
			scope: true,
			restrict: 'A',
			controller: ['$element', vscrollPortCtrlFactory(yLayoutFactory)],
			require: ['^vscroll', 'vscrollPortY'],
			controllerAs: '$portY',
			bindToController: {
				context: '<vscrollPortY'
			},
			link: vscrollPortLinkFactory(
				'vscrollPortY',
				function (newValue, oldValue) {
					return !oldValue.portHeight || newValue.scrollTop !== oldValue.scrollTop;
				})
		};
	}

	function xLayoutFactory(element, markup, context) {
		var move = function (pos, value) {
			if (markup.hasOwnProperty(pos)) {
				var mark = markup[pos];
				mark.style.width = value + 'px';
			} else {
				element.style['padding' + capitalize(pos)] = value + 'px';
			}
		};

		var self = {
			getPosition: function (offsets, box, arm) {
				var value = Math.max(0, box.scrollLeft - arm);
				var size = self.itemSize();
				return findPosition(offsets, value, size);
			},
			move: function (left, right) {
				move('left', left);
				move('right', right);
			},
			itemSize: function () {
				var columnWidth = context().settings.columnWidth;
				return isNumber(columnWidth) ? columnWidth : 0;
			},
			scrollSize: function (box) {
				return box.scrollWidth;
			},
			portSize: function (box) {
				return box.portWidth;
			},
			recycleFactory: function (items) {
				var recycle = recycleFactory(items);
				return function (index, count) {
					var size = self.itemSize();
					if (size) {
						return [];
					}

					return recycle(index, count);
				};
			}
		};

		return self;
	}

	function vscrollPortXDirective() {
		return {
			scope: true,
			restrict: 'A',
			controller: ['$element', vscrollPortCtrlFactory(xLayoutFactory)],
			require: ['^vscroll', 'vscrollPortX'],
			controllerAs: '$portX',
			bindToController: {
				context: '<vscrollPortX'
			},
			link: vscrollPortLinkFactory(
				'vscrollPortX',
				function (newValue, oldValue) {
					return !oldValue.portWidth || newValue.scrollLeft !== oldValue.scrollLeft;
				}
			)
		};
	}

	function vscrollRowDirective() {
		return {
			restrict: 'A',
			require: '^vscrollPortY',
			link: function ($scope, $element, $attrs, port) {
				var index = parseInt($attrs.vscrollRow);
				if (isNaN(index)) {
					throw new Error('vscroll incorrect index "' + $attrs.vscrollRow + '" for row');
				}

				var row = $element[0];
				var context = port.context;
				var size = sizeFactory(context.settings.rowHeight, context.container, row, index);

				port.setItem(index, size);
				$scope.$on('$destroy', function () {
					port.removeItem(index);
				});
			}
		};
	}

	function vscrollColumnDirective() {
		return {
			restrict: 'A',
			require: '^vscrollPortX',
			link: function ($scope, $element, $attrs, port) {
				var index = parseInt($attrs.vscrollColumn);
				if (isNaN(index)) {
					throw new Error('vscroll incorrect index "' + $attrs.vscrollColumn + '" for column')
				}

				var column = $element[0];
				var context = port.context;
				var size = sizeFactory(context.settings.columnWidth, context.container, column, index);
				port.setItem(index, size);
				$scope.$on('$destroy', function () {
					port.removeItem(index);
				});
			}
		};
	}

	function vscrollMarkDirective() {
		return {
			restrict: 'A',
			require: ['^?vscrollPortX', '^?vscrollPortY'],
			link: function ($scope, $element, $attrs, ctrls) {
				var element = $element[0];
				var mark = $attrs.vscrollMark;
				var ports = ctrls.filter(function (ctrl) {
					return !!ctrl;
				});

				ports.forEach(function (port) {
					port.markup[mark] = element;
				});

				$scope.$on('$destroy', function () {
					ports.forEach(function (port) {
						if (port.markup) {
							port.markup[mark] = null;
						}
					});
				});
			}
		};
	}
})(angular);