var mysql = require('mysql');
var sqlut = require('./mysql_utils');
var fs = require('fs');
var fits = require('../../node-fits/build/Release/fits.node');
var http = require('http');

console.log("cwd is " + process.cwd());
//var radixsort=eval(fs.readFileSync(process.cwd()+'/www/js/community/radixsort.min.js'));
var radixsort=require('../sadira/www/js/community/radixsort.min.js').radixsort;

function autocoutes(arr, cfgi){
    var cfg={low: 0.2, high: 0.99, ns: 2000};
    if(è(cfgi)) for(var cfi in cfgi) cfg[cfi]=cfgi[cfi];

    var ab=new ArrayBuffer(4*cfg.ns);
    var fa=new Float32Array(ab);

    var ll=arr.length/4;

    for (var i=0;i<fa.length;i++){
	var pix=Math.floor(Math.random()*ll);
	fa[i]=arr.readFloatLE(pix*4);
	//console.log("fa " + i + " pix : "+ pix +"  fa[i]= " + fa[i] + " -> " + arr[pix]);
    }
    var sort=radixsort();
    var sfa = sort(fa);

    return [sfa[Math.floor(cfg.low*cfg.ns)], sfa[Math.floor(cfg.high*cfg.ns)]];
    // for (var i=0;i<sfa.length/20;i++)
    // 	console.log( i + " sfa: " + sfa[i]);    
    //console.log("Number of items : " + fa.length, " NB = " + ab.byteLength + " npix="+ll + " cuts + " + JSON.stringify(newcuts));
}

exports.get_image=function(image_id, result_cb){

//    var qs="select file_path, file_name from gloria_imgs where autoID="+sql_cnx.escape(image_id)+";";
    var qs="select file_path, file_name from gloria_imgs where autoID="+image_id+";";
    
    gloriadb.query(qs, function(err, result) {
	if(err)  return result_cb("Error getting URL from DB : " + err); 

	//console.log("res = " + JSON.stringify(result));
	var fpath=result[0].file_path+"/"+result[0].file_name;
	//result_cb(null, "Image is="+JSON.stringify(fpath));
	
	try{
	    var f = new fits.file(fpath);
	    
	    f.read_image_hdu(function(error, image){
		
		if(error){
		    result_cb("Bad things happened while reading image hdu : " + error);
		    return;
		}
		
		if(image){
		    result_cb(null, image);
		}
		
	    });
	    //console.log("End of fits callback!");
	}
	
	catch (e){
	    console.log("Error : " + e);
	    result_cb(e);
	}
    });
}

exports.get_image_data=function(image_id, result_cb){

    exports.get_image(image_id, function(error, image){
	if(error!=null)return result_cb(error);
	try{
	    var idata=image.get_data();
	    result_cb(null, idata, image);
	}
	catch(e){
	    result_cb(e);
	}
    });
}

exports.create_jpeg_data=function(image_id, cfgi, result_cb){

    var cfg={ size: [0,0], colormap: [ [0,0,0,1,0], [1,1,1,1,1] ], zoom : 0, tile_coord : [0,0], type : "jpeg"};
    for(var c in cfgi) cfg[c]=cfgi[c];

    
    exports.get_image_data(image_id, function(error, image_data, image){
	
	if(è(error)) return result_cb(error);

	try{
	    var dims=[image.width(),image.height()];
	    var image_cuts=autocoutes(image_data, cfg);
	    var colormap=cfg.colormap;

	    console.log("Image " + JSON.stringify(dims) + " Npix = " + (dims[0]*dims[1])
			+ " type " + typeof(image_data)
			+ " L=" + image_data.length
			+ " BBL = " + image_data.length
			+ " bpp = " + (image_data.length/(dims[0]*dims[1]))
			+ " cuts " + JSON.stringify(image_cuts)
		       );

	    //image_cuts=[400,600];
	    image.set_colormap(colormap);
	    image.set_cuts(image_cuts);
	    
	    for(var t in [0,1])
		if(cfg.size[t]<=0) cfg.size[t]= dims[t];
	    
	    //console.log("Creating tile : " + JSON.stringify(cfg));

	    for (var pr in image) { console.log("IMP " + pr); }
	    
	    var image_jpeg_data=image.tile( { tile_coord :  cfg.tile_coord, zoom :  cfg.zoom, tile_size : cfg.size, type : cfg.type });
	    result_cb(null, image_jpeg_data);
	}
	catch (e){
	    console.log("Error : " + e);
	    result_cb(e);
	}

    });
    
}

exports.create_jpeg_file=function(image_id, configs, result_cb){
    
    var cfg={ tag : "small"};
    for(c=0;c<configs.length;c++){
	for(var cf in configs[c]) cfg[cf]=configs[c][cf];
	
	create_jpeg_data(image_id, cfg, function(error, jpeg_data){

	    if(error) return result_cb(error);

	    var out = fs.createWriteStream(fpath+"."+cfg.tag+".jpeg");
	    out.write(jpeg_data);
	    out.end();
	    if(c==configs.length-1) 
		result_cb(null,"ok");
	});
    }
    
}


exports.create_jpeg=function(image_id, configs, result_cb){
    
    console.log("Creating JPEG file....");
    
    for(c=0;c<configs.length;c++){
	var cfg=configs[c];

	if(typeof cfg.size === 'undefined') cfg.size=[0,0];
	if(typeof cfg.tag === 'undefined') cfg.tag="small";
	if(typeof cfg.colormap === 'undefined') cfg.colormap=[ [0,0,0,1,0], [1,1,1,1,1] ];
	if(typeof cfg.cuts_frac === 'undefined') cfg.cuts_frac=0.99;
    }

    var http = require('http');
    var fs = require('fs');

    gloriadb.sql_connect(function(err, sql_cnx) {

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
		    
		    /*
		    for(var p in image){
			console.log("Got image properties ..... P="+p);
		    }

		    var iiii=new fits.mat_ushort();
		    
		    for(var p in iiii){
			console.log("IIIIII properties ..... P="+p);
		    }
		    */

		    if(error){
			result_cb("Bad things happened while reading image hdu : " + error);
			return;
		    }
    
		    if(image){
			//var headers=f.get_headers(); console.log("FITS headers : \n" + JSON.stringify(headers, null, 4));
			
			var dims=[image.width(), image.height()];
			console.log("Read image : " + dims[0] + ", " + dims[1]);
			//image.get_data();
			//image.tile( { tile_coord :  [0,0], zoom :  0, tile_size : 200, type : "jpeg" });

			//	image.histogram({ nbins: 350, cuts : [23,65] }, function(error, histo){
			image.histogram({nbins : 1024}, function(error, histo){ //By default cuts are set to min,max and nbins to 200
			    
			    if(error)
				console.log("Histo error : " + error);
			    else{
				
				//console.log("HISTO : " + JSON.stringify(histo));
				
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

				    console.log("Cuts " + JSON.stringify(cuts));
				    var idata=image.get_data();
				    var image_cuts=autocoutes(idata, cfg);
				    console.log("AutoCuts " + JSON.stringify(image_cuts));
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
				    if(c==configs.length-1) result_cb(null,"ok");
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

