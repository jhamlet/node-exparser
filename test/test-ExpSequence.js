
var should = require("should"),
    ExpSeq = require("../lib/ExpSequence")
;

suite("Expression Sequence", function () {

    test("Basic sequence matching", function () {
        var seq = new ExpSeq(/@/, /(include|depends?)/, /\s+/, /([^\s]+)/),
            captures
        ;
        
        seq.test("@include some/path/to/file.js ").should.equal(true);
        captures = seq.captures;
        
        captures.should.include("include");
        captures.should.include("some/path/to/file.js");
        
        seq.match.should.eql("@include some/path/to/file.js");
    });

    test("Nested sequence matching", function () {
        var startToken = /@/,
            dirStart   = new ExpSeq(startToken, /(\w+)/),
            dirExp     = new ExpSeq(dirStart, /\s+/, /([^\s]+)/),
            captures, match
        ;
        
        dirExp.test("@depends path/to/file.js ").should.equal(true);
        captures = dirExp.captures;
        match = dirExp.match;
        
        captures.should.include("depends");
        captures.should.include("path/to/file.js");
        
        match.should.eql("@depends path/to/file.js");
    });
    
    test("Functions used to match", function () {
        var seq = new ExpSeq(/@/, function (s) {
                if (s.scan(/\w+/)) {
                    return [s.getMatch()];
                }
            }, /\s+/, /([^\s]+)/),
            match, captures
        ;
        
        captures = seq.exec("@include path/to/file.js ");
        match = seq.match;
        
        captures.should.include("include");
        captures.should.include("path/to/file.js");
        
        match.should.eql("@include path/to/file.js");
    });
    
    test("A bit of every thing", function () {
        var startToken  = /@/,
            dirWord     = /(include|depends?)/i,
            whiteSpace  = /\s+/,
            dirStart    = new ExpSeq(startToken, dirWord, whiteSpace),
            dirExp      = new ExpSeq(dirStart, function (scanner) {
                var match;
                if ((match = scanner.scan(/([^\s]+)/))) {
                    return [match];
                }
            }),
            match,
            captures
        ;
        
        dirExp.test("@depends some/path/to/a/file.js ").should.eql(true);
        match    = dirExp.match;
        captures = dirExp.captures;
        
        captures.should.include("depends");
        captures.should.include("some/path/to/a/file.js");
        
        match.should.eql("@depends some/path/to/a/file.js");
    });
    
    test("Function as first pattern throws an exception", function () {
        (function () {
            new ExpSeq(function (s) {});
        }).should.throw();
    });
});
