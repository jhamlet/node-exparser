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
    isArray     = sysutil.isArray,
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
    var pos  = scanner.getPosition(),
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
             * @event text
             * @param {string} the pre expression text
             * @param {object} the ExpressionParser instance
             */
            this.emit("text", this.getLastText(), this);
            /**
             * Fired when an expression is found
             * 
             * @event *
             * @param {array[string]} the captures from the expression match
             * @param {object} the ExpressionParser instance
             */
            this.emit(expName, results, this);
            this.preExpressionStartPos = scanner.getPosition();
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
     *      @param listeners {object} expression-name/function
     */
    init: function (opts) {
        var self, exps, evts;
        
        if (opts) {
            self = (exps = opts.expressions) && this.addExpressions(exps);
            self = (evts = opts.listeners) && this.addListeners(evts);
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
        var scanner, pivotPattern, pos, matchLen;
        /**
         * The interal StringScanner instance used to traverse the string
         * 
         * @property scanner
         * @type {StringScanner}
         * @default undefined
         */
        scanner = (
            this.scanner = typeof src.scan === "function" ?
                // make sure we have a pstrscan instance
                src.setPosition ? src : new StrScanner(src.getSource()) :
                new StrScanner(src)
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
        this.preExpressionStartPos = this.preExpressionEndPos =
                scanner.getPosition();
        /**
         * Fired when parsing begins
         * 
         * @event start
         * @param {object} the ExpressionParser instance
         */
        this.emit("start", this);
        
        pivotPattern = this.getPivotPattern();
        while (scanner.scanUntil(pivotPattern)) {
            pos = scanner.getPosition();
            // rewind the scanner by the length of the found token,
            matchLen = scanner.getMatch().length;
            scanner.setPosition(pos - matchLen);
            // so each expression can try to match from that point
            if (!execExpressions.call(this, scanner)) {
                scanner.setPosition(pos + matchLen);
            }
        }
        // We're done, so terminate our scanner
        scanner.terminate();
        // Update our preExpressionEndPos
        this.preExpressionEndPos = scanner.getPosition();
        // and fire our last text event
        this.emit("text", this.getLastText(), this);
        /**
         * @event end
         * @param {object} the ExpressionParser instance
         */
        this.emit("end", this);
        
        return this;
    },
    /**
     * Add a named expression and optional listener
     * 
     * @method addExpression
     * @param name {string} name of the expression
     * @param seq {array} the sequence of regular expressions to match
     * @param fn {function} optional, function to use as an event handler
     * @returns {object} ExpressionParser instance
     */
    addExpression: function (name, seq, fn) {
        var isExp = seq instanceof ExParser.Expression,
            exps
        ;
        /**
         * The list of defined expressions for this Expression Parser
         * 
         * @property expressions
         * @type {array}
         * @default undefined
         */
        exps = this.expressions || (this.expressions = []);
        exps.push([name, isExp ? seq : new Expression(seq)]);

        if (fn) {
            this.addListener(name, fn);
        }
        
        return this;
    },
    /**
     * Add multiple named expressions.
     * 
     * @method addExpressions
     * @param exps {object} object map of name => expression list {array}
     * @returns {object} ExpressionParser instance
     */
    addExpressions: function (exps) {
        Object.keys(exps).forEach(function (name) {
            this.addExpression(name, exps[name]);
        }, this);

        return this;
    },
    /**
     * Add multiple expression event listeners
     * 
     * @method addListeners
     * @param listeners {object} object map of name => function
     * @returns {object} ExpressionParser instance
     */
    addListeners: function (listeners) {
        Object.keys(listeners).forEach(function (name) {
            this.addListener(name, listeners[name]);
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
     * @method getLastText
     * @returns {string}
     */
    getLastText: function () {
        return this.scanner.getSource().slice(
            this.preExpressionStartPos,
            this.preExpressionEndPos
        );
    }
});

// Include EventEmitter functionality
ExParser.include(EM);
