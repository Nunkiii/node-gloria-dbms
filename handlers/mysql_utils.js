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
	    setTimeout(sql_connect, 2000); 
	}else{
            console.log("CNX OPEN, OK CNX id : " + exports.sql_cnx.threadId);
	    result_cb(null, exports.sql_cnx);
	}
    });       

    exports.sql_cnx.on('error', function(err) {
	console.log('db error', err);
	if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
	    sql_connect();                        
	} else {                                  
	    result_cb(err);                            
	}
    });
}
