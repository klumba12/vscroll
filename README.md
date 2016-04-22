#vscroll + angularjs
Angular virtual scroll that can be applied to any ng-repeat markup.

vscroll can offer performance benefits when working with very large collections. 
It does so by only rendering and processing a subset of the data which is visible to the user vs. processing the entire list of data. 
By creating only DOM elements for the visible items, this can greatly reduce the amount of work it has to do.
##Licence
Code licensed under MIT license.
## Examples
(http://klumba12.github.io/vscroll/)
##Installing via Bower
`bower install vscroll`
```
## Development
To setup development environment make sure that npm is installed on your machine, after that just execute npm command for the project.
`npm install`
## Get Started
###Module
Don't forget to include vscroll module!
```javascript
anuglar.module('some-module-name', ['vscroll',...])
```
###Controller
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
###API
vscroll service returns instance that connects user settings, scroll port and scroll filter.
User should inject service to angular controller and invoke it by passing settings object
```javascript
vscroll({
	/**
 	* The number defines how many items will be materialized to dom elements.
 	* @default 64.
 	*/
	threshold: 30,

	/**
	 * The function defines method of getting data for next page of infinite scroll.		
	 * @param {number} skip How many elements should by skipped to get next page.
	 * @param {number} take Size of next page.
	 * @param {deffered} deferred Deffered object that should be resolved with total number of items.
	 * @default angular.noop
	 */
	fetch: function (skip, take, d) {
        getSomeData(skip, take)
          	.success(function(data){
               	$scope.data = data;
               	d.resolve(data.length);
            });
        }		
})
```
###HTML markup
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
##Testing
We use phantomjs and jasmine to ensure quality of the code.
The easiest way to run these asserts is to use npm command for the project.
`npm test`
##How it works
Since only `threshold` of elements is rendered, `$index` in 
`ng-repeat="item in data | vscroll: vscrollContext track by $index"` expression
may vary only from 0 to `threshold` 
and `track by $index` clause doesn't allow to add or delete elements.
But `ng-repeat` still tracks collection returned by `vscroll` filter
which is changed when data container is scrolled.

We believe, that core concept of `vscroll` is simplicity. 
We don't implement complex transclusions or our own `ng-repeat`, we just use Angular's native tools.
We don't change elements, we change collection, and Angular is responsible for the rest.

Internally `vscroll` stores list of heights of top elements for two things: 
1. It adds padding on top of container, so it looks like list really scrolls down 
(in fact, there is always limited amount of elements with increasing offset).
2. It calculates lower and upper index of collection (viewport), 
that must be returned to `ng-repeat` and rendered.
## Angular Compatibility
To get maximum perfomance benefits from vscroll, Anuglar 1.3+ should be used, regarding to one-time binding support,
```html
<div vscroll-row="{{::$index}}"/>