describe('test view', function() {
    var view,
        service;

    beforeEach(function(){
        module('vscroll');
        inject(function($injector){
            view = $injector.get('$filter')('vscroll');
            service = $injector.get('vscroll');
        });
    });

    it('should return empty collection if no argument is passed', function () {
        expect(view().length).toEqual(0);
    });

    it('should return empty collection if only data argument is passed', function () {
        expect(view([1, 2, 3]).length).toEqual(0);
    });

    it('should return empty collection if totalCount = 0', function () {
        var context = service({totalCount: 0});
        expect(view([1, 2, 3], context).length).toEqual(0);
    });    
});