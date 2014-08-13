
var mysql = require('mysql');
var sqlut = require('./mysql_utils');

exports.init=function(pkg){
    console.log("gloria dbms GET handlers init pkg ! " + JSON.stringify(pkg.opts.sql_server_opts));
    sqlut.sql_server_opts=pkg.opts.sql_server_opts;
}

function reply_gloria_error(res, msg){
    res.writeHead(200, {
	'Access-Control-Allow-Origin' : '*',
	'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
	'Access-Control-Allow-Headers': 'Content-Type',
	'content-type': 'application/json'
    });			    
    
    res.write(JSON.stringify({n : -1, error : msg});
    res.end();
}

get_handlers.gloria = {

    query_images : {

	process : function (query, request, res){
	    if(typeof query.req=='undefined')
		return reply_gloria_error("No request given");
	    try{
		console.log("processing request " + query.req);

		var request = JSON.parse(query.req);


		sqlut.sql_connect(function(err, sql_cnx) {
		    if(err){
			return reply_gloria_error(res,"Error connecting to MySQL : " + err); 
		    }
		    
		    console.log("Ok, inserting ["+  JSON.stringify(image_header) +"]");
		    
		    var query = sql_cnx.query('INSERT INTO '+table_name+' SET ?', image_header, function(err, result) {
			
			if(err){
			    
			    return result_cb("Error inserting entry in DB : " + err); 
			}
			else {
			    var img_id=result.insertId;
			    console.log("Mysql query OK : result : " + JSON.stringify(result));
			    
			    result_cb(null, img_id);
			}
		    });
		    
		    console.log(query.sql);
		});
		
	    }
	    catch (e){
		console.log("Error request : " + dump_error(e));
		return reply_gloria_error("Error processing request !");
	    }
	    
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
