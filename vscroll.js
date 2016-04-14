//noinspection JSUnresolvedFunction
/**
 * Created by dmitry.sitnov on 4/14/2016.
 */

angular.module('vscroll', [])
    .service('vscrollService', function () {
        return function (context) {
            context = angular.extend({
                cursor: 0,
                page: 0
            }, context);
        };
    })
    .filter('vscrollView', [function () {
        return function (data, context) {

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