
var mysql = require('mysql');
var sqlut = require('./mysql_utils');

exports.init=function(pkg){
    console.log("gloria dbms GET handlers init pkg ! " + JSON.stringify(pkg.opts.sql_server_opts));
    sqlut.sql_server_opts=pkg.opts.sql_server_opts;
}


get_handlers.gloria = {

    query_images : {

	process : function (query, request, res){
	}
    },

    get_image : {
	process : function (query, request, res){

	    res.writeHead(200, {
		'Access-Control-Allow-Origin' : '*',
		'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
		'Access-Control-Allow-Headers': 'Content-Type',
		'content-type': 'text/plain'
		
	    });			    

	    res.write("Hello ");
	    res.end();
	    
	}
    }
};