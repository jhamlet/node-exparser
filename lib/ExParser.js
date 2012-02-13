
var Proteus     = require("proteus"),
    EM          = require("events").EventEmitter,
    StrScanner  = require("strscan").StringScanner,
    ExpSeq      = require("./ExpSequence"),
    PClass      = Proteus.Class,
    Parser
;

//---------------------------------------------------------------------------
// Private
//---------------------------------------------------------------------------
function scanExpressions (scanner) {
    
}

//---------------------------------------------------------------------------
// Public/Exports
//---------------------------------------------------------------------------
module.exports = Parser = PClass.derive({
    /**
     * @method init
     * @param opts {object}
     *      @param expressions {array[string, String|RegExp|ExpSeq...]}
     *      @param handlers {object} expression-name/function
     */
    init: function (opts) {
        var exps, evts;
        
        if (opts && (exps = opts.expressions)) {
            this.addExpressions(exps);
        }
        
        if (opts && (evts = opts.handlers)) {
            this.addHandlers(evts);
        }
    },
    
    parse: function (src, handlers) {
        var scanner, matchLen;
        
        this.emit("start", this);
        
        while (scanner.scanUntil(this.getTokenUnion())) {
            matchLen = scanner.getMatch().length;
            scanner.head -= matchLen;
            if (!scanExpressions.call(this, scanner)) {
                scanner.head += matchLen;
            }
        }
        
        this.emit("done", this);
    },
    /**
     * 
     * @method addExpression
     * @param name {string}
     * @param rest {RegExp|Expression|string}
     */
    addExpression: function (/*name, rest*/) {
        var args = Proteus.slice(arguments),
            name = args.shift()
        ;
        
        if (!this.expressions) {
            this.expressions = [];
        }
        
        this.expressions.push([name, new ExpSeq(args)]);
    },
    
    addExpressions: function (expressions) {
        expressions.forEach(this.addExpression, this);
    },
    
    addHandler: Proteus.aliasMethod("on"),

    addHandlers: function (handlers) {
        Object.keys(handlers).forEach(function (name) {
            this.on(name, handlers[name]);
        });
    },
    
    getTokenUnion: function () {
        if (!this.hasOwnProperty("__tokens__")) {
            Object.defineProperty("__tokens__", {
                value: new RegExp(
                    this.expressions.map(function (exp) {
                        return exp[1].patterns[0];
                    }).join("|")
                )
            });
        }
        
        return this.__tokens__;
    }
});

Parser.include(EM);
