// Database to store data
var Datastore = require('nedb');
var db = new Datastore({filename: "data.db", autoload: true});

// HTTP Portion
var http = require('http');
var fs = require('fs'); // Using the filesystem module （node js里带的）
var httpServer = http.createServer(requestHandler);
var url = require('url');
httpServer.listen(8080);

function requestHandler(req, res) {

	var parsedUrl = url.parse(req.url);
	console.log("The Request is: " + parsedUrl.pathname);

	fs.readFile(__dirname + parsedUrl.pathname,
		// Callback function for reading
		function (err, data) {
			// if there is an error
			if (err) {
				res.writeHead(500);
				return res.end('Error loading ' + parsedUrl.pathname);
			}
			// Otherwise, send the data, the contents of the file
			res.writeHead(200);
			res.end(data);
  		}
  	);

  	/*
  	res.writeHead(200);
  	res.end("Life is wonderful");
  	*/
}


// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io').listen(httpServer);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection',
	// We are given a websocket object in our function
	function (socket) {
		socket.join('storyGame');

		console.log("We have a new client in the story game room: " + socket.id);

		// When this user emits, client side: socket.emit('otherevent',some data);
		socket.on('chatmessage', function(data) {
			// Data comes in as whatever was sent, including objects
			console.log("Received: 'chatmessage' " + data);

			// Create the JavaScript Object
			var datatosave = {
				socketid: socket.id,
				type: 'message',
				message: data
			}

			// Insert the data into the database
			db.insert(datatosave, function (err, newDocs) {
				console.log("err: " + err);
				console.log("newDocs: " + newDocs);
			});

			//console.log(socket);
			// Send it to all of the clients
			io.to('storyGame').emit('chatmessage', data);
			//socket.broadcast.emit('chatmessage', data);
		});


		socket.on('prompt', function(data) {
			console.log('Prompt: ' + data);


			// Create the JavaScript Object
			var datatosave = {
				socketid: socket.id,
				type: 'prompt',
				message: data
			}

			db.remove({ type: 'prompt' }, { multi: true }, function (err, numRemoved) {
			console.log("err: " + err);
			console.log("num removed: " + numRemoved);
			});

			// Insert the data into the database
			db.insert(datatosave, function (err, newDocs) {
				console.log("err: " + err);
				console.log("newDocs: " + newDocs);
			});

			io.to('storyGame').emit('prompt', data);
		});

		// When the history is requested, find all of the docs in the database
		socket.on('history', function() {
			//find out and emit chat messages
			db.find({ type: 'message'}, function(err, docs) {
				// Loop through the results, send each one as if it were a new chat message
				for (var i = 0; i < docs.length; i++) {
					io.to('storyGame').emit('chatmessage', docs[i].message);
				}
			});

			//find out and emit prompts
			db.find({ type: 'prompt'}, function(err, docs) {
				// Loop through the results, send each one as if it were a new chat message
				for (var i = 0; i < docs.length; i++) {
					io.to('storyGame').emit('prompt', docs[i].message);
				}
			});

		});


		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);
		});
	}
);
