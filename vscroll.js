angular.module('vscroll', [])
    .service('vscrollService', function () {
        return function (settings) {
            settings = angular.extend({
                threshold: 64,
                position: 0,
                totalCount: 0
            }, settings);

            return {
                settings: settings,
                context: {
                    cursor: 0,
                    page: 0,
                    data: []
                }
            };
        };
    })
    .filter('vscrollView', [function () {
        var empty = [];

        return function (data, scope) {
            if (!data || !scope) {
                return empty;
            }

            var settings = scope.settings;
            var context = scope.context;

            if (settings.totalCount) {
                if (context.cursor <= settings.totalCount &&
                        context.cursor !== settings.position) {

                    settings.position = context.cursor;
                    var view = context.data;

                    var first = Math.max(settings.position + Math.min(settings.totalCount - (settings.position + settings.threshold), 0), 0);
                    var last = Math.min(settings.position + settings.threshold, settings.totalCount);
                    view.length = first - last;
                    for (var i = first, j = 0; i < last; i++, j++) {
                        view[j] = data[i];
                    }
                }

                return view;
            }

            return empty;
        };
    }])
    .directive('vscroll', [function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {

            }
        };
    }])
    .directive('vscrollPort', [function () {
        return {
            restrict: 'A',
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