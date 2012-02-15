/*globals suite, test, setup, teardown */

var should   = require("should"),
    ExParser = require("../lib/ExParser"),
    INCLUDE_SEQUENCE = [/@/, /include/, /\s+/, /([^\s]+)/],
    DEPENDS_SEQUENCE  = [/@/, /depends?/, /\s+/, /([^\s]+)/]
;

suite("Expression Parser", function () {
    
    test("Simple include", function () {
        var parser = new ExParser({
                expressions: {
                    include: INCLUDE_SEQUENCE,
                },
                handlers: {
                    include: function (p, captures) {
                        var match = p.match,
                            pre   = p.getPreExpression(),
                            path  = captures[0]
                        ;

                        path.should.equal("some/path/to/file.js");
                        match.should.equal("@include some/path/to/file.js");
                        pre.should.equal("// ");
                    }
                }
            });
        
        parser.parse("// @include some/path/to/file.js ");
    });
    
    test("Multiple expressions", function () {
        var count = 0,
            preExpressions = [
                "// ",
                " // comments\n// "
            ],
            parser
        ;
        
        parser = new ExParser({
            expressions: {
                include: INCLUDE_SEQUENCE,
                depends: DEPENDS_SEQUENCE
            },
            handlers: {
                preExpression: function (p, txt) {
                    txt.should.equal(preExpressions[count]);
                    count++;
                },
                include: function (p, captures) {
                    var match = p.match,
                        pre   = p.getPreExpression(),
                        path  = captures[0]
                    ;
                    
                    path.should.equal("some/file/to/include.js");
                    pre.should.equal("// ");
                    match.should.equal("@include some/file/to/include.js");
                },
                depends: function (p, captures) {
                    var match = p.match,
                        pre   = p.getPreExpression(),
                        path  = captures[0]
                    ;
                    
                    path.should.equal("some/file/to/depend.js");
                    pre.should.equal(" // comments\n// ");
                    match.should.equal("@depend some/file/to/depend.js");
                }
            }
        });
        
        parser.parse(
            "// @include some/file/to/include.js // comments\n" +
            "// @depend some/file/to/depend.js \n"
        );
        
        // Did we match our pre-expressions?
        count.should.equal(2);
        // The right remainder of the string left over?
        parser.scanner.getRemainder().should.equal(" \n");
    });
    
    test("If/Else with RegExp Sequence", function () {
        var parser = new ExParser();
        
        parser.addExpression("if", [/@/, /if/, /\s+/, /([^\n]+)/, /(?!@)/]);
    });
});
