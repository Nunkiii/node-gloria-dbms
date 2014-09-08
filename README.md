node-gloria-dbms
=====

Image database services for the GLORIA project. 

###HTTP/POST interface 

Image submission to the SQL database is done by the mean of an HTTP POST message. 


####Examples

#####HTML form

	  <form action="https://sadira.iasfbo.inaf.it:8888/gloria/submit" enctype="multipart/form-data" method="post">
	  	<input type="text" name="json_header" value='{
  	  	       "telescop": "BOOTES-3",
  	  	       "instrume": "COLORES",
  	  	       "exptime": 10,
  	  	       "experiment": "Night",
  	  	       "experimentid": "Nearby Galaxies observations",
  	  	       "reservationid": 12345678,
  	  	       "user": "GLORIA_observer",
  	  	       "password": "the_encrypted_password",
  	  	       "url": "http://..."
	  	 }'>
		<input type="submit" value="Send to DB"/>

	  </form>


#####Python

Example python code.

	import urllib3
	
	url = "http://sadira.iasfbo.inaf.it:9999/gloria/submit"

       	jheaders = '''{                                                                                                                                       "experiment" : "Night",                                                                                                                               "experimentid" : "Nearby Galaxies observations",                                                                                                      "reservationid": 12345678,                                                                                                                            "user" : "GLORIA_observer",                                                                                                                           "password" : "the_encrypted_password",                                                                                                                "url": "http://xyz.com/a.fits"                                                                                                                        }'''

       	http = urllib3.PoolManager()

       	post_data = {}
       	post_data['json_header'] = jheaders

       	request = http.request('POST', url, post_data)

###HTTP/GET interface 

To operate within Gloria, the sadira server, must be able to respond to standard AJAX (GET) requests.  to be embeddedable in non-websocket aware environment and also to conform with the specs. For the Gloria 'get interface', the server must respond to a query url with a *single* buffer of binary data, containing both image metadata (width, height, name, etc...) and binary pixel data.

####gloria/query_images

####gloria/get_image

###FITS image viewing in the browser

The display of FITS images is done using the *sadira* webGL components developped within the *XD-1* project : https://github.com/Nunkiii/XD-1.

It is not possible to use the astrojs fits.js library to read from an arraybuffer from scratch, so we cannot just ajax-download the whole fits file as an ArrayBuffer and read it client side with fits.js. A sadira datagram is used to encapsulate image data and metadata into a single binary block that is transmitted via the GET HTTP server.  

###Installation 

This package depends on the following software packages : 

* **qk/sadira** :  https://github.com/Nunkiii/sadira. 
* **node-fits** :  https://github.com/Nunkiii/node-fits. 

Download both the node-gloria-dbms and the sadira packages (download zip files or use git clone), then enter the `node-gloria-dbms` directory and make a symbolic to the sadira source directory: 

    /some/dir$ git clone https://github.com/Nunkiii/sadira.git
    /some/dir$ git clone https://github.com/Nunkiii/node-gloria-dbms.git
    /some/dir/node-gloria-dbms$ ln -s /some/dir/sadira ./sadira
    /some/dir/node-gloria-dbms$ ln -s /some/dir/sadira/www ./www/sadira

####Starting the sadira server 

Edit the `sadira.conf.json` file to setup database and server parameters, then launch the server from the `node-gloria-dbms` directory:

    /some/dir/node-gloria-dbms$node sadira/sadira.js --cf sadira.conf.json 

