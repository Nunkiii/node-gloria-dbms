var mysql = require('mysql');
var sqlut = require('./mysql_utils');
var fs = require('fs');
var fits = require('../../node-fits/build/Release/fits.node');

exports.create_jpeg=function(image_id, configs, result_cb){
    
    console.log("Analysing downloaded FITS file....");
    
    for(c=0;c<configs.length;c++){
	var cfg=configs[c];

	if(typeof cfg.size === 'undefined') cfg.size=[128,0];
	if(typeof cfg.tag === 'undefined') cfg.tag="small";
	if(typeof cfg.colormap === 'undefined') cfg.colormap=[ [0,0,0,1,0], [1,0,1,1,.8], [1,.2,.2,1,.9], [1,1,1,1,1] ];
	if(typeof cfg.cuts_frac === 'undefined') cfg.cuts_frac=0.97;
    }

    var http = require('http');
    var fs = require('fs');

    sqlut.sql_connect(function(err, sql_cnx) {

	if(err){
	    result_cb("Error connecting to MySQL : " + err); 
	    return;
	}
	
	var qs="select file_path, file_name from gloria_imgs where autoID="+sql_cnx.escape(image_id)+";";

	sql_cnx.query(qs, function(err, result) {
	    if(err){
		result_cb("Error getting URL from DB : " + err); 
		return;
	    }
	    //console.log("res = " + JSON.stringify(result));
	    var fpath=result[0].file_path+"/"+result[0].file_name;
	    result_cb(null, "Image is="+JSON.stringify(fpath));
	    
	    try{
		var f = new fits.file(fpath);
		
		f.read_image_hdu(function(error, image){
		    
		    if(error){
			result_cb("Bad things happened while reading image hdu : " + error);
			return;
		    }
    
		    if(image){
			//var headers=f.get_headers(); console.log("FITS headers : \n" + JSON.stringify(headers, null, 4));
			
			var dims=[image.width(), image.height()];
			
			//	image.histogram({ nbins: 350, cuts : [23,65] }, function(error, histo){
			image.histogram({}, function(error, histo){ //By default cuts are set to min,max and nbins to 200
			    
			    if(error)
				console.log("Histo error : " + error);
			    else{
				
				console.log("HISTO : " + JSON.stringify(histo));
				
				for(c=0;c<configs.length;c++){
				    var cfg=configs[c];
				    
				    
				    var colormap=cfg.colormap;
				    var max=0,maxid=0, total=0, frac=cfg.cuts_frac, cf=0;
				    
				    for(var i=0;i<histo.data.length;i++){
					var v=histo.data[i];
					if(v>max){max=v;maxid=i;}
					total+=v;
				    }
				    
				    for(var i=0;i<histo.data.length;i++){
					cf+=histo.data[i];
					if(cf*1.0/total>=frac) break;
				    }
				    
				    if(maxid-2>=0) maxid-=2;
				    var cuts=[histo.start+maxid*histo.step,histo.start+i*histo.step];
				    
				    image.set_colormap(colormap);
				    image.set_cuts(cuts);
				    
				    var out = fs.createWriteStream(fpath+"."+cfg.tag+".jpeg");
				    
				    var tile_size=[];
				    if(cfg.size[0] == 0){
					
					if(cfg.size[1] == 0){ //Using original image dimensions
					    tile_size=dims;
					}else{ //
					    tile_size=[ Math.floor( dims[0]*1.0/dims[1]*cfg.size[1] )  , cfg.size[1]];
					    
					}
					
				    }else
					tile_size=[  cfg.size[0], Math.floor( dims[1]*1.0/dims[0]*cfg.size[0] )];
				    
				    out.write(image.tile( { tile_coord :  [0,0], zoom :  0, tile_size : tile_size, type : "jpeg" }));
				    out.end();
				}
				
			    }
			});
			
			
			console.log("End of fits callback!");
		    }
		});
	    }
	    catch (e){
		console.log("Error : " + e);
		result_cb(e);
	    }
	});
    });
}

