node-gloria-dbms
=====

Image database services for the GLORIA project. 

###Installation 

This package depends on the sadira package https://github.com/Nunkiii/sadira. 

Download both the node-ncip and the sadira packages (download zip files or use git clone), then enter the `node-ncip` directory and make symbolic links to access the sadira javascript resources. 

    /some/dir$ git clone https://github.com/Nunkiii/sadira.git
    /some/dir$ git clone https://github.com/Nunkiii/node-gloria-dbms.git
    /some/dir/node-gloria-dbms$ ln -s /some/dir/sadira ./sadira
    /some/dir/node-gloria-dbms$ ln -s /some/dir/sadira/www ./www/sadira

####Starting the sadira server 

Edit the `sadira.conf.json` file to setup database and server parameters, then launch the server from the `node-gloria-dbms` directory:

    /some/dir/node-gloria-dbms$node sadira/sadira.js --cf sadira.conf.json 

