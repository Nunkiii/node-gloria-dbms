var mysql = require('mysql');


exports.sql_server_opts={};
exports.sql_cnx=null;
exports.sql_connect=function(result_cb) {

    if(exports.sql_cnx!=null){
	console.log("sql connexion state is " + exports.sql_cnx.state);
	if(exports.sql_cnx.state=='authenticated') 
	    return result_cb(null, exports.sql_cnx);
    }
    
    console.log("Opening connection to sql server ...");
    
    exports.sql_cnx= mysql.createConnection(exports.sql_server_opts);
    
    exports.sql_cnx.connect(function(err) { 
	if(err) {                   
	    console.log('error when connecting to db:', err);
	    setTimeout(exports.sql_connect(function (){} ), 2000); 
	}else{
            console.log("CNX OPEN, OK CNX id : " + exports.sql_cnx.threadId);
	    result_cb(null, exports.sql_cnx);
	}
    });       

    exports.sql_cnx.on('error', function(err) {
	console.log('db error', err);
	if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
	    exports.sql_connect(function (){});                        
	} else {                                  
	    result_cb(err);                            
	}
    });
}

exports.query=function(q, cb){
    exports.sql_connect(function(err, sql_cnx) {
	if(err)
	    return result_cb("Error connecting to MySQL : " + err); 
	var query = sql_cnx.query(q,function(err, result) {
	    if(err){
		return cb(err); 
	    }
	    else {
		cb(null, result);
	    }
	});
	
	//console.log(query.sql);
    });
}

exports.create_template=function(table, cb){
    exports.query("select * from "+table+" limit 1", function(error, result){
	//console.log("Result is : " + JSON.stringify(result));
	if(error) return cb(error);
	var r=result[0];
	var tpl={table: table, elements : {}};
	Object.keys(r).forEach(function(f){
	    var o=r[f];
	    var otype=o.constructor.name;
	    switch(otype){
	    case "Number":
		tpl.elements[f]={ type : "double", value : o};
		break;
	    case "String":
		tpl.elements[f]={ type : "string", value : o};
		break;
	    case "Date":
		tpl.elements[f]={ type : "date", value : o};
		break;
	    case "Buffer":
	    default:
		console.log("Unhandled column type " + otype);
		break;
	    };
	    //console.log("field ["+f+"] :  " + o + " type " + typeof o + " date ? " + (o instanceof Date) + " consname " + o.constructor.name );
	});
	
	cb(null,tpl);
    });
    
}
