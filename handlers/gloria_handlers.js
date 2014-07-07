var formidable = require('formidable');
var mysql = require('mysql');
var fs = require('fs');
var url = require('url');
var sys = require('sys');
var fits = require('../../node-fits/build/Release/fits.node');
var sql_server_opts, submit_opts, upload_dir;

exports.init=function(pkg){
    console.log("gloria dbms init pkg ! " + JSON.stringify(pkg.opts.sql_server_opts));
    sql_server_opts=pkg.opts.sql_server_opts;
    submit_opts=pkg.opts.submit;
    upload_dir = pkg.opts.upload_dir;
}

function parse_date(key){
    var d=new Date(key); 
    console.log("parsed date ["+key+"] : "  + d);
    if(d=="Invalid Date") throw ("Invalid date given"); 
    return d;
}

function parse_number(key){
    var n=new Number(key); if(isNaN(n)) throw "invalid numerical value given"; 
    return n*1.0;
}


var keyword_postprocess = {
    date_obs : function (key){ return parse_date(key);},
    exptime : function (key){  return parse_number(key);},
    target_ra : function (key){  return parse_number(key);},
    target_dec : function (key){  return parse_number(key);}
};


function record_image_mongo(collection_name, image_header, result_cb){
    
    db.open("gloria_imgs", function(e, gloriadb){
	
	if(e) return result_cb(e);
	
	gloriadb.createCollection(collection_name,function (e, collection){

	    if(e) return result_cb(e);
	    
	    collection.insert( image_header, function(e, res){
		
		if(e) return result_cb(e); 
		result_cb(null);
	    } )
	});
    });
}

var sql_cnx;

function mysql_connect(result_cb) {
    sql_cnx= mysql.createConnection(sql_server_opts);
    sql_cnx.connect(result_cb);
}


function check_mysql_cnx(result_cb){

    console.log("Checking sql cnx...");

    if(typeof sql_cnx == 'undefined'){

	console.log("Opening connection to mysql ...");

	mysql_connect(function (err){
	    if(err){
		console.log("ERROR ..." + err.stack);
		return result_cb(err);
	    }else{
		console.log("CNX OPEN, OK CNX id : " + sql_cnx.threadId);
		result_cb(null);
	    }
	    
	});
    }else{
	console.log("CNX already open, OK");
	result_cb(null);
    }
    
    
}

