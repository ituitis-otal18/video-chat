const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require('uuid')

const { PeerServer } = require('peer');
const peerServer = PeerServer({ port: 443, path: '/peer' });

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
let chat = {
    id: "",
    log: []
};

//Socket
io.on('connection', socket => {

    socket.on('join', (roomID, userID) => {
        chat.id = roomID;

        users.push(userID);
        socket.join(roomID);
       
        io.in(roomID).emit('all-users', users);
        io.in(roomID).emit('chat-update', chat.log);

        socket.to(roomID).broadcast.emit('user-joined', userID);
        console.log(userID+" joined room: "+roomID);
        
        socket.on('disconnect', () => {
            users.splice(users.indexOf(userID), 1);
            socket.to(roomID).broadcast.emit('user-disconnected', userID)
            console.log(userID+" left room: "+roomID);
            
            if(users.length == 0)chat.id = "";
        })

        socket.on('new-message', (id, msg) => {
            if(id == chat.id) chat.log.push(msg);
            io.in(roomID).emit('chat-update', chat.log);
        })
    })

})