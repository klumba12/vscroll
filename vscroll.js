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

    angular.module('vscroll', [])
        .service('vscroll', function () {
            return function (settings) {
                settings = angular.extend({
                    threshold: 64,
                    position: 0,
                    totalCount: 0,
                    update: angular.noop
                }, settings);

                return {
                    settings: settings,
                    container: {
                        cursor: 0,
                        page: -1,
                        items: [],
                        update: function (count) {
                            this.force = true;
                            this.settings.totalCount = count;
                        },
                        force: true
                    }
                };
            };
        })
        .filter('vscroll', [function () {
            var empty = [];

            return function (data, context) {
                if (!data || !context) {
                    return empty;
                }

                var settings = context.settings,
                    container = context.container,
                    position = settings.position,
                    threshold = settings.threshold,
                    cursor = container.cursor,
                    totalCount = settings.totalCount,
                    prevPage = container.page,
                    page = Math.round((position + threshold + Math.min(cursor, 0)) / threshold);

                if (page > prevPage) {
                    settings.update(
                        function (count) {
                            container.update(count);
                        },
                        (page - prevPage) * threshold,
                        prevPage + 1);

                    container.page = page;
                }

                if (totalCount) {
                    if (container.force || (cursor <= totalCount && cursor !== position)) {

                        settings.position = cursor;

                        var view = container.items,
                            first = Math.max(cursor + Math.min(totalCount - (cursor + threshold), 0), 0),
                            last = Math.min(cursor + threshold, totalCount);

                        view.length = first - last;
                        for (var i = first, j = 0; i < last; i++, j++) {
                            view[j] = data[i];
                        }

                        container.force = true;
                    }

                    return view;
                }

                return empty;
            };
        }])
        .directive('vscroll', [function () {
            return {
                restrict: 'A',
                controller: [function () {
                }],
                link: function (scope, element, attrs) {

                }
            };
        }])
        .directive('vscrollPort', [function () {
            return {
                restrict: 'A',
                controller: [function () {
                }],
                require: ['^vscroll'],
                link: function (scope, element, attrs) {

                }
            };
        }])
        .directive('vscrollItem', [function () {
            return {
                restrict: 'A',
                require: '^vscrollPort',
                link: function (scope, element, attrs) {

                }
            };
        }])
        .directive('vscrollMark', [function () {
            return {
                restrict: 'A',
                require: '^vscrollPort',
                link: function (scope, element, attrs) {

                }
            };
        }]);
})(angular);