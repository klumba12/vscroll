# vscroll 1.3 + angularjs
Angular virtual scroll that can be applied to any ng-repeat markup.

vscroll can offer performance benefits when working with very large collections. 
It does so by only rendering and processing a subset of the data which is visible to the user vs. processing the entire list of data. 
By creating only DOM elements for the visible items, this can greatly reduce the amount of work it has to do.
## Licence
Code licensed under MIT license.
## Examples
http://klumba12.github.io/vscroll/
## Installing via Bower
`bower install vscroll`
## Get Started
### Module
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
vscroll service returns instance that connects user settings, scroll port and scroll filter.
User should inject service to angular controller and invoke it by passing settings object
```javascript
vscroll({
     /**
      * The height of an element, can be number or function. 
      * Recommendation is to override the default function, because it used getComputedStyle internally.
      * @param {HTMLElement) element.
      * @param (number) index of element.
      * @default function that returns offsetHeight + margin.top + margin.bottom.
      */
   	rowHeight: function(element, index) {
   		return element.offsetHeight;
   	},
     /**
      * The width of an element, can be number or function.
      * Recommendation is to override the default function, because it used getComputedStyle internally.
      * @param {HTMLElement) element.
      * @param (number) index of element.
      * @default function that returns offsetWidth + margin.left + margin.right.
      */
   	columnWidth: function(element, index) {
   		return element.offsetHeight;
   	},
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
               	// if you don't know total number of items
               	// you can use "+ take" expression,
               	// it says that next page can be fetched
               	d.resolve(data.length + take);
            });
        }		
})
```
### HTML markup
* Add **vscroll** directive to element with scroll bars
* Add **vscroll-port-(x|y)** directive to scrollable element
* Add **vscroll** filter and **track by $index** into ng-repeat directive
* Add **vscroll-row** or **vscroll-column** to the repeated element that will be virtualized
* Bind **vscroll context** to the **vscroll-port-(x|y)** directive and **vscroll** filter
* Bind once **$index** to the vscroll-row or vscroll-column directive
```html
<div ng-controller="vscrollTest" vscroll>
        <ul vscroll-port-y="vscrollContext">
            <li vscroll-row="{{::$index}}" 
            	ng-repeat="item in data | vscroll: vscrollContext track by $index">
               {{$item}}
            </li>            
        </ul>
    </div>
```
## Development
To setup development environment make sure that npm is installed on your machine, after that just execute npm command for the project.  
`npm install`
## Testing
We use phantomjs and jasmine to ensure quality of the code.
The easiest way to run these asserts is to use npm command for the project.  
`npm test`
## How it works
We believe, that core concept of `vscroll` is simplicity.
We don't implement complex transclusions or our own `ng-repeat` directive, we just use angular's native tools.
We don't change elements, we change collection, and angular is responsible for the rest.

`vscroll` filter returns to `ng-repeat` expression ~`threshold` number of elements.
We force to use `track by $index` expression to make angular think that collection is constant and there is no need to recreate dom elements.

`vscroll` core principles:
* To store list of element offsets from the top/left container side.
* To understand which elements should be displayed(thanks to binary search in offsets).
* To calculate lower and upper indexes for collection(return to `ng-repeat` window of elements).
* To add paddings to top/bottom or left/right container sides(emulate vertically/horizontally scroll).

## Angular Compatibility
To get maximum performance benefits from vscroll, anuglar 1.3+ should be used, regarding to one-time binding support,
```html
<div vscroll-row="{{::$index}}"/>
```