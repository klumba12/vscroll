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
            var buffer = angular.copy(events);
            for (var i = 0, length = buffer.length; i < length; i++) {
                buffer[i](e);
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
                        page: 0,
                        items: [],
                        update: function (count) {
                            this.settings.totalCount = count;
                        },
                    }
                };
            };
        })
        .filter('vscroll', [function () {
            var emptyView = [];

            return function (data, context) {
                if (!data || !context) {
                    return emptyView;
                }

                var settings = context.settings,
                    container = context.container;

                var page = Math.round((settings.position + settings.threshold + Math.min(container.cursor, 0)) / settings.threshold);
                if (page > container.page) {
                    settings.update(
                        function (count) {
                            container.update(count);
                        },
                        (page - container.page) * settings.threshold,
                        container.page + 1);

                    container.page = page;
                }

                if (settings.totalCount) {
                    if (container.cursor <= settings.totalCount &&
                        container.cursor !== settings.position) {

                        settings.position = container.cursor;

                        var view = container.items,
                            first = Math.max(settings.position + Math.min(settings.totalCount - (settings.position + settings.threshold), 0), 0),
                            last = Math.min(settings.position + settings.threshold, settings.totalCount);

                        view.length = first - last;
                        for (var i = first, j = 0; i < last; i++, j++) {
                            view[j] = data[i];
                        }
                    }

                    return view;
                }

                return emptyView;
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