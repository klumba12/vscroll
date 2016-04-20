# vscroll + angularjs
Angular virtual scroll that can be applied to any ng-repeat markup.

## Licence
Code licensed under MIT license.

## Installing

## Angular Compatibility

## Developing
Don't forget to include vscroll module!
```javascript
anuglar.module('some-module-name', ['vscroll',...])

```
### Controller
Inject scroll service to controller and invoke it to create vscroll context.
```javascript
var app = angular.module('app', ['vscroll']);
app.controller('vscrollTest', ['$scope', 'vscroll', function ($scope, vscroll) {
    $scope.data = [];
    for (var i = 0; i < 200; i++) {
	    $scope.data[i] = 'item ' + i;
    }

    $scope.vscrollContext = vscroll({threshold: 30});
}
```
### HTML markup
* Add **vscroll** directive to element with scrollbars
* Add **vscroll-port** directive to scrollable element
* Add **vscroll** filter and **track by $index** into ng-repeat directive
* Add **vscroll-row** or **vscroll-column** to the repeated element that will be virtualized
* Bind **vscroll context** to the **vscroll-port** directive and **vscroll** filter
* Bind once **$index** to the vscroll-row or vscroll-column directive
```html
<div ng-controller="vscrollTest" vscroll>
        <ul vscroll-port="vscrollContext">
            <li vscroll-row="{{::$index}}" 
            	ng-repeat="item in data | vscroll: vscrollContext track by $index">
               {{$item}}
            </li>            
        </ul>
    </div>
```

## Karma