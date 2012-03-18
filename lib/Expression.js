
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
        (isArr && pattern.some(collectCaptures) && [])
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
     * @constructor
     */
    init: function (patterns, action) {
        this.reset();
        this.addPatterns(patterns);
        this.action = action;
    },
    
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
        if (isArray(pattern)) {
            pattern.forEach(this.addOrPattern, this);
        }
        else {
            this.patterns.push(
                typeof pattern === "string" ?
                    new RegExp(pattern, "gm") :
                    pattern
            );
        }
        
        return this;
    },
    and: Proteus.aliasMethod("addPattern"),
    addPatterns: function (/*patterns*/) {
        var pats = isArray(arguments[0]) ?
                    arguments[0] :
                    Proteus.slice(arguments);
        pats.forEach(this.addPattern, this);
        return this;
    },
    addOrPattern: function (/*patterns*/) {
        return this;
    },
    or: Proteus.aliasMethod("addOrPatterns"),
    /**
     * Run our sequence against the passed text, or string scanner, and
     * return the captured expressions, or null if it did not match.
     * 
     * @method exec
     * @param txt {string|StringScanner}
     * @returns {null|array[string]}
     */
    exec: function (txt) {
        var pats = this.patterns,
            results
        ;
        
        this.scanner = txt;
        this.captures = [""];
        
        results = pats.every(collectCaptures, this) ? this.captures : null;
        
        if (results) {
            this.match = this.scanner.source.slice(this.startPos, this.scanner.pos);
            results[0] = this.match;
            results.index = this.startPos;
            if (typeof this.action === "function") {
                results = this.action(results);
            }
        }
        else {
            this.scanner.pos = this.startPos;
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
        // testing the scanner does not advance it, so we reset our position
        // to where we started
        this.__scanner__.pos = this.startPos;
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
        this.startPos = ((s = this.__scanner__) && s.pos) || 0;
        return this;
    },
    /**
     * Get the first pattern token for this sequence
     * 
     * @method getStartPattern
     * @returns {RegExp} the starting regular expression pattern
     */
    getStartPattern: function () {
        var pat = this.patterns[0];
        return !isRegExp(pat) && pat.getStartPattern ?
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
        if (!this.hasOwnProperty("__scanner__")) {
            Object.defineProperty(this, "__scanner__", {
                value: undefined,
                writable: true
            });
        }
        
        this.__scanner__ =
            (typeof s.check === "function" && typeof s.scan === "function") ?
                s : new StrScanner(s);
        
        this.reset();
    }
});
