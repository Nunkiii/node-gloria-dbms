var sql_server_opts;

exports.init=function(pkg){
    console.log("gloria dbms GET handlers init pkg ! " + JSON.stringify(pkg.opts.sql_server_opts));
    sql_server_opts=pkg.opts.sql_server_opts;
    submit_opts=pkg.opts.submit;
    upload_dir = pkg.opts.upload_dir;
}
