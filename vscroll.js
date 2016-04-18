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

   var invalidateFactory = function (items, offsets) {
      return function (index, count) {
         var threshold = items.length,
             cursor = offsets.length,
             diff = Math.min(count - threshold, threshold + index) - cursor;

         for (var i = threshold - diff; i < threshold; i++) {
            var height = items[i].height();
            if (cursor === 0) {
               offsets[cursor] = height;
            }
            else {
               offsets[cursor] = offsets[cursor - 1] + height;
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
       .service('vscroll', function () {
          return function (settings) {
             settings = angular.extend({
                threshold: 64,
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

                      settings.update(
                          function (count) {
                             settings.totalCount = count;
                             if (count === 0) {
                                self.reset();
                                return;
                             }

                             self.force = true;
                             container.updateEvent.emit({
                                force: angular.isUndefined(force) ? true : force
                             });
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
                this.reset = function () {
                   element.scrollTop(0);
                };

                var onScroll =
                    function (event) {
                       self.scrollEvent.emit({
                          height: content.scrollHeight,
                          width: content.scrollWidth,
                          top: $element.scrollTop(),
                          left: $element.scrollLeft()
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
             controller: [function () {
                var self = this,
                    rows = [],
                    cols = [],
                    left = 0,
                    top = 0,
                    hOffsets = [],
                    hItems = [],
                    vOffsets = [],
                    vItems = [],
                    invalidateH = invalidateFactory(hOffsets, hItems),
                    invalidateV = invalidateFactory(vOffsets, vItems);

                this.markup = {};

                var setOffset = function (name, value) {
                   if (markup.hasOwnProperty(name)) {
                      markup[name] = value;
                   }
                   else {
                      element.css('padding' + name, value);
                   }
                };

                var layout = function (left, top, right, bottom) {
                   setOffset('left', left);
                   setOffset('top', top)
                   setOffset('right', right);
                   setOffset('bottom', bottom);
                };

                this.update = function (view) {
                   var offset = position.value - position.offset;
                   if (offset >= 0) {
                      var cursor = position.index;
                      if (cursor !== settings.cursor) {
                         settings.cursor = cursor;
                      }

                      top = Math.max(top, position.offset);
                      var marginTop = Math.max(0, position.top - offset);
                      var marginBottom = Math.max(0, topOffset - marginTop);
                      resize(0, marginTop, 0, marginBottom);
                   }
                };

                this.invalidate = function (view) {
                   left = 0;
                   top = 0;
                   self.update(view);
                };

                this.reset = function () {
                   left = 0;
                   top = 0;
                   hOffsets = [];
                   vOffsets = [];
                   layout(0, 0, 0, 0);
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
                    position = null,
                    context = $parse(attrs.vscrollPort)(scope),
                    settings = context.settings,
                    container = context.container;

                var scrollOff = port.scroll.on(
                    function (e) {
                       if (settings.totalCount) {
                          container.apply(
                              function () {
                                 port.update(e);
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
                             port.invalidate(position);
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
             require: ['^vscrollPort'],
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

                scope.$on('$destroy', function () {
                   port.removeRow(index);
                });
             }
          };
       })
       .directive('vscrollColumn', function () {
          return {
             restrict: 'A',
             require: ['^vscrollPort'],
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

                scope.$on('$destroy', function () {
                   port.removeColumn(index);
                });
             }
          };
       })
       .directive('vscrollMark', function () {
          return {
             restrict: 'A',
             require: ['^vscrollPort'],
             link: function (scope, element, attrs, ctrls) {
                var port = ctrls[0];
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