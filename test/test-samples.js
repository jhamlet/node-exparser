/*globals suite, test, setup, teardown */

var should = require("should"),
    ExParser = require("../"),
    Expression = ExParser.Expression,
    FS = require("fs"),
    WORD_PATTERN = /(([\w_-]+\.?)+)/,
    INCLUDE_EXP = new Expression([/@/, /include/, /\s+/, /([^\s]+)/]),
    DEPEND_EXP = new Expression([/@/, /depends?/, /\s+/, /([^\s]+)/])
    REQUIRE_EXP = new Expression([/@/, /requires?/, /\s+/, /([^\s]+)/]),
    REPLACEMENT_EXP = new Expression([/\$/, WORD_PATTERN, /\$/])
;

suite("Samples", function () {
    var text = FS.readFileSync(__dirname + "/sample-patterns.txt"),
        includes = [],
        depends  = [],
        requires = [],
        tokens   = [],
        parser = new ExParser({
            expressions: {
                include: INCLUDE_EXP,
                depend: DEPEND_EXP,
                require: REQUIRE_EXP,
                replacement: REPLACEMENT_EXP
            },
            handlers: {
                include: function (captures) {
                    var path = captures[1];
                    includes.push(path);
                },
                depend: function (captures) {
                    var path = captures[1];
                    depends.push(path);
                },
                require: function (captures) {
                    var path = captures[1];
                    requires.push(path);
                },
                replacement: function (captures) {
                    var token = captures[1];
                    tokens.push(token);
                }
            }
        }),
        start, finish
    ;
    
    text = Array(5000).join(text);
    console.log(text.length);

    console.log(parser.getPivotPattern());
    
    start = Date.now();
    parser.parse(text);
    finish = Date.now();
    
    test("includes", function () {
        // console.log("INCLUDES");
        // includes.forEach(function (path) {
        //     console.log(Array(4).join(" ") + path);
        // });
    });

    test("depends", function () {
        // console.log("DEPENDS");
        // depends.forEach(function (path) {
        //     console.log(Array(4).join(" ") + path);
        // });
    });

    test("requires", function () {
        // console.log("REQUIRES");
        // requires.forEach(function (path) {
        //     console.log(Array(4).join(" ") + path);
        // });
    });

    test("replacements", function () {
        // console.log("REPLACEMENTS");
        // tokens.forEach(function (path) {
        //     console.log(Array(4).join(" ") + path);
        // });
    });
    
    console.log((finish - start) + "ms");
});