function record_gloria_mysql(table_name, image_header, result_cb){
    

    check_mysql_cnx(function(err) {
	if(err){
	    result_cb("Error connecting to MySQL : " + err); 
	    return;
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

GLOBAL.handle_fits_file_download=function(image_id, result_cb){
    
    console.log("Analysing downloaded FITS file....");

    
    var http = require('http');
    var fs = require('fs');

    var file_name= Math.random().toString(36).substring(2) + ".fits";
    
    check_mysql_cnx(function(err) {
	if(err){
	    result_cb("Error connecting to MySQL : " + err); 
	    return;
	}
	
	var file = fs.createWriteStream(upload_dir + file_name);
	
	var qs="select file_url from gloria_imgs where autoID="+sql_cnx.escape(image_id)+";";

	sql_cnx.query(qs, function(err, result) {
	    if(err){
		result_cb("Error getting URL from DB : " + err); 
		return;
	    }
	    console.log("R="+JSON.stringify(result));
	    var theurl=result[0].file_url;
	    
	    console.log("Downloading URL ["+theurl+"]");

/*
	    var downloadfile = result[0].file_url;

	    var host = url.parse(downloadfile).hostname
	    var filename = upload_dir + file_name; //url.parse(downloadfile).pathname.split("/").pop()

	    var theurl = http.createClient(80, host);
	    var requestUrl = downloadfile;
	    sys.puts("Downloading file: " + filename);
	    sys.puts("Before download request");
	    var request = theurl.request('GET', requestUrl, {"host": host});
	    request.end();

	    var dlprogress = 0;

	    request.addListener('response', function (response) {
		var downloadfile = fs.createWriteStream(filename, {'flags': 'a'});
		console.log("File size " + filename + ": " + response.headers['content-length'] + " bytes.");
		response.addListener('data', function (chunk) {
		    dlprogress += chunk.length;
		    downloadfile.write(chunk, encoding='binary');
		});
		response.addListener("end", function() {
		    downloadfile.end();
		    console.log("Finished downloading " + filename);
		    var qs="update gloria set file_name="
			+ sql_cnx.escape(file_name)+", file_path="+ sql_cnx.escape(upload_dir)+ " where autoID="
			+ sql_cnx.escape(image_id)+";"; 
		    
		    console.log("Image downloaded OK ! ["+qs+"]");
		    
		    sql_cnx.query(qs,
				  function(err, result) {
				      if(err){
					  result_cb("Error updating DB : " + err); 
					  return;
				      }
				      result_cb(null);
				      
				  });
		    
		});
		
	    });

*/
	    
	    var download = function(url, dest, cb) {
		var file = fs.createWriteStream(dest);
		var request = http.get(url, function(response) {
		    response.pipe(file);
		    file.on('finish', function() {
			file.close(cb);
		    });
		});
	    }

	    download(theurl, upload_dir + file_name, function(){
		var qs="update gloria_imgs set file_name="
		    + sql_cnx.escape(file_name)+", file_path="+ sql_cnx.escape(upload_dir)+ " where autoID="
		    + sql_cnx.escape(image_id)+";"; 
		
		console.log("Image downloaded OK ! ["+qs+"]");
		
		sql_cnx.query(qs,
			      function(err, result) {
				  if(err){
				      result_cb("Error updating DB : " + err); 
				      return;
				  }
				  result_cb(null);
				  
			      });
		
		
	    });
	    
	    /*
	    var request = http.get(theurl, function(response) {
		response.pipe(file);

		file.on('finish', function() {
		    file.close(cb);

		});

		
	    }).on('error', function(e) {
		console.log("Got error downloading image : " + e.message);
		sql_cnx.query("update gloria set status='error' where autoID="+image_id+";", function(err, result) {
		    if(err){
			result_cb("Error updating DB : " + err); 
			return;
		    }
		    result_cb(null);
		    
		});
		
		});

	    */
	    
	});
	
	
    });
    
    
}


var telescope_dictionary ={
    "default" : {
	target_name : "GOBJECT",
	filter : "FILTER",
	exptime : "EXPTIME",
	date_obs : "DAT-OBS",
	target_ra : "RA",
	target_dec : "DEC",
	observer : "OBSERVER",
	instrument : "INSTRUME"
    },
  "'REM     '" : {
	target_name : "OBJECT",
	filter : "FILTER",
	exptime : "EXPTIME",
	date_obs : "DATE-OBS",
	target_ra : "RA",
	target_dec : "DEC",
	observer : "OBSERVER",
	instrument : "INSTRUME"
  }
    

};


GLOBAL.handle_fits_file_keys=function(image_id, result_cb){

    console.log("Analysing FITS keywords...");

    check_mysql_cnx(function(err) {
	if(err){
	    result_cb("Error connecting to MySQL : " + err); 
	    return;
	}

	var qs="select file_path,file_name from gloria_imgs where autoID="+sql_cnx.escape(image_id)+";";

	sql_cnx.query(qs, function(err, result) {
	    if(err){
		result_cb("Error getting image file info " + image_id +" from DB : " + err); 
		return;
	    }
	    
	    try{
		var fn=result[0].file_path + result[0].file_name;
		var f = new fits.file(fn);
		var fits_headers = f.get_headers(function(error, fits_headers){
		    
		    if(error) throw error;

		    		//console.log("Fits headers : " + JSON.stringify(fits_headers, null, 5));
		
		    
		    var telename = fits_headers[0].keywords["TELESCOP"].value;
		    //telename=telename.replace(/[']/g, "");
		    
		    if(typeof telename=="undefined") 
			throw "Mandatory FITS Key TELESCOP not found !"; 
		    var teledic = telescope_dictionary[telename];
		    
		    if(typeof teledic=="undefined"){
			console.log(" Warning : Telescope ["+telename+"] unknwon in telescope dictionary, using default key names"); 
			teledic=telescope_dictionary['default'];
		    }
		    
		    telekeys={ telescop : telename.replace(/[']/g, "")};
		    
		    for (var key in teledic){
			telekeys[key]=fits_headers[0].keywords[teledic[key]];
			
			//console.log("A key ["+key+"]=["+telekeys[key]+"]");
			
			if(typeof telekeys[key]=="undefined") 
			    throw "Mandatory keyword ["+teledic[key]+"] not found in ["+telename+"] FITS file !"; 
			
			telekeys[key] = telekeys[key].value.replace(/[']/g, "");
			
			//console.log("B key ["+key+"]=["+telekeys[key]+"]");
			
			var kpp=keyword_postprocess[key];
			if(typeof kpp!="undefined") 
			    telekeys[key]=kpp(telekeys[key]);
			
			//console.log("C key ["+key+"]=["+telekeys[key]+"] escape = [" + sql_cnx.escape(telekeys[key]) + "]");
			
		    }
		    
		    
		    var qss=""; var count=0,n=0;
		    for (var k in telekeys) if (telekeys.hasOwnProperty(k)) count++;
		    
		    for (var key in telekeys){
			qss+=" "+ key + "= "+ sql_cnx.escape(telekeys[key]);
			if(n!=count-1) qss+=", ";
			
			n++;
		    }
		    //console.log("update query is ["+qss+"]");
		    
		    sql_cnx.query("update gloria_imgs SET "+qss+"  WHERE autoID = " + sql_cnx.escape(image_id)+";", function(err, result) {
			if(err){
			    result_cb("Error inserting entry in DB : " + err); 
			    sql_cnx.query("update gloria_imgs set status='error' where autoID="+image_id+";", function(err, result) {
				if(err){
				    console.log("BUG: Error setting error status : " + err); 
				    return;
				}
			    });
			    return;
			}
			result_cb(null);
		    });
		    
		    
		});
		
		
	    }
	    catch (e){
		result_cb("Error processing FITS file : "+ e);
		sql_cnx.query("update gloria_imgs set status='error' where autoID="+image_id+";", function(err, result) {
		    if(err){
			console.log("BUG: Error setting error status : " + err); 
			return;
		    }
		});
		return;
	    }
	    
	    
	});

    });
}

function authenticate_gloria_user(user, hash_password){
    if(submit_opts.user==user && CryptoJS.SHA1(submit_opts.password)==hash_password )
	return true;
    console.log("Authentication failed ! u=["+user+"] hp=["+hash_passord+"]");
    return false;
}


function record_image_mysql(table_name, image_header, result_cb){
    
    var connection = mysql_connect();

    connection.connect(function(err) {
	
	if(err) return result_cb(err);
	console.log("Ok, inserting ["+  JSON.stringify(image_header) +"]");

	var query = connection.query('INSERT INTO '+table_name+' SET ?', image_header, function(err, result) {
	    if(err) return result_cb(err); else {
		console.log("Mysql query OK : result : " + JSON.stringify(result));
		result_cb(null);
	    }
	});
	console.log(query.sql);
    });
}



function query_mysql(query_string, result_cb){
    
    var connection = mysql_connect();

    connection.connect(function(err) {
	
	if(err) return result_cb(err);
	
	console.log("SQL query ["+ query_string +"]");
	
	var query = connection.query(query_string, function(err, rows, fields) {
	    if(err) return result_cb(err); else {
		//console.log("Mysql query OK : result : " + JSON.stringify(result));
		result_cb(null, rows, fields);
	    }
	});
	
	//console.log(query.sql);
    });
}


function process_fits_file(header, res){

    var file_name = header.file_path + "/" + header.file_name;
    var f = new fits.file(file_name);
    
    var fits_headers = f.get_headers();

    console.log("Fits headers : " + JSON.stringify(fits_headers, null, 5));
    res.write(JSON.stringify(fits_headers, null, 5));
}


post_handlers.gloria = {
    
    submit : {
	
	process : function (query, request, res){


	    console.log("GLORIA SUBMIT Received query : " + JSON.stringify(query));
	    //console.log("OK?");


	    res.writeHead(200, {
		'Access-Control-Allow-Origin' : '*',
		'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
		'Access-Control-Allow-Headers': 'Content-Type',
		//	'content-type': 'text/plain'
		
	    });			    
	    /*
	      res.write( JSON.stringify( { status :  'ok' })) ;

	    res.end();			
	    return;
	*/		    
	    
	    var form = new formidable.IncomingForm({ uploadDir : upload_dir});
	    
	    form.parse(request, function(err, fields, files) {

		try{
		    if(err) throw 'POST parse error ' + err;
		    
		    if(typeof fields.json_header == 'undefined') throw "No json_header field !";

		    var js_head=JSON.parse(fields.json_header);
		    console.log("REceived header " + JSON.stringify(js_head, null, 4));
		    
		    var new_entry = {
			datein : new Date(),
			experiment_type : js_head.experimentid,
			experiment : js_head.experiment,
			reservation_id : js_head.reservationid,
			file_url : js_head.url,
			user : js_head.user,
			status : "processing",
			json_params : "{}"
		    };
		    
		    for(var f in new_entry){
			if (typeof new_entry[f] == 'undefined')
			    throw "No ["+f+"] key found on header!"
		    }
		    
		    console.log("Received healthy GLORIA header: "+ JSON.stringify(new_entry));
		    
		    record_gloria_mysql("gloria_imgs", new_entry, function (e, id){
			if(e!=null){
			    res.writeHead(200, {'content-type': 'text/plain'});
			    var error="" + e;
			    res.write(JSON.stringify({ status: "error", error_message:  error })) ;
			    res.end();			
			    return;
			}
			res.write( JSON.stringify( { status :  'ok', id : id, error_id : 0 })) ;
			res.end();	

			
			

			handle_fits_file_download(id, function(err){
			    if(err){
				console.log("ERROR DOWNLOAD FILE : " + err);
				return;
			    }
			    handle_fits_file_keys(id, function(err){
				if(err){
				    console.log("ERROR UPDATE KEYS : " + err);
				    return;
				}else
				    sql_cnx.query("update gloria_imgs set status='ok' where autoID="+id+";", function(err, result) {
					if(err){
					    console.log("BUG: Error updating status in DB : " + err); 
					    return;
					}
				    });
			    });
			});
			
		    });
		    
		    //Error codes :
		    //0 : no error
		    //1 : server error
		    //2 : bad header
		    
		}
		catch (e){
		    res.writeHead(200, {'content-type': 'text/plain'});
		    var error="" + e;
		    var error_id=1;
		    res.write(JSON.stringify({ status: "error", error_message:  error, error_id : error_id })) ;
		    res.end();			
		    console.log(error);
		}
		
		console.log("End of form parse...");
	    });

	    console.log("Enf of POST process!");
	}

    }
}

get_handlers.gloria = {
    
    submit : {
	process : function (query, request, res){
	    var type= query.type;
	    console.log("GLORIA get request query is " + JSON.stringify(query));
	}
    },    
    
    get : {
	process : function (query, request, res){

	    var type= query.type;
	    

	    console.log("GLORIA get request query is " + JSON.stringify(query));
	    var query_string="select * from gloria_imgs where file_type='"+type+"'";
	    
	    query_mysql(query_string, function(error, rows, fields){
		
		if(error){
		    res.writeHead(200, {'content-type': 'text/plain'});
		    res.write(JSON.stringify({status : "error", error_message : error}));
		    res.end();			
		    return;
		}
		
		var r=rows[0];
		var filename = r.file_path + "/" + r.file_name;
		console.log("Opening fn ["+filename+"]");
		fs.readFile(filename, "binary", function(err, file_data) {
		    
		    if(err){
			res.writeHead(200, {'content-type': 'text/plain'});
			res.write(JSON.stringify({status : "error", error_message : err}));
			res.end();			
			return;
		    }
		    
		    var headers={};

		    headers["Server"] = "Sadira/11";
		    headers["content-type"]= r.file_type;

		    if(r.file_type == "image/fits")
			headers["Content-Disposition"]="attachment; filename=\""+ r.file_orig+"\"";
		    //headers["Content-Transfer-Encoding"]= "binary";

		    res.writeHead(200, headers);
		    res.write(file_data, "binary");
		    res.end();			
		});
	    });
	    
	    
	}
    }
    
};
