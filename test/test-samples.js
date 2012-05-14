/*globals suite, test, setup, teardown */

var should = require("should"),
    ExParser = require("../"),
    Expression = ExParser.Expression,
    textSize = parseInt(process.env.TEXT_MULTIPLE, 10) || 2000,
    FS = require("fs"),
    WORD_PATTERN = /(([\w_\-]+\.?)+)/,
    INCLUDE_EXP     = new Expression([/@/, /include/, /\s+/, /([^\s]+)/]),
    DEPEND_EXP      = new Expression([/@/, /depends?/, /\s+/, /([^\s]+)/]),
    REQUIRE_BC_EXP  = new Expression([/@/, /requires?/, /\s+/, /([^\s]+)/]),
    REQUIRE_FN_EXP  = new Expression([/\brequire\(\"/, /([^\"]+)/, /"\)/]),
    REQUIRE_EXP     = new Expression([[REQUIRE_BC_EXP, REQUIRE_FN_EXP]]),
    REPLACEMENT_EXP = new Expression([/\$/, WORD_PATTERN, /\$/])
;

// console.log(REQUIRE_EXP.getStartPattern());

suite("Samples", function () {
    var text,
        includes, depends, requires, tokens,
        parser
    ;

    setup(function () {
        text = FS.readFileSync(__dirname + "/sample-patterns.txt");
        includes = [];
        depends  = [];
        requires = [];
        tokens   = [];
        parser = new ExParser({
            expressions: [
                ["include",     INCLUDE_EXP],
                ["depend",      DEPEND_EXP],
                ["require",     REQUIRE_EXP],
                ["replacement", REPLACEMENT_EXP]
            ],
            listeners: {
                include: function (captures) {
                    var path = captures[1];
                    // console.log("INCLUDE " + path);
                    includes.push(path);
                },
                depend: function (captures) {
                    var path = captures[1];
                    // console.log("DEPEND " + path);
                    depends.push(path);
                },
                require: function (captures) {
                    var path = captures[1];
                    // console.log("REQUIRE " + path);
                    requires.push(path);
                },
                replacement: function (captures) {
                    var token = captures[1];
                    // console.log("TOKEN " + token);
                    tokens.push(token);
                }
            }
        });

        text = Array(textSize).join(text);
    });
    
    test("Samples", function () {
        parser.parse(text);
    });

});
