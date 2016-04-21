# vscroll + angularjs
Angular virtual scroll that can be applied to any ng-repeat markup.

## Licence
Code licensed under MIT license.

## Installing

## Angular Compatibility

Vscroll requires one-time binding to track virtualized elements, thus Angular 1.3+ required with its one-time binding notation.
```html
<div vscroll-row="{{::$index}}"/>
```

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

### API
Configuration object, passed to vscroll service in controller has following interface.

#### threshold
Type: `Number`

Default: 64

Virtualization threshold. Defines, how many items have to be returned by vscroll filter. 


#### fetch
Type: `Function(skip, take, deferred)`

Default: `angular.noop`

Function for fetching new data page. Invoked when container scroll is near the bottom.

`skip: Number` - how many elements should be skipped for fetching.

`take: Number` - max amount of elements that must be returned.

`deferred` - promise, that must be resolved or rejected when data is fetched. 

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

## How it works

There's a problem of rendering large amounts of data using angular, especially, in case of rich user interface, 
e.g table that consists of thousands of rows or columns and allows filtering.
Usual Angular approach `ng-repeat="element in elements | filter: filter"` is terribly slow
because lots of DOM-elements will be removed or added on each filter change.

The idea of vscroll is to render small amount of DOM-elements once 
and prevent permanent DOM rebuild.

Since only `threshold` of elements is rendered, `$index` in 
`ng-repeat="item in data | vscroll: vscrollContext track by $index"` expression
may vary only from 0 to `threshold` 
and `track by $index` clause doesn't allow to add or delete elements.
But `ng-repeat` still tracks collection returned by `vscroll` filter
which is changed when data container is scrolled.

## Karma
