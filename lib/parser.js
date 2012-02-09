
var Proteus     = require("proteus"),
    EM          = require("events").EventEmitter,
    StrScanner  = require("strscan").StringScanner,
    Class       = Proteus.Class,
    Parser
;

module.exports = Parser = Class.derive({
    
    init: function (opts) {
        var directives, handlers;
        
        if (opts && (directives = opts.directives)) {
            this.addDirectives(directives);
        }
        
        if (opts && (handlers = opts.handlers)) {
            this.addHandlers(handlers);
        }
    },
    
    /**
     * 
     * @method addDirective
     * @param name {string}
     * @param rest {RegExp|Expression|string}
     */
    addDirective: function (/*name, rest*/) {
        var args = Proteus.slice(arguments),
            name = args.shift(),
            exp
        ;
        
        if (!this.hasOwnProperty("__directives__")) {
            Object.defineProperty(this, "__directives__", {
                value: []
            });
        }
        
        if (args.length === 1 && typeof args[0].scan === "function") {
            exp = args[0];
        }
        else {
            exp = proxyConstructor(Expression, args);
        }
        
        this.__directives__.push([name, ]);
    },
    
    addDirectives: function (directives) {
        directives.forEach(this.addDirective, this);
    },
    
    addHandler: Proteus.aliasMethod("on"),

    addHandlers: function (handlers) {
        Object.keys(handlers).forEach(function (name) {
            this.on(name, handlers[name]);
        });
    }
});


function proxyConstructor (Ctor, args) {
    var F = function () {
            Ctor.apply(this, arguments);
        }
    ;
    
    F.prototype = Ctor.prototype;
    
    return new F(args);
}
