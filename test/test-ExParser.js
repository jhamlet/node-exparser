/*globals suite, test, setup, teardown */

var should   = require("should"),
    ExParser = require("../lib/ExParser"),
    INCLUDE_SEQUENCE = [/@/, /include/, /\s+/, /([^\s]+)/],
    DEPENDS_SEQUENCE  = [/@/, /depends?/, /\s+/, /([^\s]+)/]
;

suite("Expression Parser", function () {
    
    test("Simple include", function () {
        var matched = false,
            parser = new ExParser({
                expressions: [
                    ["include", INCLUDE_SEQUENCE]
                ],
                listeners: {
                    include: function (captures, p) {
                        var match = captures[0],
                            path  = captures[1],
                            pre   = p.getLastText()
                        ;
                        
                        matched = true;
                        
                        path.should.equal("some/path/to/file.js");
                        match.should.equal("@include some/path/to/file.js");
                        pre.should.equal("// ");
                    }
                }
            });
        
        parser.parse("// @include some/path/to/file.js ");

        matched.should.equal(true);
    });
    
    test("Multiple expressions", function () {
        var count = 0,
            includeMatch = false,
            dependMatch = false,
            texts = [
                "// ",
                " // comments\n// ",
                " \n"
            ],
            parser
        ;
        
        parser = new ExParser({
            expressions: [
                ["include", INCLUDE_SEQUENCE],
                ["depends", DEPENDS_SEQUENCE]
            ],
            listeners: {
                text: function (txt, p) {
                    // console.log("PREEXPRESSION");
                    txt.should.equal(texts[count]);
                    count++;
                },
                include: function (captures, p) {
                    var match = captures[0],
                        path  = captures[1],
                        pre   = p.getLastText()
                    ;
                    
                    // console.log("INCLUDE");
                    
                    path.should.equal("some/file/to/include.js");
                    pre.should.equal("// ");
                    match.should.equal("@include some/file/to/include.js");
                    
                    includeMatch = true;
                },
                depends: function (captures, p) {
                    var match = captures[0],
                        path  = captures[1],
                        pre   = p.getLastText()
                    ;
                    
                    // console.log("DEPENDS");
                    
                    path.should.equal("some/file/to/depend.js");
                    pre.should.equal(" // comments\n// ");
                    match.should.equal("@depend some/file/to/depend.js");
                    
                    dependMatch = true;
                }
            }
        });
        
        parser.parse(
            "// @include some/file/to/include.js // comments\n" +
            "// @depend some/file/to/depend.js \n"
        );
        
        includeMatch.should.equal(true);
        dependMatch.should.equal(true);
        // Did we match our pre-expressions?
        count.should.equal(3);
    });
});
