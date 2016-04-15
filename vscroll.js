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
        .filter('vscroll', [function () {
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
                    if (container.force || (cursor <= totalCount && cursor !== position)) {

                        settings.position = cursor;

                        var view = container.items,
                            first = Math.max(cursor + Math.min(totalCount - (cursor + threshold), 0), 0),
                            last = Math.min(cursor + threshold, totalCount);

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