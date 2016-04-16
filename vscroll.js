(function (angular) {
   "use strict";

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
         else if (k < items) {
            min = mid + 1;
         }
         else {
            max = mid - 1;
         }
      }

      return min;
   };

   angular.module('vscroll', [])
       .service('vscroll', function () {
          return function (settings) {
             settings = angular.extend({
                threshold: 64,
                position: 0,
                totalCount: 0,
                update: angular.noop,
                apply: function (f, emit) {
                   f();
                   emit();
                }
             }, settings);

             var container = {
                cursor: 0,
                page: 0,
                items: [],
                force: true,

                update: function (force) {
                   var self = this,
                       threshold = settings.threshold,
                       cursor = container.cursor,
                       prevPage = self.page,
                       page = Math.round((cursor + threshold) / threshold) - 1;

                   if (force || page > prevPage) {
                      self.page = page;

                      settings.update(
                          function (count) {
                             settings.totalCount = count;
                             self.force = true;
                          },
                          page,
                          (Math.max(1, page) - prevPage) * threshold);
                   }
                },

                reset: function () {
                   this.cursor = 0;
                   this.page = 0;
                   this.items = [];
                   this.force = true;
                   this.update(true);
                }
             };

             container.update(true);

             return {
                settings: settings,
                container: container
             };
          };
       })
       .filter('vscroll', function () {
          var empty = [];

          return function (data, context) {
             if (!data || !context) {
                return empty;
             }

             var settings = context.settings,
                 container = context.container,
                 position = settings.position,
                 cursor = container.cursor,
                 threshold = settings.threshold,
                 totalCount = settings.totalCount;

             container.update();

             if (totalCount) {
                if (container.force ||
                    (cursor <= totalCount && cursor !== position)) {

                   var view = container.items,
                       first = Math.max(cursor + Math.min(totalCount - (cursor + threshold), 0), 0),
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

                this.scroll = new Event();

                var onScroll =
                    function (event) {
                       self.scrollEvent.emit({
                          height: content.scrollHeight,
                          width: content.scrollWidth,
                          top: $element.scrollTop(),
                          left: $element.scrollLeft()
                       });
                    };

                element.bind('scroll', onScroll);

                $scope.on('$destroy', function () {
                   element.unbind('scroll', onScroll);
                });
             }],
          };
       })
       .directive('vscrollPort', ['$parse', function ($parse) {
          return {
             restrict: 'A',
             controller: [function () {
                var rows = [],
                    cols = [];

                this.markup = {
                   begin: null,
                   end: null
                };

                this.layout = function (view) {

                };

                this.setRow = function (index, element) {
                   rows[index] = element;
                };

                this.removeRow = function (index) {
                   delete rows[index];
                };

                this.setColumn = function (index, element) {
                   cols[index] = element;
                };

                this.removeColumn = function (index) {
                   delete cols[index];
                };
             }],
             require: ['^vscroll'],
             link: function (scope, element, attrs, ctrls) {
                var port = ctrls[0],
                    view = ctrls[1],
                    self = this;

                self.context = $parse(attrs.vscrollPort)(scope);

                var scrollOff = view.scroll(
                    function (e) {
                       if (settings.totalCount) {
                          settings.apply(
                              function () {
                                 self.layout(e);
                              },
                              scope.$digest);
                       }
                    });

                scope.on('$destroy', function () {
                   delete port.markup;
                   delete self.context;
                   scrollOff();
                });
             }
          };
       }])
       .directive('vscrollRow', function () {
          return {
             restrict: 'A',
             require: '^vscrollPort',
             link: function (scope, element, attrs, ctrls) {
                var port = ctrls[0],
                    index = parseInt(attrs.vscrollRow),
                    item = {
                       height: function () {
                          return element.outerHeight(true);
                       },
                       width: function () {
                          return element.outerWidth(true);
                       }
                    };

                port.setRow(index, item);

                scope.on('$destroy', function () {
                   port.removeRow(index);
                });
             }
          };
       })
       .directive('vscrollColumn', function () {
          return {
             restrict: 'A',
             require: '^vscrollPort',
             link: function (scope, element, attrs, ctrls) {
                var port = ctrls[0],
                    index = parseInt(attrs.vscrollColumn),
                    item = {
                       height: function () {
                          return element.outerHeight(true);
                       },
                       width: function () {
                          return element.outerWidth(true);
                       }
                    };

                port.setColumn(index, item);

                scope.on('$destroy', function () {
                   port.removeColumn(index);
                });
             }
          };
       })
       .directive('vscrollMark', function () {
          return {
             restrict: 'A',
             require: '^vscrollPort',
             link: function (scope, element, attrs, ctrls) {
                var port = ctrls[0];
                port.markup[attr.vscrollMark] = element;

                scope.on('$destroy', function () {
                   if (port.markup) {
                      port.markup[attr.vscrollMark] = null;
                   }
                });
             }
          };
       });


})(angular);