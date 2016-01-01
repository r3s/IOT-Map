var express = require('express');
var bodyParser = require('body-parser');
var sqdb = require('./db.js');

sqdb.init();
var db = sqdb.db;

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Show the map on GET
app.get('/', function (req, res) {
	res.sendFile( __dirname + "/static/" + "index.html" );
})

// Handle data on POST
app.post('/', function(req,res){
	res.send('OK');
	handleWeather(req.body);
});

// Create server
var server = app.listen(8080, function(){
	console.log('Listening on 8080');
});

// Socket.io for data broadcasting
var io = require('socket.io')(server);
io.on('connection', function(){
	initUser();
});

// Initialise user with already existing values in DB
function initUser(){

	db.all('SELECT * FROM weather WHERE 1',
		function (err, rows) {
			if(rows.length > 0)
				io.emit('data-multiple',rows);
		}
	);
}

// Process data and broadcast
function handleWeather(data){
	if(parseFloat(data.lat) && parseFloat(data.long) && parseFloat(data.temp)){
		saveData(data);
		io.sockets.emit('data',data);	
	}
}


// Check received data and save it to database
function saveData(data) {
	// Check if the entry for the lat/long already exists
	db.serialize(function(){
		var count = 0;
		db.all('SELECT * FROM weather WHERE lat = ? AND long = ?',
			[data.lat, data.long],
			function (err, rows) {
				if(rows.length > 0)
					count = rows.length;
				store(count);
			}
		);
	});
	
	// Store data to DB
	function store(count){
		db.serialize(function(){
			if(count<1){
				// No entry in DB. Insert new row
				var stmt = db.prepare("INSERT INTO weather VALUES (?,?,?)");
				stmt.run(data.lat, data.long, data.temp);
				stmt.finalize();
			}else{
				// Update the existing entry with new temperature
				stmt = db.prepare("UPDATE weather SET temp = ? WHERE lat = ? AND long = ?"); 
				stmt.run(data.temp, data.lat, data.long);
				stmt.finalize();
			}
		});
	}
}



// Close database on exit

function exitHandler(options, err) {
    if (err) console.log(err.stack);
    if (options.exit){
		db.close();
		process.exit();
	}
}
process.on('exit', exitHandler.bind(null,{exit:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));