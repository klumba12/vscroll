describe('test view', function() {
    var view;
    var service;
    beforeEach(function(){
        module('vscroll');
        inject(function($injector){
            view = $injector.get('$filter')('vscrollView');
            service = $injector.get('vscrollService')
        });
    });

    it('returns empty collection if no argument is passed', function () {
        expect(view().length).toEqual(0);
    });

    it('returns empty collection if only data is passed', function () {
        expect(view([1, 2, 3]).length).toEqual(0);
    });

    it('returns empty collection if totalCount = 0', function () {
        var context = service({totalCount: 0});
        expect(view([1, 2, 3], context).length).toEqual(0);
    });
});