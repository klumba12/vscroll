(function (angular) {
   "use strict";

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
             diff = Math.min(count - threshold, threshold + index) - cursor;

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
      if (index > 0) {
         return {
            value: value,
            index: index,
            offset: offsets[index - 1]
         };
      }

      return {
         value: value,
         index: 0,
         offset: 0
      };
   };

   angular.module('vscroll', [])
       .service('vscroll', ['$q', function ($q) {
          return function (settings) {
             settings = angular.extend({
                threshold: 32,
                position: 0,
                totalCount: 0,
                update: angular.noop
             }, settings);

             var container = {
                cursor: 0,
                page: 0,
                items: [],
                force: true,
                resetEvent: new Event(),
                updateEvent: new Event(),

                apply: function (f, emit) {
                   f();
                   emit();
                },

                update: function (force) {
                   var self = this,
                       threshold = settings.threshold,
                       cursor = container.cursor,
                       prevPage = self.page,
                       page = Math.round((cursor + threshold) / threshold) - 1;

                   if (force || page > prevPage) {
                      self.page = page;

                      var deferred = $q.defer();
                      deferred.promise
                          .then(function (count) {
                             settings.totalCount = count;
                             if (count === 0) {
                                self.reset();
                                return;
                             }

                             self.force = true;
                             self.updateEvent.emit({
                                force: angular.isUndefined(force) ? true : force
                             });
                          });

                      settings.update(
                          page,
                          (Math.max(1, page) - prevPage) * threshold,
                          deferred);
                   }
                },

                reset: function () {
                   this.cursor = 0;
                   this.page = 0;
                   this.items = [];
                   this.force = true;
                   this.resetEvent.emit();
                   this.update(true);
                }
             };

             container.update(true);

             return {
                settings: settings,
                container: container
             };
          };
       }])
       .filter('vscroll', function () {
          var empty = [];

          return function (data, context) {
             if (!data) {
                return empty;
             }

             if (!context) {
                throw new Error('Context for vscroll filter is not set');
             }

             var settings = context.settings,
                 container = context.container,
                 view = container.items,
                 position = settings.position,
                 cursor = container.cursor,
                 threshold = settings.threshold,
                 totalCount = settings.totalCount;

             container.update();

             if (totalCount) {
                if (container.force ||
                    (cursor <= totalCount && cursor !== position)) {

                   var first = Math.max(cursor + Math.min(totalCount - (cursor + threshold), 0), 0),
                       last = Math.min(cursor + threshold, totalCount);

                   settings.position = cursor;
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
       })
       .directive('vscroll', function () {
          return {
             restrict: 'A',
             controller: ['$scope', '$element', function ($scope, $element) {
                var self = this,
                    content = $element[0];

                this.scrollEvent = new Event();
                this.reset = function () {
                   content.scrollTop = 0;
                };

                var onScroll =
                    function (e) {
                       self.scrollEvent.emit({
                          width: content.scrollWidth,
                          height: content.scrollHeight,
                          top: content.scrollTop,
                          left: content.scrollLeft
                       });
                    };

                $element.bind('scroll', onScroll);

                $scope.$on('$destroy', function () {
                   $element.unbind('scroll', onScroll);
                });
             }],
          };
       })
       .directive('vscrollPort', ['$parse', function ($parse) {
          return {
             restrict: 'A',
             controller: ['$element', function ($element) {
                var self = this,
                    type = null,
                    items = [],
                    max = 0,
                    offsets = [],
                    position = {index: 0, offset: 0, value: 0},
                    invalidate = invalidateFactory(items);

                //
                // TODO: refactor type
                //

                self.markup = {};

                var move = function (name, value) {
                   if (self.markup.hasOwnProperty(name)) {
                      self.markup[name] = value;
                   }
                   else {
                      $element.css('padding' + name, value);
                   }
                };

                this.update = function (count, view) {
                   invalidate(offsets, position.index, count);
                   position = getPosition(offsets, type == 'row' ? view.top : view.left);

                   var offset = position.value - position.offset;
                   if (offset >= 0) {
                      max = Math.max(max, position.offset);
                      switch (type) {
                         case 'row':
                            var top = Math.max(0, position.value - offset);
                            var bottom = Math.max(0, max - top)
                            move('top', top);
                            move('bottom', bottom);
                            break;
                         case 'column':
                            var left = Math.max(0, position.value - offset);
                            var right = Math.max(0, max - left)
                            move('left', left);
                            move('right', right);
                            break;
                         default:
                            throw  Error('Invalid type ' + type);
                      }
                   }

                   return position.index;
                };

                this.invalidate = function (count, view) {
                   max = 0;
                   return self.update(count, view);
                };

                this.reset = function () {
                   max = 0;
                   offsets = [];

                   switch (type) {
                      case 'row':
                         move('top', 0);
                         move('bottom', 0);
                         break;
                      case 'column':
                         move('left', 0);
                         move('right', 0);
                         break;
                   }
                };

                this.setRow = function (index, element) {
                   type = 'row';
                   items[index] = element;
                };

                this.setColumn = function (index, element) {
                   type = 'column';
                   items[index] = element;
                };

                this.removeRow = function (index) {
                   items[index] = null;
                };

                this.removeColumn = function (index) {
                   items[index] = null;
                };
             }],
             require: ['^vscroll', 'vscrollPort'],
             link: function (scope, element, attrs, ctrls) {
                var context = $parse(attrs.vscrollPort)(scope);
                if (!context) {
                   throw  Error('Context for vscroll port is not set');
                }

                var view = ctrls[0],
                    port = ctrls[1],
                    position = null,
                    settings = context.settings,
                    container = context.container;

                element[0].tabIndex = 0;
                element.css('outline', 'none');

                var scrollOff = view.scrollEvent.on(
                    function (e) {
                       position = e;
                       if (settings.totalCount) {
                          container.apply(
                              function () {
                                 container.cursor = port.update(settings.totalCount, e);
                              },
                              scope.$digest);
                       }
                    });

                var resetOff = container.resetEvent.on(
                    function () {
                       port.reset();
                       view.reset();
                    });

                var updateOff = container.updateEvent.on(
                    function (e) {
                       if (e.force) {
                          if (position) {
                             container.cursor = port.invalidate(settings.totalCount, position);
                          }
                       }
                    });

                scope.$on('$destroy', function () {
                   delete port.markup;

                   scrollOff();
                   resetOff();
                   updateOff();
                });
             }
          };
       }])
       .directive('vscrollRow', function () {
          return {
             restrict: 'A',
             require: '^vscrollPort',
             link: function (scope, element, attrs, port) {
                var index = parseInt(attrs.vscrollRow);
                if (isNaN(index)) {
                   throw new Error('Incorrect index "' + attrs.vscrollRow + '" for vscroll row');
                }

                var row = element[0],
                    size = function () {
                       return getHeight(row);
                    };

                port.setRow(index, size);

                scope.$on('$destroy', function () {
                   port.removeRow(index);
                });
             }
          };
       })
       .directive('vscrollColumn', function () {
          return {
             restrict: 'A',
             require: '^vscrollPort',
             link: function (scope, element, attrs, port) {
                var index = parseInt(attrs.vscrollColumn);
                if (isNaN(index)) {
                   throw new Error('Incorrect index "' + attrs.vscrollColumn + '" for vscroll column')
                }

                var column = element[0],
                    size = function () {
                       return getWidth(column);
                    };

                port.setColumn(index, size);

                scope.$on('$destroy', function () {
                   port.removeColumn(index);
                });
             }
          };
       })
       .directive('vscrollMark', function () {
          return {
             restrict: 'A',
             require: '^vscrollPort',
             link: function (scope, element, attrs, port) {
                port.markup[attrs.vscrollMark] = element;

                scope.$on('$destroy', function () {
                   if (port.markup) {
                      port.markup[attr.vscrollMark] = null;
                   }
                });
             }
          };
       });


})(angular);