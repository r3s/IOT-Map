var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('weather.db');

exports.init = function(){
	db.serialize(function() {
	db.run("CREATE TABLE if not exists weather (lat STRING, long STRING, temp STRING)");
	});
}

exports.db = db;