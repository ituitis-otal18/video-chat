const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const server = require("http").Server(app);
const io = require("socket.io")(server, {'pingInterval': 1000, 'pingTimeout': 2000});
const { v4: uuidV4 } = require('uuid')

let userNames = [];
let userIDs = [];
let roomChats = [];

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
    userNames.push(req.params.name);
    res.render('room', { 
        id: req.params.id,
        name: req.params.name
    });
})

server.listen(port);


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

//Socket
io.on('connection', socket => {
    //New user
    socket.on('join', (roomID, userID) => {
        let chat = null;
        roomChats.forEach(c => {chat = c.check(roomID)});
        if(!chat){
            chat = new Chat(roomID); 
            roomChats.push(chat);
        } 
        userIDs.push(userID);
        socket.join(roomID);
       
        io.in(roomID).emit('all-users', userNames);
        io.in(roomID).emit('chat-update', chat.log);

        socket.to(roomID).broadcast.emit('user-joined', userID);
        console.log(userID+" joined room: "+roomID);
        
        //Disconnect
        socket.on('disconnect', () => {
            userNames.splice(userIDs.indexOf(userID), 1);
            userIDs.splice(userIDs.indexOf(userID), 1);

            io.in(roomID).emit('user-left', userID);
            io.in(roomID).emit('all-users', userNames);

            console.log(userID+" left room: "+roomID);
            //if(users.length == 0) roomChats.splice(roomChats.indexOf(roomID), 1);
        })

        //New message
        socket.on('new-message', (msg) => {
            chat.log.push(msg);
            if(chat.log.length > chat.limit) chat.log.splice(0, 1);
            io.in(roomID).emit('chat-update', chat.log);
        })
    })

})