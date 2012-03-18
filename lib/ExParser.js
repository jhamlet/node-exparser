/**
 * 
 */
var Proteus     = require("proteus"),
    EM          = require("events").EventEmitter,
    StrScanner  = require("pstrscan"),
    Expression  = require("./Expression"),
    sysutil     = require("util"),
    PClass      = Proteus.Class,
    isRegExp    = sysutil.isRegExp,
    ExParser
;

//---------------------------------------------------------------------------
// Private
//---------------------------------------------------------------------------
/**
 * Execute the expression sequences against the supplied string scanner,
 * returning whether any expression matches at the scanner's current position
 * 
 * @method execExpressions
 * @private
 * @param scanner {StringScanner} StringScanner to use for scanning
 * @returns {boolean}
 */
function execExpressions (scanner) {
    var pos  = scanner.pos,
        exps = this.expressions,
        i    = exps.length,
        exp, expName, expSeq,
        results
    ;
    
    while (i--) {
        exp = exps[i];
        expName = exp[0];
        expSeq  = exp[1];
        if ((results = expSeq.exec(scanner))) {
            /**
             * The match from the last successful expression match
             * 
             * @property match
             * @type {string}
             * @default undefined
             */
            this.match = expSeq.match;
            /**
             * Array of strings for each capture from the last successful
             * expression match
             * 
             * @property captures
             * @type {array}
             * @default undefined
             */
            this.captures = results;
            this.preExpressionEndPos = pos;
            /**
             * Fired when an expression is found
             * 
             * @event preexpression
             * @param {object} the ExpressionParser instance
             * @param {string} the pre expression text
             */
            this.emit("preexpression", this.getPreExpression(), this);
            /**
             * Fired when an expression is found
             * 
             * @event *
             * @param {object} the ExpressionParser instance
             * @param {array[string]} the captures from the expression match
             */
            this.emit(expName, results, this);
            this.preExpressionStartPos = scanner.pos;
            return true;
        }
    }
    
    return false;
}

//---------------------------------------------------------------------------
// Public/Exports
//---------------------------------------------------------------------------
module.exports = ExParser = PClass.derive({
    
    self: {
        /**
         * Reference to our Expression Sequence utility class.
         * 
         * @property Expression
         * @type {function}
         * @static
         */
        Expression: Expression
    },
    
    /**
     * @method init
     * @param opts {object}
     *      @param expressions {array[string, String|RegExp|Expression...]}
     *      @param handlers {object} expression-name/function
     */
    init: function (opts) {
        var self, exps, evts;
        
        if (opts) {
            self = (exps = opts.expressions) && this.addExpressions(exps);
            self = (evts = opts.handlers) && this.addHandlers(evts);
        }
    },
    /**
     * Parse the supplied source string for defined expression sequences,
     * firing off the handler event for that expression as it parses.
     * 
     * @method parse
     * @param source {string|StringScanner} the string to parse
     * @returns {object} ExpressionParser instance
     */
    parse: function (src) {
        var scanner, pivotPattern, matchLen;
        
        /**
         * The interal StringScanner instance used to traverse the string
         * 
         * @property scanner
         * @type {StringScanner}
         * @default undefined
         */
        scanner = (
            this.scanner = typeof src.scan === "function" ?
                src : new StrScanner(src)
        );
        /**
         * The position after the last expression match
         * 
         * @property preExpressionStartPos
         * @type {integer}
         * @default 0
         */
        /**
         * The position before the last expression match
         * 
         * @property preExpressionEndPos
         * @type {integer}
         * @default 0
         */
        this.preExpressionStartPos = this.preExpressionEndPos = scanner.pos;
        /**
         * Fired when parsing begins
         * 
         * @event start
         * @param {object} the ExpressionParser instance
         */
        this.emit("start", this);
        
        pivotPattern = this.getPivotPattern();
        while (scanner.scanUntil(pivotPattern)) {
            // rewind the scanner by the length of the found token,
            matchLen = scanner.getMatch().length;
            scanner.pos -= matchLen;
            // so each expression can try to match from that point
            if (!execExpressions.call(this, scanner)) {
                scanner.pos += matchLen;
            }
        }
        /**
         * @event done
         * @param {object} the ExpressionParser instance
         */
        this.emit("done", this);
        
        return this;
    },
    /**
     * Add a named expression
     * 
     * @method addExpression
     * @param name {string} name of the expression
     * @param seq {array} the sequence of regular expressions to match
     * @returns {object} ExpressionParser instance
     */
    addExpression: function (name, seq) {
        var firstSeq = Array.isArray(seq) ? seq[0] : seq,
            exps
        ;
        // TODO: find a way to do this test without resorting to typing the
        // passed argument. AKA: use duck-typing
        if (typeof firstSeq !== "string" && !isRegExp(firstSeq)) {
            throw new TypeError(
                "ExpressionParser#addExpression: Expected first item of " +
                "sequence array to be a String or a Regular Expression."
            );
        }
        /**
         * The list of defined expressions for this Expression Parser
         * @property expressions
         * @type {array}
         * @default undefined
         */
        exps = this.expressions || (this.expressions = []);
        exps.push([name, new Expression(seq)]);

        return this;
    },
    /**
     * Add multiple named expressions.
     * 
     * @method addExpressions
     * @param exps {object} object map of name => sequence list {array}
     * @returns {object} ExpressionParser instance
     */
    addExpressions: function (exps) {
        Object.keys(exps).forEach(function (name) {
            this.addExpression(name, exps[name]);
        }, this);

        return this;
    },
    /**
     * Add an expression event handler
     * 
     * @method addHandler
     * @param name {string} expression event name
     * @param fn {function} handler function
     * @returns {object} ExpressionParser instance
     */
    addHandler: function (name, fn) {
        this.on(name.toLowerCase(), fn);
        return this;
    },
    /**
     * Add multiple expression event handlers
     * 
     * @method addHandlers
     * @param handlers {object} object map of name => function
     * @returns {object} ExpressionParser instance
     */
    addHandlers: function (handlers) {
        Object.keys(handlers).forEach(function (name) {
            this.addHandler(name, handlers[name]);
        }, this);

        return this;
    },
    /**
     * Get a regular expression that represents the starting token of every
     * expression sequence
     * 
     * @method getPivotPattern
     * @returns {RegExp}
     */
    getPivotPattern: function () {
        var map = {};
        
        this.expressions.forEach(function (exp) {
            map[exp[1].getStartPattern().source] = 1;
        });
        
        return new RegExp(Object.keys(map).join("|"));
    },
    /**
     * Get the text between the last expression, or starting position, and
     * the current expression
     * 
     * @method getPreExpression
     * @returns {string}
     */
    getPreExpression: function () {
        return this.scanner.source.slice(
            this.preExpressionStartPos,
            this.preExpressionEndPos
        );
    }
});

// Include EventEmitter functionality
ExParser.include(EM);
