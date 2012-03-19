/*globals suite, test, setup, teardown */

var should = require("should"),
    Expression = require("../lib/Expression")
;

suite("Expression", function () {

    test("Basic sequence matching", function () {
        var seq = new Expression([/@/, /(include|depends?)/, /\s+/, /([^\s]+)/]),
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
            dirStart   = new Expression([startToken, /(\w+)/]),
            dirExp     = new Expression([dirStart, /\s+/, /([^\s]+)/]),
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
        var seq = new Expression([/@/, function (s) {
                if (s.scan(/\w+/)) {
                    return [s.getMatch()];
                }
            }, /\s+/, /([^\s]+)/]),
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
            dirStart    = new Expression([startToken, dirWord, whiteSpace]),
            dirExp      = new Expression([dirStart, function (scanner) {
                var match;
                if ((match = scanner.scan(/([^\s]+)/))) {
                    return [match];
                }
            }]),
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
    
    test("One 'or' at a time", function () {
        var exp = new Expression(/@/),
            captures
        ;
        
        exp.and(/(depends?)/).or(/(include)/);
        
        captures = exp.exec("@include some/path/to/file.js");
        captures[0].should.eql("@include");
        captures[1].should.eql("include");
        
        captures = exp.exec("@depends some/path/to/file.js");
        captures[0].should.eql("@depends"); // match
        captures[1].should.eql("depends"); // capture
    });
    
    test("Adding 'or' condition in multiples", function () {
        var exp = new Expression(/@/),
            captures
        ;
        
        exp.or(/(depends?)/, /(include)/);
        
        captures = exp.exec("@include some/path/to/file.js");
        captures[0].should.eql("@include");
        captures[1].should.eql("include");
        
        captures = exp.exec("@depends some/path/to/file.js");
        captures[0].should.eql("@depends"); // match
        captures[1].should.eql("depends"); // capture
    });
    
    test("Extended expression generation", function () {
        var exp = new Expression(/@/),
            captures
        ;
        
        exp.and(/(depends?)/).or(/include/).and(/\s+/).and(/([^\s]+)/);
        
        captures = exp.exec("@depends some/path/to/file.js");
        captures[0].should.eql("@depends some/path/to/file.js");
        captures[1].should.eql("depends");
        captures[2].should.eql("some/path/to/file.js");
        
        exp = new Expression(/@/);
        exp.or(/(depends?)/, /(include)/);
        exp.and(/\s+/, /([^\s]+)/);
        
        captures = exp.exec("@depend some/path/to/file.js");
        captures[0].should.eql("@depend some/path/to/file.js");
        captures[1].should.eql("depend");
        captures[2].should.eql("some/path/to/file.js");
        
        exp = new Expression(/@/);
        exp.and(/(depends)/).or(/(depend)/);
        exp.and(/\s+/).and(function (s) {
            var match;
            if ((match = s.scanUntil(/\s/))) {
                return [match];
            }
        });
        
        captures = exp.exec("@depends some/path/to/file.js ");
        captures[0].should.eql("@depends some/path/to/file.js ");
        captures[1].should.eql("depends");
        captures[2].should.eql("some/path/to/file.js ");
    });
});
