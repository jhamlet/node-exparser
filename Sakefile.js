/*globals FileList, CLEAN, CLOBBER, desc, task, taskSync, directory, write, slurp, file, fileSync, sh, read, spit, log */

var FS          = require("fs"),
    Path        = require("path"),
    authorInfo  = read("AUTHORS", "utf8").split("\n")[0],
    buildStart  = new Date(),
    readMeFiles = new FileList(),
    buildComplete
;

require("sake/clean");
//---------------------------------------------------------------------------
// Overall build tasks
//---------------------------------------------------------------------------
taskSync("pre-build", function (t) {
    log.info("Starting build at " + buildStart);
});

taskSync("build", ["pre-build"], function (t) {
    var delta;
    
    buildComplete = new Date();
    delta = buildComplete.getTime() - buildStart.getTime();
    
    log.info("Build complete at " + buildComplete);
    log.info(delta + " ms");
});
//---------------------------------------------------------------------------
// LICENSE
//---------------------------------------------------------------------------
if (((new Date()).getFullYear() < FS.statSync("LICENSE").mtime.getFullYear()) ||
    (FS.statSync("AUTHORS").mtime.getTime() > FS.statSync("LICENSE").mtime.getTime())
) {
    desc("Keep the LICENSE file up-to-date.");
    fileSync("LICENSE", function (t) {
        var year = new Date().getFullYear(),
            license = read(t.name, "utf8").split("\n")
        ;

        license[0] = "Copyright (c) " + year + " " + authorInfo;

        write(t.name, license.join("\n"), "utf8");
        log.info(t.name + " updated");
    });
}
//---------------------------------------------------------------------------
// README file
//---------------------------------------------------------------------------
readMeFiles.include(
    "README.tmpl", "package.json", "LICENSE", "AUTHORS", Path.basename(__filename)
);

desc("Generate the README.md documentation");
fileSync("README.md", readMeFiles, function (t) {
    var _ = require("underscore"),
        pkgInfo = JSON.parse(slurp("package.json", "utf8")),
        tmpl    = _.template(slurp(t.prerequisites[0], "utf8")),
        tmplParams = {
            pkg: pkgInfo,
            license: slurp("./LICENSE", "utf8")
        }
    ;
    
    spit(t.name, tmpl(tmplParams), "utf8");
    log.info("Update " + t.name);
});
CLEAN.include("README.md");

task("build", ["README.md"]);
task("default", ["build"]);