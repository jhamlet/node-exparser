
var Proteus     = require("proteus"),
    StrScanner  = require("strscan").StringScanner,
    isRegExp    = require("util").isRegExp,
    ExpSequence
;

//---------------------------------------------------------------------------
// Private
//---------------------------------------------------------------------------
/**
 * 
 * @method collectCaptures
 * @private
 * @param pattern {RegExp|ExpSequence|Function} pattern to do the matching
 * @returns {boolean} Whether or not the current pattern matched
 */
function collectCaptures (pattern) {
    var captures = this.captures,
        isFn     = typeof pattern === "function",
        isSeq    = typeof pattern.exec === "function" && !isRegExp(pattern),
        scanner  = this.scanner,
        results,
        matchTxt,
        pos
    ;
    
    pos = scanner.head;
    if (isFn && (results = pattern(scanner))) {
        matchTxt = scanner.source.slice(pos, scanner.head);
    }
    else if (isSeq && pattern.exec(scanner)) {
        matchTxt = pattern.match;
        results  = pattern.captures;
    }
    else if ((matchTxt = scanner.scan(pattern))) {
        results  = scanner.captures;
    }
    else {
        return false;
    }
    
    this.match += matchTxt;
    results.splice(0, 0, captures.length, 0);
    captures.splice.apply(captures, results);
    // captures.splice.apply(
    //     captures,
    //     [captures.length, 0].concat(results)
    // );
    
    return true;
}

//---------------------------------------------------------------------------
// Public/Exports
//---------------------------------------------------------------------------
module.exports = ExpSequence = Proteus.Class.derive({
    /**
     * @method init
     * @param patterns {String|RegExp|Function}
     * @constructor
     */
    init: function (/*patterns*/) {
        var pats = Array.isArray(arguments[0]) ?
                    arguments[0] :
                    Proteus.slice(arguments);
                    
        this.reset();
        pats.forEach(this.addPattern, this);
    },
    
    /**
     * @property patterns
     * @type {array[RegExp|ExpSequence]}
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
     * @param pattern {RegExp|string}
     * @returns {ExpSequence} the instance
     */
    addPattern: function (pattern) {
        var pats = this.patterns;
        
        if (typeof pattern === "string") {
            pattern = new RegExp(pattern);
        }
        
        if (!pats.length && typeof pattern === "function") {
            throw new Error(
                "ExpressionSequence: first pattern should be a string or " +
                "regular expression, not a function."
            );
        }
        
        pats.push(pattern);
        
        return this;
    },
    /**
     * Run our sequence against the passed text, or string scanner, and
     * return the captured expressions, or null if it did not match.
     * 
     * @method exec
     * @param txt {string|StringScanner}
     * @returns {null|array[string]}
     */
    exec: function (txt) {
        var pats = this.patterns;
        this.scanner = txt;
        return pats.every(collectCaptures, this) ?
                this.captures : null;
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
        this.__scanner__.head = this.startPos;

        return result !== null;
    },
    reset: function () {
        var s;
        
        // do not clear patterns, just define it if it isn't defined
        this.patterns = this.patterns || [];
        // clear these out
        (this.captures || (this.captures = [])).length = 0;
        this.match = "";
        
        this.startPos = ((s = this.__scanner__) && s.head) || 0;

        return this;
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
        if (!this.__scanner__) {
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
