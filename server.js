const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const server = require("http").Server(app);
const io = require("socket.io")(server, {'pingInterval': 1000, 'pingTimeout': 2000});
const { v4: uuidV4 } = require('uuid')

//Peer Server
var PeerServer = require('peer').ExpressPeerServer;
app.use('/peerjs', PeerServer(server));

//APP
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}))

//home
app.get('/', (req, res) => {
    res.render('index', { 
        id: ""
    });
})

//coming with link
app.get('/room/:id', (req, res) => {
    res.render('index', { 
        id: req.params.id
    });
})

//create room or join
app.post('/room', (req, res) => {
    if(req.body.roomId) res.redirect(`/room/${req.body.roomId}/${req.body.userName}`);
    else res.redirect(`/room/${uuidV4()}/${req.body.userName}`);
})

//connect to room
app.get('/room/:id/:name', (req, res) => {
    res.render('room', { 
        id: req.params.id,
        name: req.params.name
    });
})

server.listen(port);

let users = [];
let chats = {};

class Chat {
    constructor(id) {
        this.id = id;
        this.log = [["Welcome to the chat!"]];
        this.limit = 20;
    }
    check(id){
        if(this.id == id) return this;
        else return null;
    }
}

class User {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}

//Socket
io.on('connection', socket => {
    //New user
    socket.on('join', (roomID, userID, userName) => {
        users.push(new User(userID, userName));

        let chat = null;
        if(chats[roomID]) chat = chats[roomID];
        else {
            chat = new Chat(roomID);
            chats[roomID] = chat;
        }
        
        socket.join(roomID);
        io.in(roomID).emit('all-users', users);
        io.in(roomID).emit('chat-update', chat.log);

        socket.to(roomID).broadcast.emit('user-joined', userID);
        console.log(userID+" joined room: "+roomID);
        
        //Disconnect
        socket.on('disconnect', () => {
            users = users.filter(user => user.id != userID);

            io.in(roomID).emit('user-left', userID);
            io.in(roomID).emit('all-users', users);

            console.log(userID+" left room: "+roomID);
            //if(users.length == 0) roomChats.splice(roomChats.indexOf(roomID), 1);
        })

        //New message
        socket.on('new-message', (msg) => {
            chat.log.push(msg);
            if(chat.log.length > chat.limit) chat.log.splice(0, 1);
            io.in(roomID).emit('chat-update', chat.log);
            chats[roomID] = chat;
        })
    })

})