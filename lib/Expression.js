
var Proteus     = require("proteus"),
    StrScanner  = require("pstrscan"),
    sysutil     = require("util"),
    isRegExp    = sysutil.isRegExp,
    isArray     = sysutil.isArray,
    Expression
;
//---------------------------------------------------------------------------
// Private
//---------------------------------------------------------------------------
/**
 * @method collectCaptures
 * @private
 * @param pattern {array|RegExp|Expression|Function} pattern to do the matching
 * @returns {boolean} Whether or not the current pattern matched
 */
function collectCaptures (pattern) {
    var captures = this.captures,
        fnStr    = "function",
        isArr    = isArray(pattern),
        isRe     = isRegExp(pattern),
        isFn     = !isArr && !isRe && typeof pattern === fnStr,
        isExp    = !isArr && !isRe && !isFn && typeof pattern.exec === fnStr,
        scanner  = this.scanner,
        results
    ;
    
    if ((results =
        (isFn && pattern(scanner)) ||
        (isRe && scanner.scan(pattern) && scanner.captures.slice(1)) ||
        (isExp && (results = pattern.exec(scanner)) && results.slice(1)) ||
        (isArr && pattern.some(collectCaptures, this) && (results = []))
    )) {
        captures.splice.apply(
            captures,
            [captures.length, 0].concat(results)
        );
        return true;
    }

    return false;
}

//---------------------------------------------------------------------------
// Public/Exports
//---------------------------------------------------------------------------
module.exports = Expression = Proteus.Class.derive({
    /**
     * @method init
     * @param patterns {array[String|RegExp|Function]}
     * @param opts {object} optional, 
     * @constructor
     */
    init: function (patterns, opts) {
        this.reset();
        this.addPattern.apply(this, isRegExp(patterns) ? [patterns] : patterns);
        if (opts) {
            this.action = opts.action;
            if (opts.functionStartPattern) {
                this.functionStartPattern = opts.functionStartPattern;
            }
        }
    },
    /**
     * Used to determine the start pattern for a function used as a pattern
     * 
     * @property functionStartPattern
     * @type {RegExp}
     * @default /\b\S/
     */
    functionStartPattern: /\b\S/,
    /**
     * @property patterns
     * @type {array[RegExp|Expression]}
     * @default []
     */
    
    /**
     * The array of captures our sequence matched.
     * @property captures
     * @type {array[string]}
     * @default []
     */
    
    /**
     * The matching text when the sequence is run.
     * @property match
     * @type {string}
     * @default ""
     */
    
    /**
     * @method addPattern
     * @param pattern {RegExp|string|function}
     * @returns {Expression} the instance
     */
    addPattern: function (pattern) {
        if (arguments.length > 1) {
            Proteus.slice(arguments).forEach(function (pat) {
                this.addPattern(pat);
            }, this);
        }
        else if (isArray(pattern)) {
            this.addOrPattern.apply(this, pattern);
        }
        else {
            this.patterns.push(
                typeof pattern === "string" ?
                    new RegExp(pattern) :
                    pattern
            );
        }
        
        return this;
    },
    /**
     * @method and
     * @alias addPattern
     */
    and: Proteus.aliasMethod("addPattern"),
    /**
     * Add a pattern as an "or" expression.
     * 
     * If only a single pattern is given, the new pattern is grouped with
     * the previous expression, if any.  If multiple patterns are given,
     * they are treated as a single "or" grouping.
     * 
     * i.e:
     *      // exp.patterns = [/@/, /abc/]
     *      exp.or(/def/);          // => [/@/, [/abc/, /def/]]
     * 
     *      // exp.patterns = [/@/, /abc/]
     *      exp.or(/xyz/, /123/);   // => [/@/, /abc/, [/xyz, /123/]]
     * 
     * @method addOrPattern
     * @param pattern {RegExp|string|function}
     * @returns {Expression} the instance
     */
    addOrPattern: function (pattern) {
        var patterns = this.patterns,
            group
        ;
        
        if (arguments.length > 1) {
            patterns.push(Proteus.slice(arguments));
        }
        else {
            group = patterns[patterns.length-1] || [];
            group = isArray(group) ? group : [group];
            patterns[patterns.length-1] = group;
            group.push(pattern);
        }
        
        return this;
    },
    /**
     * @method or
     * @alias addOrPattern
     */
    or: Proteus.aliasMethod("addOrPattern"),
    /**
     * Run our sequence against the passed text, or string scanner, and
     * return the captured expressions, or null if it did not match.
     * 
     * @method exec
     * @param txt {string|StringScanner}
     * @returns {null|array[string]}
     */
    exec: function (txt) {
        var results;
        
        this.scanner = txt;
        this.captures = [""];
        
        results = this.patterns.every(collectCaptures, this) ?
                this.captures :
                null;
        
        if (results) {
            results[0] = this.match = this.scanner.source.slice(
                this.startPos,
                this.scanner.getPosition()
            );
            if (typeof this.action === "function") {
                this.captures = results = this.action(results);
            }
            results.index = this.startPos;
        }
        else {
            this.scanner.setPosition(this.startPos);
            this.captures = null;
        }
        
        return results;
    },
    /**
     * Does the passed text, or string scanner, match our sequence?
     * 
     * @method test
     * @param txt {string|StringScanner}
     * @returns {boolean}
     */
    test: function (txt) {
        var result = this.exec(txt);
        // testing the expression does not advance the scanner, so we reset
        // our position to where we started
        this.__scanner__.setPosition(this.startPos);
        return result !== null;
    },
    /**
     * @method reset
     * @returns {object} the Expression instance
     */
    reset: function () {
        var s;
        // do not clear patterns, just define it if it isn't defined
        this.patterns = this.patterns || [];
        // clear these out
        this.captures = this.match = null;
        this.startPos = ((s = this.__scanner__) && s.getPosition()) || 0;
        return this;
    },
    /**
     * Get the first pattern token for this sequence.  If the first pattern
     * happens to be a function, it will return Expression#functionStartPattern
     * (which defaults to /\b\S/).
     * 
     * @method getStartPattern
     * @returns {RegExp} the starting regular expression pattern
     */
    getStartPattern: function () {
        var pat = arguments[0] || this.patterns[0];
        return isArray(pat) ?
                new RegExp(pat.map(function (p) {
                    return this.getStartPattern(p).source;
                }, this).join("|")) :
                typeof pat === "function" ?
                    this.functionStartPattern :
                    pat.getStartPattern ?
                        pat.getStartPattern() :
                        pat;
    },
    /**
     * @property scanner
     * @type {StringScanner}
     * @default undefined
     */
    get scanner () {
        return this.__scanner__;
    },
    
    set scanner (s) {
        var isScanner = typeof s.scan === "function",
            isPstrscan = isScanner && typeof s.setPosition === "function"
        ;
        
        if (!this.hasOwnProperty("__scanner__")) {
            Object.defineProperty(this, "__scanner__", {
                value: undefined,
                writable: true
            });
        }
        
        this.__scanner__ = isPstrscan ?
            s :
            isScanner ?
                new StrScanner(s.source) :
                new StrScanner(s);
        
        this.reset();
    }
});
