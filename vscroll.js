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
                threshold: 64,
                fetch: angular.noop
             }, settings);

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
                   self.total = Math.max(self.total, count);
                   if (force || page > prevPage) {
                      self.page = page;

                      var deferred = $q.defer();
                      deferred.promise
                          .then(function (count) {
                             self.total = count;
                             self.force = true;

                             self.updateEvent.emit({
                                force: angular.isUndefined(force) ? false : force
                             });
                          });

                      if (page === 0) {
                         settings.fetch(0, threshold, deferred);
                      }
                      else {
                         var skip = (prevPage + 1) * threshold - 1;
                         var take = Math.min(self.total - skip, (page - prevPage) * threshold);
                         settings.fetch(skip, take, deferred);
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

             container.update(0, true);

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
                    function () {
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
       .directive('vscrollPort', ['$rootScope', '$parse', function ($rootScope, $parse) {
          return {
             restrict: 'A',
             controller: ['$element', function ($element) {
                var self = this,
                    type = null,
                    items = [],
                    max = 0,
                    offsets = [],
                    position = {index: 0, offset: 0, value: 0},
                    invalidate = invalidateFactory(items),
                    moveT = angular.noop,
                    getPositionT = angular.noop;

                self.markup = {};

                var setupT = function (kind) {
                   if (type) {
                      if (kind !== type) {
                         throw new Error('Can\'t use vscroll-' + kind + ' with vscroll-' + type);
                      }

                      return false;
                   }

                   type = kind;
                   switch (type) {
                      case 'row':
                         getPositionT = function (offsets, view) {
                            return getPosition(offsets, view.top);
                         };

                         moveT = function (top, bottom) {
                            move('top', top);
                            move('bottom', bottom);
                         };
                         break;
                      case 'column':
                         getPositionT = function (offsets, view) {
                            return getPosition(offsets, view.left);
                         };

                         moveT = function (left, right) {
                            move('left', left);
                            move('right', right);
                         };
                         break;
                      default:
                         throw Error('Invalid type vscroll-' + kind);

                   }

                   return true;
                };

                var move = function (dir, value) {
                   var element;
                   if (self.markup.hasOwnProperty(dir)) {
                      element = self.markup[dir];
                      
                      if (type === 'row') {
                          element.css('height', value + 'px');
                      } else {
                          element.css('width', value + 'px');
                      }
                        
                   } else {
                      element = $element;
                      element.css('padding-' + dir, value + 'px');
                   }
                };

                this.update = function (count, view) {
                   invalidate(offsets, position.index, count);
                   position = getPositionT(offsets, view);

                   var offset = position.value - position.offset;
                   if (offset >= 0) {
                      max = Math.max(max, position.offset);
                      var frame1 = Math.max(0, position.value - offset);
                      var frame2 = Math.max(0, max - frame1);
                      moveT(frame1, frame2);
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
                   position = {index: 0, offset: 0, value: 0};
                   moveT(0, 0);
                };

                this.setRow = function (index, element) {
                   setupT('row');
                   items[index] = element;
                };

                this.setColumn = function (index, element) {
                   setupT('column');
                   items[index] = element;
                };

                this.remove = function (index) {
                   if (index === 0) {
                      items.shift();
                      return;
                   }

                   var lastIndex = items.length - 1;
                   if (index === lastIndex) {
                      items.pop();
                      return;
                   }

                   // TODO: think how to avoid this
                   items[i] = null;
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
                    container = context.container;

                element[0].tabIndex = 0;
                element.css('outline', 'none');

                var scrollOff = view.scrollEvent.on(
                    function (e) {
                       position = e;
                       if (container.count) {
                          container.apply(
                              function () {
                                 container.cursor = port.update(container.count, e);
                              },
                              function () {
                                 if (!$rootScope.$$phase) {
                                    scope.$digest();
                                 }
                              });
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
                             container.cursor = port.invalidate(container.count, position);
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
                   port.remove(index);
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
                   port.remove(index);
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