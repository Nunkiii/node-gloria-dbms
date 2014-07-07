node-gloria-dbms
=====

Image database services for the GLORIA project. 

###Installation 

This package depends on the sadira package https://github.com/Nunkiii/sadira. 

Download both the node-gloria-dbms and the sadira packages (download zip files or use git clone), then enter the `node-gloria-dbms` directory and make a symbolic to the sadira source directory: 

    /some/dir$ git clone https://github.com/Nunkiii/sadira.git
    /some/dir$ git clone https://github.com/Nunkiii/node-gloria-dbms.git
    /some/dir/node-gloria-dbms$ ln -s /some/dir/sadira ./sadira
    /some/dir/node-gloria-dbms$ ln -s /some/dir/sadira/www ./www/sadira

####Starting the sadira server 

Edit the `sadira.conf.json` file to setup database and server parameters, then launch the server from the `node-gloria-dbms` directory:

    /some/dir/node-gloria-dbms$node sadira/sadira.js --cf sadira.conf.json 

