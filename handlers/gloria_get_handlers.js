var fits = require('../../node-fits/build/Release/fits.node');
var mysql = require('mysql');
var path = require('path');
var sqlut = require('./mysql_utils');
var gloria_uts = require('./gloria_utils');
var fs=require('fs');
var DGM = require('../../sadira/www/js/datagram');

var max_page_size = 10;


exports.init=function(pkg){
    console.log("gloria dbms GET handlers init pkg ! " + JSON.stringify(pkg.opts.sql_server_opts));
    sqlut.sql_server_opts=pkg.opts.sql_server_opts;
}

function reply_gloria_error(res, msg, code){
    if(typeof code=='undefined') code=400;
    var headers=cors_headers;
    headers.content_type='application/json';
    res.writeHead(code, headers);
    
    res.write(JSON.stringify({n : -1, error : msg}));
    res.end();
}

function reply_gloria(res,n, data){
    var headers=cors_headers;
    headers.content_type='application/json';
    res.writeHead(200, headers);

    res.write(JSON.stringify({n : n, data : data}));
    res.end();
}

get_handlers.gloria = {
    
    query_images : {

	process : function (query, request, res){

	    //return reply_gloria_error(res, "Fausse erreurrre hein!");
	    var req=query.req;
	    if(typeof req=='undefined')
		req="{}";
	    
	    try{
		console.log("processing request " + req);
		
		req = JSON.parse(req);
		
		sqlut.sql_connect(function(err, sql_cnx) {
		    if(err){
			return reply_gloria_error(res,"Error connecting to MySQL : " + err); 
		    }
		    
		    function check_range(qs){
			var qqs=qs;
			if(typeof req.from != 'undefined'){
			    if(typeof req.to != 'undefined'){
				var rng=req.to-req.from+1;
				if(! isNaN(rng) && rng<= max_page_size )
				    qqs+="limit " + req.from + "," + rng;
				else{
				    reply_gloria_error(res, "Invalid range " + rng); 
				    return false;
				}
				return qqs;
			    } else {
				if(! isNaN(req.from) )
				    qqs+="limit " + req.from + "," + max_page_size;
				else{
				    reply_gloria_error(res, "Invalid range " + rng); 
				    return false;
				}
				return qqs;
			    }
			}
			
			qqs+="limit "+ max_page_size;
			return qqs;
		    }
		    
		    var qs='select count(*) as n from gloria_imgs';
		    //console.log("Ok, inserting ["+  JSON.stringify(image_header) +"]");
		    var query = sql_cnx.query('select count(*) as n from gloria_imgs', function(err, result) {
			
			if(err)return reply_gloria_error(res, "DB query error : " + err); 
			var n=result[0].n;
			
			console.log("Mysql query OK : result : " + JSON.stringify(result));
			// if(n>max_page_size){
			//     return reply_gloria(res,n,[]);
			// }
			var what="autoID, user, datein, experiment_type, experiment, reservation_id, telescop, instrument, observer, date_obs, exptime, filter, target_ra, target_dec, target_name,json_params";

			var qs="select " + what +" from gloria_imgs where status='ok'";			
			qs=check_range(qs);
			if(!qs) return;
			
			console.log("query " + qs );
			
			var query = sql_cnx.query(qs, function(err, result) {
			    if(err)return reply_gloria_error(res, "DB query error : " + err); 
			    return reply_gloria(res,n,result);
			});
			
			console.log("SQL : " + query.sql);
		    });
		    
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
	    function not_found(msg){
		if(!msg)msg="404 Not Found";
		var headers=cors_headers;
		headers.content_type='text/plain';
		res.writeHead(404, headers);

		res.write(msg+'\n');
		res.end();
	    }
	    function server_error(msg){
		if(!msg)msg="Internal Server Error";
		var headers=cors_headers;
		headers.content_type='text/plain';
		res.writeHead(500, headers);
		res.write(msg+'\n');
		res.end();
	    }
	    
	    var req=query.req;
	    if(typeof req=='undefined')
		return not_found("No request json block found");
	    
    
	    try{
		console.log("Get image : processing request " + req);
		
		req = JSON.parse(req);
		//req = {id:2};
		if(typeof req.id=="undefined") {
		    return not_found("No image id given");
		}
		var image_type=typeof req.type=='undefined'? "jsmat":req.type;

		sqlut.sql_connect(function(err, sql_cnx) {

		    if(err)
			return server_error("Error connecting to MySQL : " + err);
		    
		    var qs="select file_path, file_name from gloria_imgs where autoID="+sql_cnx.escape(req.id)+";";
		    
		    sql_cnx.query(qs, function(err, result) {
			
			if(err){
			    return server_error("Error getting URL from DB : " + err); 
			}

			switch(image_type){
			default :  return not_found("Invalid image " + image_type); break;
			case "jsmat" : 
			    //console.log("res = " + JSON.stringify(result));
			    var fpath=result[0].file_path+result[0].file_name;
			    //result_cb(null, "Image is="+JSON.stringify(fpath));
			    var filename = fpath; //path.join(process.cwd(), uri);
			    console.log("--> Sending file " + filename );
			    path.exists(filename, function(exists) {
				if(!exists) 
				    return not_found("File was not found where it should have been");
				var mime_type = "image/qkmat";
				
				var headers=cors_headers;
				headers.content_type=mime_type;
				res.writeHead(200, headers);
				
	//			if(req.decode){
				    var f=new fits.file(filename);
				    
				    f.read_image_hdu(function(error, image_data){
					if(error==null){
					    
					    var ab=image_data.get_data();
					    console.log("image bytes " + ab.length);
					    var header = {
						width : image_data.width(),
						height : image_data.height(),
						sz : ab.length,
						name : filename
					    };
					    var dgm= new DGM.datagram(header, ab);
					    dgm.serialize();
					    console.log("Writing bytes " + dgm.buffer.length);
					    res.write(dgm.buffer);
					    res.end();
					}
					else
					    return server_error(error);
				    });
				    
				// }else{
				    
				//     var fileStream = fs.createReadStream(filename);
				//     fileStream.pipe(res);
				//     console.log("Data sent !");
				// }
			    }); //end path.exists
			    break;
			case "fits":
			    var fpath=result[0].file_path+result[0].file_name;
			    //result_cb(null, "Image is="+JSON.stringify(fpath));
			    var filename = fpath; //path.join(process.cwd(), uri);
			    console.log("--> Sending file " + filename );
			    path.exists(filename, function(exists) {
				if(!exists) 
				    return not_found("File was not found where it should have been");
				var mime_type = "image/fits";
				
				var headers=cors_headers;
				headers.content_type=mime_type;
				res.writeHead(200, headers);
				var fileStream = fs.createReadStream(filename);
				fileStream.pipe(res);
			    });
			    break;
			case "jpeg":

			    var jpeg_type= typeof(req.jpeg_type) =='undefined'? "small":req.jpeg_type;

			    var fpath=result[0].file_path+result[0].file_name+"."+jpeg_type+".jpeg";
			    //result_cb(null, "Image is="+JSON.stringify(fpath));
			    var filename = fpath; //path.join(process.cwd(), uri);
			    console.log("--> Sending file " + filename );

			    
			    function send_image(){
				var mime_type = "image/jpeg";
				var headers=cors_headers;
				headers.content_type=mime_type;
				res.writeHead(200, headers);
				var fileStream = fs.createReadStream(filename);
				fileStream.pipe(res);
			    }

			    path.exists(filename, function(exists) {
				if(true){//!exists){

				    //Trying to create jpeg if the file doesn't exist.
				    
				    gloria_uts.create_jpeg(req.id, [{}],  function(error, r){
					if(error!=null){
					    return not_found("Error creating jpeg snapshot : " + error);
					}else{
					    path.exists(filename, function(exists) {
						if(!exists){
						    return not_found("JPEG file still not found after generation (bug?)");
						}else{
						    send_image();
						}
						
					    });
					}
				    });
				}else send_image();
				
			    });

			    break;
			}
		    });
		});
		
	    }
	    catch (e){
		return not_found("Error " + dump_error(e));
		console.log("Error request : " + dump_error(e));
	    }
	    
	    
	}
    }
};
